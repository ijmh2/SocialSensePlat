/**
 * Engagement Validator Service
 * Analyzes influencer authenticity using GPT-5.2
 * Supports YouTube and TikTok only
 */

import OpenAI from 'openai';
import {
  isEmojiOnly,
  normalizeForDedup,
} from './commentProcessor.js';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Platform benchmarks (2025 industry data) - YouTube and TikTok only
const PLATFORM_BENCHMARKS = {
  youtube: {
    engagementRate: { excellent: 5.0, good: 3.0, average: 1.5, suspiciousLow: 0.5, suspiciousHigh: 12.0 },
    likesToViews: { min: 0.02, typical: 0.04, max: 0.15 },
    commentsToLikes: { min: 0.01, typical: 0.03, max: 0.10 },
  },
  tiktok: {
    engagementRate: { excellent: 6.0, good: 4.0, average: 2.5, suspiciousLow: 1.0, suspiciousHigh: 15.0 },
    likesToViews: { min: 0.05, typical: 0.10, max: 0.35 },
    commentsToLikes: { min: 0.005, typical: 0.02, max: 0.08 },
  },
};

/**
 * Analyze comment patterns for bot detection
 */
function analyzeCommentPatterns(comments) {
  if (!comments || comments.length === 0) {
    return { total: 0, emojiOnly: 0, generic: 0, duplicates: 0, samples: [] };
  }

  const patterns = {
    total: comments.length,
    emojiOnly: 0,
    generic: 0,
    duplicates: 0,
    shortComments: 0,
    samples: [],
  };

  const genericPatterns = [
    /^nice[!.]*$/i, /^great[!.]*$/i, /^love it[!.]*$/i, /^amazing[!.]*$/i,
    /^cool[!.]*$/i, /^awesome[!.]*$/i, /^wow[!.]*$/i, /^fire[!.]*$/i,
    /^keep it up[!.]*$/i, /^great video[!.]*$/i, /^love this[!.]*$/i,
  ];

  const seen = new Set();

  for (const comment of comments) {
    const text = (comment.text || comment.clean_text || '').trim();

    if (isEmojiOnly(text)) patterns.emojiOnly++;
    if (genericPatterns.some(p => p.test(text))) patterns.generic++;
    if (text.split(/\s+/).length < 3) patterns.shortComments++;

    const normalized = normalizeForDedup(text);
    if (normalized.length > 5) {
      if (seen.has(normalized)) patterns.duplicates++;
      else seen.add(normalized);
    }

    if (patterns.samples.length < 50 && text.length > 0 && text.length < 200) {
      patterns.samples.push(text);
    }
  }

  patterns.emojiOnlyPct = ((patterns.emojiOnly / patterns.total) * 100).toFixed(1);
  patterns.genericPct = ((patterns.generic / patterns.total) * 100).toFixed(1);
  patterns.duplicatePct = ((patterns.duplicates / patterns.total) * 100).toFixed(1);

  return patterns;
}

/**
 * Build GPT prompt for engagement analysis
 */
function buildAnalysisPrompt(videoData, comments, platform) {
  const benchmarks = PLATFORM_BENCHMARKS[platform];
  const commentAnalysis = analyzeCommentPatterns(comments);

  const viewCount = parseInt(videoData.viewCount) || 0;
  const likeCount = parseInt(videoData.likeCount) || 0;
  const commentCount = parseInt(videoData.commentCount) || comments.length;

  const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount * 100).toFixed(2) : 0;
  const likesToViews = viewCount > 0 ? (likeCount / viewCount * 100).toFixed(2) : 0;
  const commentsToLikes = likeCount > 0 ? (commentCount / likeCount * 100).toFixed(2) : 0;

  return `You are an expert social media engagement analyst. Analyze this ${platform.toUpperCase()} video's engagement authenticity and provide a detailed report.

## VIDEO DATA
- Title: ${videoData.title || 'Unknown'}
- Channel: ${videoData.channelTitle || 'Unknown'}
- Views: ${viewCount.toLocaleString()}
- Likes: ${likeCount.toLocaleString()}
- Comments: ${commentCount.toLocaleString()}

## CALCULATED METRICS
- Engagement Rate: ${engagementRate}%
- Likes-to-Views Ratio: ${likesToViews}%
- Comments-to-Likes Ratio: ${commentsToLikes}%

## PLATFORM BENCHMARKS (${platform.toUpperCase()})
- Engagement Rate: Excellent >${benchmarks.engagementRate.excellent}%, Good >${benchmarks.engagementRate.good}%, Average >${benchmarks.engagementRate.average}%, Suspicious Low <${benchmarks.engagementRate.suspiciousLow}%, Suspicious High >${benchmarks.engagementRate.suspiciousHigh}%

## COMMENT PATTERN ANALYSIS (${commentAnalysis.total} comments analyzed)
- Emoji-Only Comments: ${commentAnalysis.emojiOnlyPct}%
- Generic Phrases: ${commentAnalysis.genericPct}%
- Duplicate Comments: ${commentAnalysis.duplicatePct}%

## SAMPLE COMMENTS
${commentAnalysis.samples.slice(0, 25).map((c, i) => `${i + 1}. "${c}"`).join('\n')}

---

Provide your analysis in this EXACT JSON format:
{
  "authenticityScore": <number 0-100>,
  "verdict": "<Highly Authentic | Likely Authentic | Some Concerns | Significant Red Flags | High Fraud Risk>",
  "engagementAssessment": "<2-3 sentence analysis>",
  "ratioAnalysis": "<2-3 sentence analysis>",
  "commentQuality": "<2-3 sentence analysis>",
  "redFlags": [
    {"severity": "high|medium|low", "flag": "<issue>", "details": "<explanation>"}
  ],
  "positiveSignals": [
    {"signal": "<positive indicator>", "details": "<explanation>"}
  ],
  "recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"]
}

Be direct and data-driven. If engagement appears genuine, say so. If there are red flags, be specific.`;
}

