import OpenAI from 'openai';
import fs from 'fs';
import { extractThemesAndKeywords, stratifiedSample } from './commentProcessor.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

/**
 * Detect image MIME type from base64 data
 */
function detectImageMimeType(base64Data) {
  // Check magic bytes at start of base64
  if (base64Data.startsWith('/9j/')) return 'image/jpeg';
  if (base64Data.startsWith('iVBORw0KGgo')) return 'image/png';
  if (base64Data.startsWith('R0lGOD')) return 'image/gif';
  if (base64Data.startsWith('UklGR')) return 'image/webp';
  // Default to JPEG for FFmpeg extracted frames
  return 'image/jpeg';
}

const THEME_ANALYSIS_THRESHOLD = 3000;

/**
 * Transcribe audio file using OpenAI Whisper API
 */
export async function transcribeAudio(audioFilePath) {
  console.log(`[AI] Transcribing audio: ${audioFilePath}`);
  const audioStream = fs.createReadStream(audioFilePath);

  const transcription = await openai.audio.transcriptions.create({
    file: audioStream,
    model: 'whisper-1',
    response_format: 'text',
  });

  console.log(`[AI] Transcription complete: ${transcription.length} characters`);
  return transcription;
}

/**
 * Analyze comments and generate insights
 * Optionally includes video transcript and frames for unified analysis
 */
