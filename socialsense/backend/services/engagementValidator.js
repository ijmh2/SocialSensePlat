/**
 * Engagement Validator Service
 * Analyzes influencer authenticity by examining engagement metrics,
 * ratio anomalies, and comment quality patterns.
 */

import {
  isEmojiOnly,
  isSpamOrPromo,
  isGenericShortPraise,
  normalizeForDedup,
} from './commentProcessor.js';

// Platform benchmarks (2025 industry data)
const PLATFORM_BENCHMARKS = {
  youtube: {
    engagementRate: {
      excellent: 5.0,
      good: 3.0,
      average: 1.5,
      suspiciousLow: 0.5,
      suspiciousHigh: 12.0,
    },
    likesToViews: { min: 0.02, typical: 0.04, max: 0.15 },
    commentsToLikes: { min: 0.01, typical: 0.03, max: 0.10 },
    viewsToFollowers: { min: 0.05, typical: 0.25, max: 0.80 },
  },
  tiktok: {
    engagementRate: {
      excellent: 6.0,
      good: 4.0,
      average: 2.5,
      suspiciousLow: 1.0,
      suspiciousHigh: 15.0,
    },
    likesToViews: { min: 0.05, typical: 0.10, max: 0.35 },
    commentsToLikes: { min: 0.005, typical: 0.02, max: 0.08 },
    sharesToLikes: { min: 0.01, typical: 0.05, max: 0.20 },
  },
  instagram: {
    engagementRate: {
      excellent: 3.0,
      good: 1.5,
      average: 0.5,
      suspiciousLow: 0.2,
      suspiciousHigh: 10.0,
    },
    likesToFollowers: { min: 0.02, typical: 0.05, max: 0.12 },
    commentsToLikes: { min: 0.01, typical: 0.03, max: 0.10 },
  },
};

// Bot comment patterns
const BOT_PATTERNS = {
  singleEmoji: /^[\p{Emoji}\s]+$/u,
  genericPhrases: [
    /^nice[!.]*$/i,
    /^great[!.]*$/i,
    /^love it[!.]*$/i,
    /^love this[!.]*$/i,
    /^amazing[!.]*$/i,
    /^cool[!.]*$/i,
    /^awesome[!.]*$/i,
    /^beautiful[!.]*$/i,
    /^perfect[!.]*$/i,
    /^wow[!.]*$/i,
    /^fire[!.]*$/i,
    /^keep it up[!.]*$/i,
    /^great (video|content|post)[!.]*$/i,
    /^nice (video|content|post)[!.]*$/i,
    /^love your (videos?|content|posts?)[!.]*$/i,
    /^you['']?re amazing[!.]*$/i,
    /^so good[!.]*$/i,
    /^best[!.]*$/i,
  ],
  promoPatterns: [
    /check (out )?my/i,
    /dm (me|for)/i,
    /follow me/i,
    /sub(scribe)? (to|for)/i,
    /collab\??/i,
    /promo code/i,
  ],
  suspiciousUsernames: [
    /^user\d{5,}$/i,
    /^[a-z]{2,4}\d{6,}$/i,
    /follow4follow/i,
    /sub4sub/i,
  ],
};

/**
 * Calculate engagement rate based on platform
 */