/**
 * Main validation function using GPT-5.2
 */
export async function validateEngagement(videoData, comments, platform) {
  console.log(`[EngagementValidator] Starting GPT-5.2 validation for ${platform}: ${videoData.title}`);

  const prompt = buildAnalysisPrompt(videoData, comments, platform);

  const completion = await openai.chat.completions.create({
    model: 'gpt-5.2',
    messages: [
      {
        role: 'system',
        content: 'You are an expert social media engagement analyst. Always respond with valid JSON only, no markdown.',
      },
      { role: 'user', content: prompt },
    ],
    max_tokens: 2000,
    temperature: 0.3,
  });

  const response = completion.choices[0]?.message?.content || '{}';
  console.log(`[EngagementValidator] GPT-5.2 response received`);

  let result;
  try {
    // Clean response if wrapped in markdown
    const cleaned = response.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    result = JSON.parse(cleaned);
  } catch (e) {
    console.error('[EngagementValidator] Failed to parse GPT response:', e);
    result = {
      authenticityScore: 50,
      verdict: 'Analysis Error',
      engagementAssessment: 'Unable to parse analysis results.',
      ratioAnalysis: '',
      commentQuality: '',
      redFlags: [],
      positiveSignals: [],
      recommendations: ['Please try again.'],
    };
  }

  // Calculate metrics for display
  const viewCount = parseInt(videoData.viewCount) || 0;
  const likeCount = parseInt(videoData.likeCount) || 0;
  const commentCount = parseInt(videoData.commentCount) || comments.length;
  const commentAnalysis = analyzeCommentPatterns(comments);

  // Set verdict color
  let verdictColor = 'warning';
  if (result.authenticityScore >= 75) verdictColor = 'success';
  else if (result.authenticityScore >= 60) verdictColor = 'primary';
  else if (result.authenticityScore < 40) verdictColor = 'error';

  return {
    platform,
    videoTitle: videoData.title || 'Unknown',
    channelTitle: videoData.channelTitle || 'Unknown',
    authenticityScore: result.authenticityScore,
    verdict: result.verdict,
    verdictColor,
    metricsAnalysis: {
      viewCount,
      likeCount,
      commentCount,
      engagementRate: viewCount > 0 ? parseFloat(((likeCount + commentCount) / viewCount * 100).toFixed(2)) : 0,
      likesToViews: viewCount > 0 ? parseFloat((likeCount / viewCount * 100).toFixed(2)) : 0,
      commentsToLikes: likeCount > 0 ? parseFloat((commentCount / likeCount * 100).toFixed(2)) : 0,
    },
    commentAnalysis: {
      total: commentAnalysis.total,
      emojiOnlyPct: parseFloat(commentAnalysis.emojiOnlyPct) || 0,
      genericPct: parseFloat(commentAnalysis.genericPct) || 0,
      duplicatePct: parseFloat(commentAnalysis.duplicatePct) || 0,
    },
    engagementAssessment: result.engagementAssessment || '',
    ratioAnalysis: result.ratioAnalysis || '',
    commentQuality: result.commentQuality || '',
    redFlags: result.redFlags || [],
    positiveSignals: result.positiveSignals || [],
    recommendations: result.recommendations || [],
    analyzedAt: new Date().toISOString(),
  };
}

export default {
  validateEngagement,
  analyzeCommentPatterns,
  PLATFORM_BENCHMARKS,
};