export async function analyzeComments(comments, platform, marketingContext = null, videoTranscript = null, videoFrames = null) {
  if (!comments || comments.length === 0) {
    return {
      summary: 'No comments available for analysis.',
      keywords: [],
      themes: [],
    };
  }

  // Filter out generic/off-topic for analysis
  const analysisComments = comments.filter(c => !c.is_generic_praise && !c.is_off_topic);

  if (analysisComments.length === 0) {
    return {
      summary: 'All comments were filtered as generic or off-topic. No substantial feedback to analyze.',
      keywords: [],
      themes: [],
    };
  }

  // Sample if needed
  const needsSampling = analysisComments.length > THEME_ANALYSIS_THRESHOLD;
  const { sampled, size } = needsSampling
    ? stratifiedSample(analysisComments)
    : { sampled: analysisComments, size: analysisComments.length };

  const coveragePct = (size / analysisComments.length) * 100;

  // Extract keywords and themes
  const { keywords, themes } = extractThemesAndKeywords(
    sampled.map(c => c.clean_text)
  );

  // Categorize comments
  const questions = sampled
    .filter(c => c.clean_text?.includes('?'))
    .slice(0, 20)
    .map(c => c.clean_text);

  const negativePattern = /\b(but|however|disappointed|issue|problem|wrong|bad|terrible|worst|hate|confused|why|unclear)\b/i;
  const complaints = sampled
    .filter(c => negativePattern.test(c.clean_text || ''))
    .slice(0, 20)
    .map(c => c.clean_text);

  const conversionPattern = /\b(buy|purchase|order|link|price|cost|where to get|how much)\b/i;
  const buyingSignals = sampled
    .filter(c => conversionPattern.test(c.clean_text || ''))
    .slice(0, 20)
    .map(c => c.clean_text);

  // Build prompt
  const promptParts = [
    `You are analyzing ${platform} comments to identify what the creator should change or improve next.`,
    `\n**Dataset:** ${comments.length} total comments, ${analysisComments.length} after filtering, ${size} analyzed (${coveragePct.toFixed(0)}% coverage).`,
    `\n**Top Keywords:** ${keywords.slice(0, 10).map(k => k.word).join(', ')}`,
    `\n**Recurring Themes:** ${themes.slice(0, 8).map(t => t.theme).join(', ')}`,
  ];

  if (questions.length > 0) {
    promptParts.push(`\n**Questions/Confusion (${questions.length} samples):**\n${questions.slice(0, 10).map(q => `- ${q}`).join('\n')}`);
  }

  if (complaints.length > 0) {
    promptParts.push(`\n**Complaints/Objections (${complaints.length} samples):**\n${complaints.slice(0, 10).map(c => `- ${c}`).join('\n')}`);
  }

  if (buyingSignals.length > 0) {
    promptParts.push(`\n**Purchase Intent (${buyingSignals.length} samples):**\n${buyingSignals.slice(0, 10).map(b => `- ${b}`).join('\n')}`);
  }

  // Add sample comments
  const sampleComments = shuffleArray(sampled).slice(0, 30).map(c => c.clean_text);
  promptParts.push(`\n**Representative Comments (30 samples):**\n${sampleComments.map((c, i) => `${i + 1}. ${c}`).join('\n')}`);

  let prompt = promptParts.join('\n');

  // Add sentiment summary if available
  if (sampled[0]?.sentiment) {
    const sentimentCounts = { positive: 0, negative: 0, neutral: 0 };
    sampled.forEach(c => {
      if (c.sentiment?.label) sentimentCounts[c.sentiment.label]++;
    });
    prompt += `\n\n**Sentiment Breakdown (rule-based):** ${sentimentCounts.positive} positive, ${sentimentCounts.negative} negative, ${sentimentCounts.neutral} neutral`;
  }

  // Add video transcript if available
  if (videoTranscript) {
    const truncatedTranscript = videoTranscript.substring(0, 5000);
    prompt += `

---
## Video Transcript
The following is the audio transcript from the creator's video. Use this to understand the original content and compare with audience reactions in the comments:

"${truncatedTranscript}"

When analyzing, consider:
- How well the video's message landed with the audience
- Gaps between what the creator said and what commenters discussed
- Whether the transcript reveals talking points that generated specific reactions`;
  }

  prompt += `

**Your Task:**
Provide a strategic analysis focused on actionable changes. Structure your response with:

## Key Findings
- What viewers like and why (be specific, not generic)
- Main confusion points or friction
- Dominant objections or concerns
- Purchase/conversion readiness

## Impact-Ranked Recommendations
Rank the top 3-5 changes by potential impact (not just frequency). For each:
1. What to change (specific and testable)
2. Why it matters (evidence from comments)
3. Expected outcome

## Content/Campaign Adjustments
- Hook/thumbnail insights
- Messaging improvements
- Call-to-action suggestions

**Rules:**
- Base insights ONLY on comment evidence
- No speculation about psychology or causality
- State confidence level (high/medium/low) for each insight
- Prioritize actionable changes over observations`;

  if (marketingContext) {
    prompt += `

---
## Marketing Analysis Extension
Product Description: "${marketingContext.description}"

Based on the comments AND the product image provided:
1. Current perception vs intended positioning
2. Visual/messaging resonance gaps
3. Specific ${platform} content strategy improvements
4. Testable creative adjustments

**Important:** Image insights are hypotheses only. Comment evidence takes precedence.`;
  }

  // Build messages array — use multimodal content if we have images
  const hasImages = !!(videoFrames?.length > 0) || !!(marketingContext?.image_base64);
  const messages = [];
  const userContent = [{ type: 'text', text: prompt }];

  if (marketingContext?.image_base64) {
    const mimeType = detectImageMimeType(marketingContext.image_base64);
    console.log(`[AI] Product image MIME type detected: ${mimeType}`);
    userContent.push({
      type: 'image_url',
      image_url: {
        url: `data:${mimeType};base64,${marketingContext.image_base64}`,
        detail: 'auto',
      },
    });
  }

  if (videoFrames && videoFrames.length > 0) {
    // Filter out any empty or invalid frames
    const validFrames = videoFrames.filter(frame => frame && frame.length > 100);
    const selectedFrames = validFrames.slice(0, 10); // Reduce to 10 frames to avoid token limits

    if (selectedFrames.length > 0) {
      console.log(`[AI] Adding ${selectedFrames.length} video frames to analysis`);
      userContent.push({
        type: 'text',
        text: `\n\n[The following ${selectedFrames.length} images are frames extracted from the creator's video. Use them to understand the visual content and production quality:]`,
      });
      for (const frame of selectedFrames) {
        const mimeType = detectImageMimeType(frame);
        userContent.push({
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${frame}`,
            detail: 'low', // Use low detail for frames to reduce tokens
          },
        });
      }
    }
  }

  if (hasImages) {
    messages.push({ role: 'user', content: userContent });
  } else {
    messages.push({ role: 'user', content: prompt });
  }

  // Choose model — gpt-4o for vision, gpt-4o-mini for text-only
  const model = hasImages ? 'gpt-4o' : 'gpt-4o-mini';
  const maxTokens = hasImages ? 3000 : 2000;

  console.log(`[AI] Sending request to OpenAI (model: ${model}). Prompt length: ${prompt.length} chars`);
  try {
    const response = await openai.chat.completions.create({
      model,
      messages,
      temperature: 0.3,
      max_tokens: maxTokens,
    }, {
      timeout: 300000,
    });

    console.log('[AI] Received response from OpenAI');
    const summary = response.choices[0].message.content;

    let footer = `

  ---
  **Analysis Transparency:**
  - Total Comments: ${comments.length.toLocaleString()}
  - Filtered Out: ${(comments.length - analysisComments.length).toLocaleString()} (generic/spam/duplicates)
  - Analyzed: ${size.toLocaleString()} (${coveragePct.toFixed(0)}% coverage)
  - Sampling Used: ${needsSampling ? 'Yes' : 'No'}`;

    if (videoTranscript || videoFrames) {
      footer += `\n  - Video Enrichment: ${videoTranscript ? 'Transcript included' : 'No transcript'}${videoFrames ? `, ${videoFrames.length} frames analyzed` : ''}`;
    }

    return {
      summary: summary + footer,
      keywords,
      themes,
      stats: {
        total: comments.length,
        filtered: analysisComments.length,
        analyzed: size,
        coverage: coveragePct,
        sampled: needsSampling,
      },
    };

  } catch (aiError) {
    console.error('[AI] Analysis failed:', aiError);

    return {
      summary: `**AI Analysis Unavailable:** ${aiError.message}\n\nKeywords and themes were still extracted from ${size} comments.`,
      keywords,
      themes,
      stats: {
        total: comments.length,
        filtered: analysisComments.length,
        analyzed: size,
        coverage: coveragePct,
        sampled: needsSampling,
      },
    };
  }
}

// Helper function
function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default {
  analyzeComments,
  transcribeAudio,
};