export function calculateEngagementRate(metrics, platform) {
  const { followers, contentMetrics } = metrics;

  if (!contentMetrics || contentMetrics.length === 0) {
    return { rate: 0, assessment: 'unknown', score: 0, details: 'No content metrics provided' };
  }

  // Calculate average engagement
  let totalEngagement = 0;
  let totalBase = 0;

  for (const post of contentMetrics) {
    const likes = post.likes || 0;
    const comments = post.comments || 0;
    const shares = post.shares || 0;
    const views = post.views || 0;

    if (platform === 'youtube' || platform === 'tiktok') {
      // Views-based engagement
      if (views > 0) {
        totalEngagement += likes + comments + (platform === 'tiktok' ? shares : 0);
        totalBase += views;
      }
    } else {
      // Follower-based engagement (Instagram)
      totalEngagement += likes + comments;
      totalBase += followers;
    }
  }

  const avgBase = totalBase / contentMetrics.length;
  const avgEngagement = totalEngagement / contentMetrics.length;
  const rate = avgBase > 0 ? (avgEngagement / avgBase) * 100 : 0;

  const benchmarks = PLATFORM_BENCHMARKS[platform]?.engagementRate || PLATFORM_BENCHMARKS.instagram.engagementRate;

  let assessment = 'average';
  let score = 15; // Default middle score (out of 25)
  let flags = [];

  if (rate >= benchmarks.excellent) {
    assessment = 'excellent';
    score = 25;
  } else if (rate >= benchmarks.good) {
    assessment = 'good';
    score = 22;
  } else if (rate >= benchmarks.average) {
    assessment = 'average';
    score = 18;
  } else if (rate >= benchmarks.suspiciousLow) {
    assessment = 'below_average';
    score = 12;
  } else {
    assessment = 'suspicious_low';
    score = 5;
    flags.push({ severity: 'high', flag: 'Abnormally low engagement rate', details: `${rate.toFixed(2)}% is significantly below the ${benchmarks.suspiciousLow}% threshold for ${platform}` });
  }

  if (rate > benchmarks.suspiciousHigh) {
    assessment = 'suspicious_high';
    score = 5;
    flags.push({ severity: 'high', flag: 'Abnormally high engagement rate', details: `${rate.toFixed(2)}% exceeds the ${benchmarks.suspiciousHigh}% threshold - possible purchased engagement` });
  }

  return {
    rate: parseFloat(rate.toFixed(2)),
    assessment,
    score,
    maxScore: 25,
    benchmark: benchmarks.average,
    flags,
    details: `Engagement rate: ${rate.toFixed(2)}% (${assessment.replace('_', ' ')})`,
  };
}

/**
 * Analyze ratio anomalies
 */
