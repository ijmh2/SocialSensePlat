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
 * Extract video score from AI response
 */
function extractVideoScore(summary) {
  const patterns = [
    /\*\*Overall Score:\s*(\d{1,3})\/100\*\*/i,
    /Overall Score:\s*(\d{1,3})\/100/i,
    /\*\*Score:\s*(\d{1,3})\/100\*\*/i,
    /Score:\s*(\d{1,3})\/100/i,
    /(\d{1,3})\/100/i, // Fallback: any X/100 pattern
  ];

  for (const pattern of patterns) {
    const match = summary.match(pattern);
    if (match) {
      const score = parseInt(match[1], 10);
      if (score >= 0 && score <= 100) {
        console.log('[OpenAI] Score extracted:', score, 'using pattern:', pattern.toString());
        return score;
      }
    }
  }
  console.log('[OpenAI] No score found in response. Last 500 chars:', summary.slice(-500));
  return null;
}

/**
 * Extract priority improvement from AI response
 */
function extractPriorityImprovement(summary) {
  const match = summary.match(/\*\*Priority Improvement:\*\*\s*([^\n]+)/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract notes assessment from AI response
 */
function extractNotesAssessment(summary) {
  const match = summary.match(/## CREATOR SELF-ASSESSMENT CHECK[\s\S]*?((?:Accurate|Partially Accurate|Delusional)[^\n]*)/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract marketing insights from AI response
 */
function extractMarketingInsights(summary) {
  const match = summary.match(/\*\*MARKETING_INSIGHTS_START\*\*([\s\S]*?)\*\*MARKETING_INSIGHTS_END\*\*/i);
  if (match) {
    return match[1].trim();
  }
  // Fallback: try to find the Marketing Analysis section
  const fallback = summary.match(/## MARKETING ANALYSIS([\s\S]*?)(?=---|\*\*Overall Score|## VIDEO SCORE|## CREATOR|$)/i);
  return fallback ? fallback[1].trim() : null;
}

/**
 * Extract competitor analysis from AI response
 */
function extractCompetitorAnalysis(summary) {
  const match = summary.match(/\*\*COMPETITOR_ANALYSIS_START\*\*([\s\S]*?)\*\*COMPETITOR_ANALYSIS_END\*\*/i);
  if (match) {
    return match[1].trim();
  }
  // Fallback: try to find the Competitor Intelligence section
  const fallback = summary.match(/## COMPETITOR INTELLIGENCE ANALYSIS([\s\S]*?)(?=---|\*\*Overall Score|## VIDEO SCORE|$)/i);
  return fallback ? fallback[1].trim() : null;
}

/**
 * Extract score breakdown from AI response
 */
function extractScoreBreakdown(summary) {
  const match = summary.match(/\*\*SCORE_BREAKDOWN_START\*\*([\s\S]*?)\*\*SCORE_BREAKDOWN_END\*\*/i);
  if (!match) return null;

  const text = match[1];
  const breakdown = {
    engagement: { score: 0, max: 40, reason: '' },
    contentFit: { score: 0, max: 30, reason: '' },
    conversion: { score: 0, max: 20, reason: '' },
    redFlags: { score: 0, max: 10, reason: '' },
  };

  // Extract Engagement
  const engMatch = text.match(/Engagement:\s*(\d+)\/40\s*-?\s*(.+)/i);
  if (engMatch) {
    breakdown.engagement.score = parseInt(engMatch[1], 10);
    breakdown.engagement.reason = engMatch[2].trim();
  }

  // Extract Content Fit
  const fitMatch = text.match(/Content Fit:\s*(\d+)\/30\s*-?\s*(.+)/i);
  if (fitMatch) {
    breakdown.contentFit.score = parseInt(fitMatch[1], 10);
    breakdown.contentFit.reason = fitMatch[2].trim();
  }

  // Extract Conversion
  const convMatch = text.match(/Conversion:\s*(\d+)\/20\s*-?\s*(.+)/i);
  if (convMatch) {
    breakdown.conversion.score = parseInt(convMatch[1], 10);
    breakdown.conversion.reason = convMatch[2].trim();
  }

  // Extract Red Flags
  const flagMatch = text.match(/Red Flags:\s*-?(\d+)\/10\s*-?\s*(.+)/i);
  if (flagMatch) {
    breakdown.redFlags.score = parseInt(flagMatch[1], 10);
    breakdown.redFlags.reason = flagMatch[2].trim();
  }

  return breakdown;
}

/**
 * Extract action items from AI response
 */
function extractActionItems(summary) {
  const items = [];

  // Look for action items section first
  const actionMatch = summary.match(/\*\*ACTION_ITEMS_START\*\*([\s\S]*?)\*\*ACTION_ITEMS_END\*\*/i);
  if (actionMatch) {
    const actionText = actionMatch[1];
    // Parse numbered items
    const itemMatches = actionText.matchAll(/\d+\.\s*\*\*([^*]+)\*\*:?\s*([^\n]+)?/g);
    for (const match of itemMatches) {
      items.push({
        id: `action_${items.length + 1}`,
        title: match[1].trim(),
        description: match[2]?.trim() || '',
        completed: false,
        priority: items.length < 3 ? 'high' : 'medium',
      });
    }
    if (items.length > 0) return items;
  }

  // Fallback: Extract from "Impact-Ranked Recommendations" section
  const recsMatch = summary.match(/## Impact-Ranked Recommendations([\s\S]*?)(?=##|---|\*\*Overall Score|$)/i);
  if (recsMatch) {
    const recsText = recsMatch[1];
    const recItems = recsText.matchAll(/\d+\.\s*(?:\*\*)?(?:What to change:?\s*)?([^*\n]+)(?:\*\*)?/gi);
    for (const match of recItems) {
      const title = match[1].trim().replace(/^\*\*|\*\*$/g, '');
      if (title.length > 10 && title.length < 200) {
        items.push({
          id: `action_${items.length + 1}`,
          title,
          description: '',
          completed: false,
          priority: items.length < 3 ? 'high' : 'medium',
        });
      }
    }
  }

  // Also try to extract from bullet points with action verbs
  if (items.length < 3) {
    const actionVerbs = /^[-*]\s*(Add|Create|Update|Fix|Improve|Change|Remove|Implement|Test|Review|Optimize|Refactor|Include|Consider)\s+/gim;
    const bulletMatches = summary.matchAll(actionVerbs);
    for (const match of bulletMatches) {
      const lineEnd = summary.indexOf('\n', match.index);
      const line = summary.substring(match.index + 2, lineEnd > 0 ? lineEnd : match.index + 100).trim();
      if (line.length > 10 && line.length < 200 && !items.some(i => i.title === line)) {
        items.push({
          id: `action_${items.length + 1}`,
          title: line,
          description: '',
          completed: false,
          priority: 'medium',
        });
      }
      if (items.length >= 10) break;
    }
  }

  return items.slice(0, 10);
}

/**
 * Analyze comments and generate insights
 * Optionally includes video transcript and frames for unified analysis
 * @param {boolean} isMyVideo - If true, enables harsh scoring mode
 * @param {string} creatorNotes - Creator's self-assessment before seeing results
 * @param {boolean} isCompetitor - If true, enables competitor analysis mode
 * @param {string} competitorNotes - What the user wants to learn from competitor
 */
export async function analyzeComments(comments, platform, marketingContext = null, videoTranscript = null, videoFrames = null, isMyVideo = false, creatorNotes = null, isCompetitor = false, competitorNotes = null) {
  console.log('[OpenAI] analyzeComments called with isMyVideo:', isMyVideo, 'isCompetitor:', isCompetitor, 'creatorNotes:', creatorNotes ? 'provided' : 'none', 'competitorNotes:', competitorNotes ? 'provided' : 'none');

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

  // Build prompt with harsh expert persona
  const expertPreamble = `You are a brutally honest content strategy expert with 15+ years experience.
You do NOT sugarcoat feedback. You do NOT agree with creators just to be nice.
Your job is to deliver the truth that creators NEED to hear, not what they WANT to hear.

CRITICAL RULES:
- Never use phrases like "great job", "well done", or generic praise
- Always identify problems and weaknesses first
- Be specific with criticism - vague feedback is useless
- If something is mediocre, say it's mediocre
- Back every claim with evidence from comments
- Assume the creator wants to improve, not be coddled

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

Based on the comments AND the product image provided, analyze:

**MARKETING_INSIGHTS_START**
### Perception vs Positioning
[How audience perceives the product vs intended positioning]

### Messaging Gaps
[Visual/messaging resonance issues identified from comments]

### Platform Strategy
[Specific ${platform} content strategy improvements]

### Creative Tests
[Testable creative adjustments with expected outcomes]
**MARKETING_INSIGHTS_END**

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

**REQUIRED OUTPUT FORMAT (at END of analysis):**

**SCORE_BREAKDOWN_START**
- Engagement: [0-40]/40 - [brief reason]
- Content Fit: [0-30]/30 - [brief reason]
- Conversion: [0-20]/20 - [brief reason]
- Red Flags: -[0-10]/10 - [brief reason]
**SCORE_BREAKDOWN_END**

**Overall Score: [YOUR CALCULATED NUMBER]/100**

**Priority Improvement:** [The single most impactful change based on comment evidence]

[2-3 sentences explaining WHY this specific score, citing specific comment patterns or quotes]`;
  }

  // Add notes reality check if creator provided notes
  if (creatorNotes && creatorNotes.trim()) {
    prompt += `

---
## CREATOR SELF-ASSESSMENT CHECK

The creator believes: "${creatorNotes}"

Compare their self-assessment against actual audience reactions:
- Where is the creator RIGHT about what worked?
- Where is the creator WRONG or deluding themselves?
- What blind spots does the creator have?
- Rate their self-awareness: Accurate / Partially Accurate / Delusional

Be direct. If the creator is wrong, tell them clearly with evidence from the comments.`;
  }

  // Add competitor analysis section if this is a competitor video
  if (isCompetitor) {
    prompt += `

---
## COMPETITOR INTELLIGENCE ANALYSIS

You are analyzing a COMPETITOR'S video. The goal is to extract actionable intelligence that can be used against them.

**COMPETITOR_ANALYSIS_START**

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
- Better ways to deliver similar value

**COMPETITOR_ANALYSIS_END**`;

    if (competitorNotes && competitorNotes.trim()) {
      prompt += `

### User's Specific Question
The user wants to understand: "${competitorNotes}"

Make sure to directly address this question with specific evidence from the comments.`;
    }
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

    // Log score section if this is a "my video" analysis
    if (isMyVideo) {
      console.log('[AI] My Video analysis - looking for score section...');
      const scoreSection = summary.match(/VIDEO SCORE[\s\S]*$/i);
      if (scoreSection) {
        console.log('[AI] Score section found:', scoreSection[0].slice(0, 300));
      } else {
        console.log('[AI] No VIDEO SCORE section found. Last 500 chars:', summary.slice(-500));
      }
    }

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

    // Extract scoring data if this is a "my video" analysis
    const videoScore = isMyVideo ? extractVideoScore(summary) : null;
    const priorityImprovement = isMyVideo ? extractPriorityImprovement(summary) : null;
    const scoreBreakdown = isMyVideo ? extractScoreBreakdown(summary) : null;
    const notesAssessment = creatorNotes ? extractNotesAssessment(summary) : null;
    const marketingInsights = marketingContext ? extractMarketingInsights(summary) : null;
    const competitorAnalysis = isCompetitor ? extractCompetitorAnalysis(summary) : null;
    const actionItems = extractActionItems(summary);

    console.log('[OpenAI] Scoring extraction - isMyVideo:', isMyVideo, 'videoScore:', videoScore, 'priorityImprovement:', priorityImprovement ? 'found' : 'null', 'scoreBreakdown:', scoreBreakdown ? 'found' : 'null');
    if (marketingInsights) {
      console.log('[OpenAI] Marketing insights extracted:', marketingInsights.slice(0, 100) + '...');
    }
    if (competitorAnalysis) {
      console.log('[OpenAI] Competitor analysis extracted:', competitorAnalysis.slice(0, 100) + '...');
    }
    if (actionItems.length > 0) {
      console.log('[OpenAI] Action items extracted:', actionItems.length);
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
      videoScore,
      priorityImprovement,
      scoreBreakdown,
      notesAssessment,
      marketingInsights,
      competitorAnalysis,
      actionItems,
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
      videoScore: null,
      priorityImprovement: null,
      scoreBreakdown: null,
      notesAssessment: null,
      marketingInsights: null,
      competitorAnalysis: null,
      actionItems: [],
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
