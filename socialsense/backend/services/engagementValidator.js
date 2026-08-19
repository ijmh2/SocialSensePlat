/**
 * Engagement Validator Service
 * Analyzes influencer authenticity using GPT-5.2
 * Supports YouTube and TikTok only
 */

import { z } from 'zod/v4';
import { zodTextFormat } from 'openai/helpers/zod';
import {
  isEmojiOnly,
  normalizeForDedup,
} from './commentProcessor.js';
import { getAIModel, getOpenAIClient } from './aiClient.js';

const EngagementAnalysisSchema = z.object({
  authenticityScore: z.number().int().min(0).max(100),
  verdict: z.enum([
    'Highly Authentic',
    'Likely Authentic',
    'Some Concerns',
    'Significant Red Flags',
    'High Fraud Risk',
  ]),
  engagementAssessment: z.string(),
  ratioAnalysis: z.string(),
  commentQuality: z.string(),
  redFlags: z.array(z.object({
    severity: z.enum(['high', 'medium', 'low']),
    flag: z.string(),
    details: z.string(),
  })),
  positiveSignals: z.array(z.object({
    signal: z.string(),
    details: z.string(),
  })),
  recommendations: z.array(z.string()).min(1).max(6),
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

  // Check if we have meaningful metrics (TikTok often doesn't provide these)
  const hasMetrics = viewCount > 0 || likeCount > 0;
  const isTikTok = platform === 'tiktok';

  const engagementRate = viewCount > 0 ? ((likeCount + commentCount) / viewCount * 100).toFixed(2) : null;
  const likesToViews = viewCount > 0 ? (likeCount / viewCount * 100).toFixed(2) : null;
  const commentsToLikes = likeCount > 0 ? (commentCount / likeCount * 100).toFixed(2) : null;

  // Build metrics section based on availability
  let metricsSection = '';
  if (hasMetrics) {
    metricsSection = `## VIDEO DATA
- Title: ${videoData.title || 'Unknown'}
- Channel: ${videoData.channelTitle || 'Unknown'}
- Views: ${viewCount.toLocaleString()}
- Likes: ${likeCount.toLocaleString()}
- Comments: ${commentCount.toLocaleString()}

## CALCULATED METRICS
- Engagement Rate: ${engagementRate || 'N/A'}%
- Likes-to-Views Ratio: ${likesToViews || 'N/A'}%
- Comments-to-Likes Ratio: ${commentsToLikes || 'N/A'}%

## PLATFORM BENCHMARKS (${platform.toUpperCase()})
- Engagement Rate: Excellent >${benchmarks.engagementRate.excellent}%, Good >${benchmarks.engagementRate.good}%, Average >${benchmarks.engagementRate.average}%`;
  } else {
    metricsSection = `## VIDEO DATA
- Title: ${videoData.title || 'TikTok Video'}
- Platform: ${platform.toUpperCase()}
- Comments Analyzed: ${commentCount.toLocaleString()}

## METRICS AVAILABILITY
**NOTE: ${isTikTok ? 'TikTok' : 'This platform'} does not provide view/like counts through the API.**
Your analysis should focus PRIMARILY on comment patterns and quality rather than engagement ratios.
DO NOT flag missing metrics as red flags - this is a platform limitation, not a sign of fake engagement.`;
  }

  return `You are an expert social media engagement analyst. Analyze this ${platform.toUpperCase()} video's engagement authenticity and provide a detailed report.

${metricsSection}

## COMMENT PATTERN ANALYSIS (${commentAnalysis.total} comments analyzed)
- Emoji-Only Comments: ${commentAnalysis.emojiOnlyPct}%
- Generic Phrases: ${commentAnalysis.genericPct}%
- Duplicate Comments: ${commentAnalysis.duplicatePct}%

## SAMPLE COMMENTS
${commentAnalysis.samples.slice(0, 25).map((c, i) => `${i + 1}. "${c}"`).join('\n')}

---

${!hasMetrics ? `IMPORTANT: Since engagement metrics (views/likes) are not available for this ${platform.toUpperCase()} video, base your authenticity score PRIMARILY on comment quality and patterns. Focus on:
- Are comments substantive and relevant to the content?
- Do comments show genuine engagement (questions, detailed feedback)?
- Are there signs of bot activity in comment patterns (duplicates, generic phrases)?
- Is there diversity in commenter language and style?

Do NOT penalize the score for missing metrics - this is normal for ${platform.toUpperCase()} API limitations.

` : ''}Be direct and data-driven. If engagement appears genuine, say so. If there are red flags, be specific.
Use 2-3 sentences for each assessment and return 1-6 concrete recommendations in the required schema.`;
}

/**
 * Main validation function using GPT-5.2
 */
export async function validateEngagement(videoData, comments, platform) {
  const model = getAIModel();
  console.log(`[EngagementValidator] Starting ${model} validation for ${platform}: ${videoData.title}`);

  const prompt = buildAnalysisPrompt(videoData, comments, platform);

  const response = await getOpenAIClient().responses.parse({
    model,
    input: [
      {
        role: 'developer',
        content: 'You are an evidence-led social media engagement analyst. Do not treat missing platform metrics as suspicious and do not invent evidence.',
      },
      { role: 'user', content: prompt },
    ],
    max_output_tokens: 2500,
    text: {
      format: zodTextFormat(EngagementAnalysisSchema, 'engagement_analysis'),
    },
  });

  const result = response.output_parsed;
  if (!result) {
    throw new Error('The model returned no structured engagement analysis');
  }
  console.log('[EngagementValidator] Structured response received and validated');

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