export function analyzeRatioAnomalies(metrics, platform) {
  const { followers, following, contentMetrics } = metrics;
  const benchmarks = PLATFORM_BENCHMARKS[platform] || PLATFORM_BENCHMARKS.instagram;

  const flags = [];
  const positives = [];
  let score = 25; // Start with max, deduct for issues

  const ratios = {};

  // Following-to-followers ratio
  if (followers > 0 && following !== undefined) {
    const followingRatio = following / followers;
    ratios.followingToFollowers = parseFloat(followingRatio.toFixed(3));

    if (followingRatio > 1.5) {
      flags.push({ severity: 'medium', flag: 'High following-to-followers ratio', details: `Following ${following} accounts with only ${followers} followers suggests mass-following strategy` });
      score -= 8;
    } else if (followingRatio > 0.8 && followingRatio <= 1.2) {
      flags.push({ severity: 'low', flag: 'Follow-for-follow pattern suspected', details: `Following/followers ratio of ${followingRatio.toFixed(2)}:1 is common in follow-for-follow schemes` });
      score -= 4;
    } else if (followingRatio < 0.3) {
      positives.push({ signal: 'Healthy following ratio', details: `Low following-to-followers ratio (${followingRatio.toFixed(2)}) indicates organic growth` });
    }
  }

  // Content metric ratios
  if (contentMetrics && contentMetrics.length > 0) {
    const avgLikes = contentMetrics.reduce((sum, p) => sum + (p.likes || 0), 0) / contentMetrics.length;
    const avgComments = contentMetrics.reduce((sum, p) => sum + (p.comments || 0), 0) / contentMetrics.length;
    const avgViews = contentMetrics.reduce((sum, p) => sum + (p.views || 0), 0) / contentMetrics.length;
    const avgShares = contentMetrics.reduce((sum, p) => sum + (p.shares || 0), 0) / contentMetrics.length;

    // Likes-to-followers (Instagram) or Likes-to-views (YouTube/TikTok)
    if (platform === 'instagram' && followers > 0) {
      const likesToFollowers = avgLikes / followers;
      ratios.likesToFollowers = parseFloat(likesToFollowers.toFixed(4));

      if (likesToFollowers < benchmarks.likesToFollowers?.min) {
        flags.push({ severity: 'medium', flag: 'Low likes-to-followers ratio', details: `Only ${(likesToFollowers * 100).toFixed(2)}% of followers engage - possible fake followers` });
        score -= 6;
      } else if (likesToFollowers > benchmarks.likesToFollowers?.max) {
        flags.push({ severity: 'high', flag: 'Abnormally high likes-to-followers ratio', details: `${(likesToFollowers * 100).toFixed(1)}% engagement suggests purchased likes` });
        score -= 10;
      }
    } else if (avgViews > 0) {
      const likesToViews = avgLikes / avgViews;
      ratios.likesToViews = parseFloat(likesToViews.toFixed(4));

      if (likesToViews < benchmarks.likesToViews?.min) {
        flags.push({ severity: 'medium', flag: 'Low likes-to-views ratio', details: `Only ${(likesToViews * 100).toFixed(2)}% of viewers like - possible bot views` });
        score -= 6;
      } else if (likesToViews > benchmarks.likesToViews?.max) {
        flags.push({ severity: 'high', flag: 'Abnormally high likes-to-views ratio', details: `${(likesToViews * 100).toFixed(1)}% like rate suggests purchased likes` });
        score -= 10;
      }
    }

    // Comments-to-likes ratio
    if (avgLikes > 0) {
      const commentsToLikes = avgComments / avgLikes;
      ratios.commentsToLikes = parseFloat(commentsToLikes.toFixed(4));

      if (commentsToLikes < (benchmarks.commentsToLikes?.min || 0.005)) {
        flags.push({ severity: 'low', flag: 'Low comments-to-likes ratio', details: `Only ${(commentsToLikes * 100).toFixed(2)}% comment rate indicates shallow engagement` });
        score -= 3;
      } else if (commentsToLikes > (benchmarks.commentsToLikes?.max || 0.10)) {
        flags.push({ severity: 'medium', flag: 'High comments-to-likes ratio', details: `${(commentsToLikes * 100).toFixed(1)}% comment rate may indicate comment bot activity` });
        score -= 6;
      } else {
        positives.push({ signal: 'Healthy comments-to-likes ratio', details: `${(commentsToLikes * 100).toFixed(2)}% comment rate shows genuine discussion` });
      }
    }

    // Views-to-followers ratio (YouTube/TikTok)
    if (avgViews > 0 && followers > 0 && platform !== 'instagram') {
      const viewsToFollowers = avgViews / followers;
      ratios.viewsToFollowers = parseFloat(viewsToFollowers.toFixed(4));

      if (viewsToFollowers < (benchmarks.viewsToFollowers?.min || 0.05)) {
        flags.push({ severity: 'medium', flag: 'Low views-to-followers ratio', details: `Only ${(viewsToFollowers * 100).toFixed(1)}% of followers view content - possible dead/fake followers` });
        score -= 6;
      } else if (viewsToFollowers > 2.0) {
        // High views could be viral content - not necessarily bad
        positives.push({ signal: 'Content reaching beyond followers', details: `Views exceed follower count - good discoverability` });
      }
    }

    // Engagement variance check
    const engagementRates = contentMetrics.map(p => {
      const base = platform === 'instagram' ? followers : (p.views || 1);
      return ((p.likes || 0) + (p.comments || 0)) / base;
    });

    const avgRate = engagementRates.reduce((a, b) => a + b, 0) / engagementRates.length;
    const variance = engagementRates.reduce((sum, r) => sum + Math.pow(r - avgRate, 2), 0) / engagementRates.length;
    const coefficientOfVariation = avgRate > 0 ? (Math.sqrt(variance) / avgRate) * 100 : 0;

    ratios.engagementVariance = parseFloat(coefficientOfVariation.toFixed(1));

    if (coefficientOfVariation > 150) {
      flags.push({ severity: 'medium', flag: 'Highly variable engagement', details: `${coefficientOfVariation.toFixed(0)}% variance suggests selective boosting on some posts` });
      score -= 5;
    } else if (coefficientOfVariation < 10) {
      flags.push({ severity: 'low', flag: 'Suspiciously consistent engagement', details: `Only ${coefficientOfVariation.toFixed(0)}% variance is unnaturally consistent` });
      score -= 3;
    }
  }

  return {
    score: Math.max(0, score),
    maxScore: 25,
    ratios,
    flags,
    positives,
  };
}

