import fs from 'fs';
import { z } from 'zod/v4';
import { zodTextFormat } from 'openai/helpers/zod';
import { extractThemesAndKeywords, stratifiedSample } from './commentProcessor.js';
import { getAIModel, getOpenAIClient, isAIConfigured } from './aiClient.js';

if (!isAIConfigured()) {
  console.warn('OPENAI_API_KEY is not set — LLM features will be unavailable');
}

const scorePart = (max) => z.object({
  score: z.number().int().min(0).max(max),
  max: z.literal(max),
  reason: z.string(),
});

export const CommentAnalysisSchema = z.object({
  summary: z.string().describe('Concise markdown report grounded only in the supplied comments.'),
  videoScore: z.number().int().min(0).max(100).nullable(),
  priorityImprovement: z.string().nullable(),
  scoreBreakdown: z.object({
    engagement: scorePart(40),
    contentFit: scorePart(30),
    conversion: scorePart(20),
    redFlags: scorePart(10),
  }).nullable(),
  notesAssessment: z.string().nullable(),
  marketingInsights: z.string().nullable(),
  competitorAnalysis: z.string().nullable(),
  actionItems: z.array(z.object({
    title: z.string(),
    description: z.string(),
    priority: z.enum(['high', 'medium', 'low']),
  })).max(10),
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

  const transcription = await getOpenAIClient().audio.transcriptions.create({
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
 * @param {boolean} isMyVideo - If true, enables scoring mode
 * @param {string} creatorNotes - Creator's self-assessment before seeing results
 * @param {boolean} isCompetitor - If true, enables competitor analysis mode
 * @param {string} competitorNotes - What the user wants to learn from competitor
 * @param {boolean} harshFeedback - If true, enables brutally honest feedback mode
 */
export async function analyzeComments(comments, platform, marketingContext = null, videoTranscript = null, videoFrames = null, isMyVideo = false, creatorNotes = null, isCompetitor = false, competitorNotes = null, harshFeedback = false) {
  console.log('[OpenAI] analyzeComments called with isMyVideo:', isMyVideo, 'isCompetitor:', isCompetitor, 'harshFeedback:', harshFeedback, 'creatorNotes:', creatorNotes ? 'provided' : 'none', 'competitorNotes:', competitorNotes ? 'provided' : 'none');

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

  // Build prompt with conditional persona based on harshFeedback setting
  const expertPreamble = harshFeedback
    ? `You are a brutally honest content strategy expert with 15+ years experience.
You do NOT sugarcoat feedback. You do NOT agree with creators just to be nice.
Your job is to deliver the truth that creators NEED to hear, not what they WANT to hear.

CRITICAL RULES:
- Never use phrases like "great job", "well done", or generic praise
- Always identify problems and weaknesses first
- Be specific with criticism - vague feedback is useless
- If something is mediocre, say it's mediocre
- Back every claim with evidence from comments
- Assume the creator wants tough love, not comfort

`
    : `You are a supportive content strategy coach with 15+ years experience.
Your goal is to help creators improve while maintaining their confidence and motivation.

TONE GUIDELINES:
- Lead with what's working before addressing areas for improvement
- Frame criticism as "opportunities" or "areas to explore" rather than failures
- Be specific and actionable, but deliver feedback with kindness
- Acknowledge effort and progress where visible
- Use phrases like "consider" and "you might try" instead of "you must"
- Back every suggestion with evidence from comments
- Maintain an encouraging, constructive tone throughout

`;

  const promptParts = [
    expertPreamble,
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
## MARKETING ANALYSIS

Product Description: "${marketingContext.description}"

Based on the comments AND the product image provided, populate marketingInsights with:

### Perception vs Positioning
[How audience perceives the product vs intended positioning]

### Messaging Gaps
[Visual/messaging resonance issues identified from comments]

### Platform Strategy
[Specific ${platform} content strategy improvements]

### Creative Tests
[Testable creative adjustments with expected outcomes]

**Important:** Image insights are hypotheses only. Comment evidence takes precedence.`;
  }

  // Add scoring section for "my video" analyses
  if (isMyVideo) {
    prompt += `

---
## VIDEO SCORE (0-100)

IMPORTANT: Analyze the SPECIFIC comments above and assign a PRECISE score. Do NOT default to generic middle scores like 50 or 55. Every video is different - your score should reflect THIS video's actual performance.

Score based on comment evidence:
- Audience Engagement Quality (40%): Are comments substantive discussions or just "nice video" spam?
- Content-Audience Fit (30%): Do viewers understand and resonate, or are they confused/off-topic?
- Conversion Signals (20%): Purchase intent, action-taking, questions about how to apply the content
- Red Flags (-10%): Complaints, negative sentiment, clickbait backlash, viewer disappointment

**Scoring Reference:**
- 85-100: Exceptional - Comments show deep engagement, questions, sharing intent, purchase signals
- 70-84: Strong - Mostly positive with substantive feedback, clear audience connection
- 55-69: Average - Generic positive reactions, some engagement but lacks depth
- 40-54: Below Average - Confusion, off-topic comments, weak engagement signals
- 25-39: Poor - Significant negative feedback, audience mismatch, complaints
- 0-24: Critical - Overwhelmingly negative, misleading content, audience rejection

Populate videoScore, scoreBreakdown, and priorityImprovement. Give each category a brief evidence-led reason.
The server will recompute the overall score from the category scores.`;
  }

  // Add notes reality check if creator provided notes
  if (creatorNotes && creatorNotes.trim()) {
    const selfAwarenessRating = harshFeedback
      ? 'Accurate / Partially Accurate / Delusional'
      : 'Accurate / Partially Accurate / Needs Recalibration';

    const directnessNote = harshFeedback
      ? 'Be direct. If the creator is wrong, tell them clearly with evidence from the comments.'
      : 'Be honest but constructive. If the creator\'s perception differs from reality, explain the gap with evidence and suggest how they can recalibrate their understanding.';

    prompt += `

---
## CREATOR SELF-ASSESSMENT CHECK

The creator believes: "${creatorNotes}"

Compare their self-assessment against actual audience reactions:
- Where is the creator RIGHT about what worked?
- Where is the creator's perception different from audience reality?
- What blind spots might the creator have?
- Rate their self-awareness: ${selfAwarenessRating}

${directnessNote}`;
  }

  // Add competitor analysis section if this is a competitor video
  if (isCompetitor) {
    prompt += `

---
## COMPETITOR INTELLIGENCE ANALYSIS

You are analyzing a COMPETITOR'S video. Populate competitorAnalysis with actionable, ethical intelligence.

### What Makes This Work
Identify 3-5 specific tactics this competitor uses that clearly resonate with their audience:
- Hook/opening strategy
- Content structure and pacing
- Call-to-action approach
- Audience engagement techniques
- Unique value proposition

### Steal-Worthy Elements
What specific elements could be adapted/copied ethically:
- Exact phrases or talking points that get engagement
- Visual or formatting patterns
- Topics or angles that resonate
- Thumbnail/title patterns (if discernible from comments)

### Their Weaknesses
Where is the competitor vulnerable? What complaints or confusion exists:
- Unmet audience needs mentioned in comments
- Questions they fail to answer
- Criticism or pushback patterns
- Gaps in their content

### Audience Profile
Based on who's commenting, describe this competitor's audience:
- Demographics signals (language, interests, knowledge level)
- Pain points and desires expressed
- What triggers engagement vs. passive viewing

### Counter-Strategy
How to compete directly with this content:
- Differentiation opportunities
- Underserved segments of their audience
- Better ways to deliver similar value`;

    if (competitorNotes && competitorNotes.trim()) {
      prompt += `

### User's Specific Question
The user wants to understand: "${competitorNotes}"

Make sure to directly address this question with specific evidence from the comments.`;
    }
  }

  // Build Responses API input — use multimodal content if we have images.
  const hasImages = !!(videoFrames?.length > 0) || !!(marketingContext?.image_base64);
  const userContent = [{ type: 'input_text', text: prompt }];

  if (marketingContext?.image_base64) {
    const mimeType = detectImageMimeType(marketingContext.image_base64);
    console.log(`[AI] Product image MIME type detected: ${mimeType}`);
    userContent.push({
      type: 'input_image',
      image_url: `data:${mimeType};base64,${marketingContext.image_base64}`,
      detail: 'auto',
    });
  }

  if (videoFrames && videoFrames.length > 0) {
    // Filter out any empty or invalid frames
    const validFrames = videoFrames.filter(frame => frame && frame.length > 100);
    const selectedFrames = validFrames.slice(0, 10); // Reduce to 10 frames to avoid token limits

    if (selectedFrames.length > 0) {
      console.log(`[AI] Adding ${selectedFrames.length} video frames to analysis`);
      userContent.push({
        type: 'input_text',
        text: `\n\n[The following ${selectedFrames.length} images are frames extracted from the creator's video. Use them to understand the visual content and production quality:]`,
      });
      for (const frame of selectedFrames) {
        const mimeType = detectImageMimeType(frame);
        userContent.push({
          type: 'input_image',
          image_url: `data:${mimeType};base64,${frame}`,
          detail: 'low',
        });
      }
    }
  }

  const model = getAIModel();
  const input = [
    {
      role: 'developer',
      content: [{
        type: 'input_text',
        text: 'Analyze only the supplied evidence. Never invent comment quotes or metrics. Put mode-specific fields at null when they do not apply. Return 3-7 concrete action items.',
      }],
    },
    { role: 'user', content: hasImages ? userContent : [{ type: 'input_text', text: prompt }] },
  ];

  console.log(`[AI] Sending structured request (model: ${model}). Prompt length: ${prompt.length} chars`);
  try {
    const response = await getOpenAIClient().responses.parse({
      model,
      input,
      max_output_tokens: hasImages ? 5000 : 3500,
      text: {
        format: zodTextFormat(CommentAnalysisSchema, 'comment_analysis'),
      },
    }, {
      timeout: 300000,
    });

    const analysis = response.output_parsed;
    if (!analysis) {
      throw new Error('The model returned no structured analysis');
    }

    console.log('[AI] Received and validated structured response');

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

    const actionItems = analysis.actionItems.map((item, index) => ({
      id: `action_${index + 1}`,
      ...item,
      completed: false,
    }));
    const scoreBreakdown = isMyVideo ? analysis.scoreBreakdown : null;
    const calculatedVideoScore = scoreBreakdown
      ? Math.max(0, Math.min(100,
        scoreBreakdown.engagement.score
        + scoreBreakdown.contentFit.score
        + scoreBreakdown.conversion.score
        - scoreBreakdown.redFlags.score
      ))
      : analysis.videoScore;

    return {
      summary: analysis.summary.trim() + footer,
      keywords,
      themes,
      stats: {
        total: comments.length,
        filtered: analysisComments.length,
        analyzed: size,
        coverage: coveragePct,
        sampled: needsSampling,
      },
      videoScore: isMyVideo ? calculatedVideoScore : null,
      priorityImprovement: isMyVideo ? analysis.priorityImprovement : null,
      scoreBreakdown,
      notesAssessment: creatorNotes ? analysis.notesAssessment : null,
      marketingInsights: marketingContext ? analysis.marketingInsights : null,
      competitorAnalysis: isCompetitor ? analysis.competitorAnalysis : null,
      actionItems,
    };

  } catch (aiError) {
    const safeError = new Error('The LLM analysis could not be completed');
    if (aiError?.status === 401) safeError.code = 'AI_AUTH_FAILED';
    else if (aiError?.status === 429) safeError.code = 'AI_RATE_LIMITED';
    else safeError.code = aiError?.code || 'AI_ANALYSIS_FAILED';
    console.error(`[AI] Analysis failed (${safeError.code})`);
    throw safeError;
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