/**
 * Detect bot patterns in comments
 */
export function detectBotPatterns(comments) {
  if (!comments || comments.length === 0) {
    return {
      score: 30, // Full score if no comments to analyze
      maxScore: 30,
      suspectedBotPercentage: 0,
      analysis: { emojiOnly: 0, generic: 0, duplicates: 0, promo: 0, suspicious: 0 },
      flaggedComments: [],
      flags: [],
      positives: [],
    };
  }

  const analysis = {
    emojiOnly: 0,
    generic: 0,
    duplicates: 0,
    promo: 0,
    suspicious: 0,
    shortComments: 0,
  };

  const flaggedComments = [];
  const seenNormalized = new Map(); // Track duplicates
  let totalSuspicious = 0;

  // Analyze each comment
  for (const comment of comments) {
    const text = (comment.text || '').trim();
    const user = comment.user || '';
    let isSuspicious = false;
    let reasons = [];

    // Check emoji-only
    if (isEmojiOnly(text) || BOT_PATTERNS.singleEmoji.test(text)) {
      analysis.emojiOnly++;
      isSuspicious = true;
      reasons.push('emoji-only');
    }

    // Check generic phrases
    if (BOT_PATTERNS.genericPhrases.some(p => p.test(text))) {
      analysis.generic++;
      isSuspicious = true;
      reasons.push('generic phrase');
    }

    // Check promo patterns
    if (BOT_PATTERNS.promoPatterns.some(p => p.test(text))) {
      analysis.promo++;
      isSuspicious = true;
      reasons.push('promotional');
    }

    // Check short comments (under 3 words)
    const wordCount = text.split(/\s+/).filter(w => w.length > 0).length;
    if (wordCount < 3 && text.length < 15) {
      analysis.shortComments++;
      if (!isSuspicious) {
        isSuspicious = true;
        reasons.push('very short');
      }
    }

    // Check for duplicates
    const normalized = normalizeForDedup(text);
    if (normalized.length > 3) {
      const existing = seenNormalized.get(normalized);
      if (existing) {
        analysis.duplicates++;
        isSuspicious = true;
        reasons.push('duplicate');
      } else {
        seenNormalized.set(normalized, true);
      }
    }

    // Check suspicious usernames
    if (BOT_PATTERNS.suspiciousUsernames.some(p => p.test(user))) {
      analysis.suspicious++;
      isSuspicious = true;
      reasons.push('suspicious username');
    }

    if (isSuspicious) {
      totalSuspicious++;
      if (flaggedComments.length < 10) {
        flaggedComments.push({
          text: text.substring(0, 100),
          user,
          reasons,
        });
      }
    }
  }

  const suspectedBotPercentage = (totalSuspicious / comments.length) * 100;

  // Calculate score (30 points max)
  let score = 30;
  const flags = [];
  const positives = [];

  if (suspectedBotPercentage > 50) {
    score = 5;
    flags.push({ severity: 'high', flag: 'Majority of comments appear bot-generated', details: `${suspectedBotPercentage.toFixed(0)}% of comments show bot patterns` });
  } else if (suspectedBotPercentage > 30) {
    score = 12;
    flags.push({ severity: 'high', flag: 'High percentage of suspicious comments', details: `${suspectedBotPercentage.toFixed(0)}% of comments may be from bots` });
  } else if (suspectedBotPercentage > 15) {
    score = 20;
    flags.push({ severity: 'medium', flag: 'Moderate bot activity detected', details: `${suspectedBotPercentage.toFixed(0)}% of comments show suspicious patterns` });
  } else if (suspectedBotPercentage > 5) {
    score = 25;
    flags.push({ severity: 'low', flag: 'Minor bot activity', details: `${suspectedBotPercentage.toFixed(0)}% of comments appear automated` });
  } else {
    positives.push({ signal: 'Low bot activity', details: `Only ${suspectedBotPercentage.toFixed(1)}% of comments flagged as suspicious` });
  }

  // Check for duplicate patterns
  const duplicateRate = (analysis.duplicates / comments.length) * 100;
  if (duplicateRate > 10) {
    flags.push({ severity: 'medium', flag: 'High duplicate comment rate', details: `${duplicateRate.toFixed(0)}% of comments are duplicates - possible copy-paste bots` });
    score -= 5;
  }

  // Check emoji-only rate
  const emojiOnlyRate = (analysis.emojiOnly / comments.length) * 100;
  if (emojiOnlyRate > 25) {
    flags.push({ severity: 'medium', flag: 'High emoji-only comment rate', details: `${emojiOnlyRate.toFixed(0)}% of comments are emoji-only` });
    score -= 3;
  }

  return {
    score: Math.max(0, score),
    maxScore: 30,
    suspectedBotPercentage: parseFloat(suspectedBotPercentage.toFixed(1)),
    analysis,
    flaggedComments,
    flags,
    positives,
  };
}

/**
 * Analyze growth patterns
 */
export function analyzeGrowthPatterns(historicalData) {
  if (!historicalData || !historicalData.followerHistory || historicalData.followerHistory.length < 3) {
    return {
      score: 20, // Default score if no data
      maxScore: 20,
      analyzed: false,
      flags: [],
      positives: [],
      details: 'Insufficient historical data',
    };
  }

  const { followerHistory } = historicalData;
  const flags = [];
  const positives = [];
  let score = 20;

  // Sort by date
  const sorted = [...followerHistory].sort((a, b) => new Date(a.date) - new Date(b.date));

  // Calculate daily growth rates
  const growthRates = [];
  for (let i = 1; i < sorted.length; i++) {
    const prev = sorted[i - 1].count;
    const curr = sorted[i].count;
    const daysDiff = (new Date(sorted[i].date) - new Date(sorted[i - 1].date)) / (1000 * 60 * 60 * 24);

    if (daysDiff > 0 && prev > 0) {
      const dailyGrowth = ((curr - prev) / prev) / daysDiff * 100;
      growthRates.push({
        date: sorted[i].date,
        rate: dailyGrowth,
        absolute: curr - prev,
      });
    }
  }

  if (growthRates.length === 0) {
    return { score: 20, maxScore: 20, analyzed: false, flags: [], positives: [], details: 'Unable to calculate growth rates' };
  }

  // Check for sudden spikes
  const avgGrowth = growthRates.reduce((sum, g) => sum + g.rate, 0) / growthRates.length;
  const maxGrowth = Math.max(...growthRates.map(g => g.rate));
  const minGrowth = Math.min(...growthRates.map(g => g.rate));

  // Detect suspicious spikes (>500% of average in a single period)
  const spikes = growthRates.filter(g => g.rate > avgGrowth * 5 && g.absolute > 1000);
  if (spikes.length > 0) {
    flags.push({
      severity: 'high',
      flag: 'Suspicious follower spikes detected',
      details: `${spikes.length} period(s) with growth >500% of average - possible purchased followers`,
    });
    score -= 10;
  }

  // Detect sudden drops (possible bot purges)
  const drops = growthRates.filter(g => g.rate < -5 && g.absolute < -500);
  if (drops.length > 0) {
    flags.push({
      severity: 'high',
      flag: 'Significant follower drops detected',
      details: `${drops.length} period(s) with sudden losses - possible platform purged fake accounts`,
    });
    score -= 8;
  }

  // Check for step-pattern growth (flat, spike, flat, spike)
  let flatPeriods = 0;
  let spikePeriods = 0;
  for (const g of growthRates) {
    if (Math.abs(g.rate) < 0.5) flatPeriods++;
    else if (g.rate > 10) spikePeriods++;
  }

  if (flatPeriods > growthRates.length * 0.4 && spikePeriods > 2) {
    flags.push({
      severity: 'medium',
      flag: 'Step-pattern growth detected',
      details: 'Alternating flat periods and spikes suggest periodic follower purchases',
    });
    score -= 5;
  }

  // Positive: steady organic growth
  if (spikes.length === 0 && drops.length === 0 && avgGrowth > 0 && avgGrowth < 5) {
    positives.push({
      signal: 'Steady organic growth',
      details: `Average daily growth of ${avgGrowth.toFixed(2)}% indicates natural audience building`,
    });
  }

  return {
    score: Math.max(0, score),
    maxScore: 20,
    analyzed: true,
    avgDailyGrowth: parseFloat(avgGrowth.toFixed(2)),
    maxGrowthRate: parseFloat(maxGrowth.toFixed(2)),
    minGrowthRate: parseFloat(minGrowth.toFixed(2)),
    spikesDetected: spikes.length,
    dropsDetected: drops.length,
    flags,
    positives,
  };
}

/**
 * Calculate final authenticity score
 */
export function calculateAuthenticityScore(components) {
  const { engagementRate, ratioAnalysis, botAnalysis, growthAnalysis } = components;

  // Sum up scores
  let totalScore = 0;
  let maxPossible = 0;

  totalScore += engagementRate.score;
  maxPossible += engagementRate.maxScore;

  totalScore += ratioAnalysis.score;
  maxPossible += ratioAnalysis.maxScore;

  totalScore += botAnalysis.score;
  maxPossible += botAnalysis.maxScore;

  totalScore += growthAnalysis.score;
  maxPossible += growthAnalysis.maxScore;

  // Normalize to 0-100
  const normalizedScore = Math.round((totalScore / maxPossible) * 100);

  // Determine verdict
  let verdict = '';
  let verdictColor = '';

  if (normalizedScore >= 90) {
    verdict = 'Highly Authentic';
    verdictColor = 'success';
  } else if (normalizedScore >= 75) {
    verdict = 'Likely Authentic';
    verdictColor = 'success';
  } else if (normalizedScore >= 60) {
    verdict = 'Some Concerns';
    verdictColor = 'warning';
  } else if (normalizedScore >= 40) {
    verdict = 'Significant Red Flags';
    verdictColor = 'warning';
  } else {
    verdict = 'High Fraud Risk';
    verdictColor = 'error';
  }

  // Collect all flags and positives
  const allFlags = [
    ...engagementRate.flags,
    ...ratioAnalysis.flags,
    ...botAnalysis.flags,
    ...growthAnalysis.flags,
  ].sort((a, b) => {
    const severityOrder = { high: 0, medium: 1, low: 2 };
    return severityOrder[a.severity] - severityOrder[b.severity];
  });

  const allPositives = [
    ...ratioAnalysis.positives,
    ...botAnalysis.positives,
    ...growthAnalysis.positives,
  ];

  // Apply caps for severe issues
  let finalScore = normalizedScore;
  const criticalFlags = allFlags.filter(f => f.severity === 'high');

  if (criticalFlags.length >= 3) {
    finalScore = Math.min(finalScore, 45);
    verdict = 'Significant Red Flags';
    verdictColor = 'warning';
  }

  if (botAnalysis.suspectedBotPercentage > 50) {
    finalScore = Math.min(finalScore, 35);
    verdict = 'High Fraud Risk';
    verdictColor = 'error';
  }

  return {
    score: finalScore,
    verdict,
    verdictColor,
    breakdown: {
      engagementRate: { score: engagementRate.score, max: engagementRate.maxScore, reason: engagementRate.details },
      ratioAnalysis: { score: ratioAnalysis.score, max: ratioAnalysis.maxScore, reason: `Analyzed ${Object.keys(ratioAnalysis.ratios).length} metric ratios` },
      commentQuality: { score: botAnalysis.score, max: botAnalysis.maxScore, reason: `${botAnalysis.suspectedBotPercentage}% suspicious comments` },
      growthPatterns: { score: growthAnalysis.score, max: growthAnalysis.maxScore, reason: growthAnalysis.details || 'Growth analysis complete' },
    },
    redFlags: allFlags,
    positiveSignals: allPositives,
  };
}

/**
 * Generate recommendations based on analysis
 */
export function generateRecommendations(result) {
  const recommendations = [];
  const { score, redFlags } = result;

  if (score >= 75) {
    recommendations.push('This account appears authentic and is likely safe for partnership.');
    recommendations.push('Consider a trial collaboration to verify engagement quality firsthand.');
  } else if (score >= 60) {
    recommendations.push('Request analytics screenshots directly from the creator to verify metrics.');
    recommendations.push('Ask for case studies from previous brand partnerships.');
    recommendations.push('Start with a smaller trial campaign before committing to larger deals.');
  } else if (score >= 40) {
    recommendations.push('Exercise caution - multiple red flags detected.');
    recommendations.push('Request detailed audience demographics and analytics access.');
    recommendations.push('Consider alternative influencers with cleaner engagement metrics.');
    recommendations.push('If proceeding, use performance-based payment structures.');
  } else {
    recommendations.push('This account shows significant signs of artificial engagement.');
    recommendations.push('Partnership is not recommended without substantial evidence of authenticity.');
    recommendations.push('If you must proceed, require access to real-time analytics dashboard.');
  }

  // Add specific recommendations based on flags
  const highSeverityFlags = redFlags.filter(f => f.severity === 'high');

  if (highSeverityFlags.some(f => f.flag.includes('bot'))) {
    recommendations.push('Request a video showing live comments on their posts to verify authenticity.');
  }

  if (highSeverityFlags.some(f => f.flag.includes('follower'))) {
    recommendations.push('Monitor their follower count over the next 30 days for stability.');
  }

  return recommendations;
}

/**
 * Main validation function
 */
export function validateEngagement(data) {
  const { platform, profileMetrics, contentMetrics, commentSamples, historicalData, influencerName } = data;

  // Run all analyses
  const engagementRate = calculateEngagementRate(
    { followers: profileMetrics.followers, contentMetrics },
    platform
  );

  const ratioAnalysis = analyzeRatioAnomalies(
    { followers: profileMetrics.followers, following: profileMetrics.following, contentMetrics },
    platform
  );

  const botAnalysis = detectBotPatterns(commentSamples || []);

  const growthAnalysis = analyzeGrowthPatterns(historicalData);

  // Calculate final score
  const result = calculateAuthenticityScore({
    engagementRate,
    ratioAnalysis,
    botAnalysis,
    growthAnalysis,
  });

  // Generate recommendations
  const recommendations = generateRecommendations(result);

  return {
    influencerName: influencerName || 'Unknown',
    platform,
    authenticityScore: result.score,
    verdict: result.verdict,
    verdictColor: result.verdictColor,
    scoreBreakdown: result.breakdown,
    redFlags: result.redFlags,
    positiveSignals: result.positiveSignals,
    metricsAnalysis: {
      engagementRate: engagementRate.rate,
      engagementAssessment: engagementRate.assessment,
      ratios: ratioAnalysis.ratios,
    },
    botAnalysis: {
      suspectedBotPercentage: botAnalysis.suspectedBotPercentage,
      patterns: botAnalysis.analysis,
      flaggedComments: botAnalysis.flaggedComments,
    },
    growthAnalysis: growthAnalysis.analyzed ? {
      avgDailyGrowth: growthAnalysis.avgDailyGrowth,
      spikesDetected: growthAnalysis.spikesDetected,
      dropsDetected: growthAnalysis.dropsDetected,
    } : null,
    recommendations,
    analyzedAt: new Date().toISOString(),
  };
}

export default {
  validateEngagement,
  calculateEngagementRate,
  analyzeRatioAnomalies,
  detectBotPatterns,
  analyzeGrowthPatterns,
  calculateAuthenticityScore,
  generateRecommendations,
  PLATFORM_BENCHMARKS,
};
