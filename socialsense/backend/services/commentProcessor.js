/**
 * Comment Processing Pipeline
 * Filters, cleans, and processes comments for analysis
 */

import { scoreSentiment } from './sentiment.js';

const COMMENT_CHAR_LIMIT = 200;

/**
 * Check if text is emoji-only (no alphanumeric characters)
 */
export function isEmojiOnly(text) {
  return !/[a-zA-Z0-9]/.test(text);
}

/**
 * Check if text is spam or promotional
 */
export function isSpamOrPromo(text) {
  const spamPatterns = [
    /http[s]?:\/\//i,
    /bit\.ly/i,
    /check out my/i,
    /subscribe to/i,
    /follow me/i,
    /dm me/i,
    /whatsapp/i,
    /telegram/i,
    /\bcrypto\b.*\bmoney\b/i,
    /100% guaranteed/i,
    /make money/i,
    /click here/i,
    /free gift/i,
  ];
  
  return spamPatterns.some(pattern => pattern.test(text));
}

/**
 * Check if text is generic short praise
 */
export function isGenericShortPraise(text) {
  if (text.length > 30) return false;
  
  const genericPatterns = [
    /^nice$/i,
    /^great$/i,
    /^love it$/i,
    /^amazing$/i,
    /^cool$/i,
    /^awesome$/i,
    /^love this$/i,
    /^great video$/i,
    /^nice video$/i,
    /^good$/i,
    /^wow$/i,
    /^beautiful$/i,
    /^perfect$/i,
    /^fire$/i,
    /^🔥+$/,
    /^❤️+$/,
    /^👍+$/,
  ];
  
  const cleaned = text.trim();
  return genericPatterns.some(pattern => pattern.test(cleaned));
}

/**
 * Check if text is off-topic noise
 */
export function isOffTopicNoise(text) {
  const noisePatterns = [
    /^first\s*!*$/i,
    /^early$/i,
    /who.*here in \d{4}/i,
    /anyone.*\d{4}/i,
    /notification squad/i,
    /roll call/i,
    /^hi$/i,
    /^hello$/i,
    /^sub to me$/i,
  ];
  
  return noisePatterns.some(pattern => pattern.test(text.trim()));
}

/**
 * Normalize text for deduplication
 */
export function normalizeForDedup(text) {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Clean comment text for analysis
 */
export function cleanCommentText(text) {
  let cleaned = text
    .replace(/@\w+/g, '') // Remove mentions
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
  
  if (cleaned.length > COMMENT_CHAR_LIMIT) {
    cleaned = cleaned.substring(0, COMMENT_CHAR_LIMIT);
  }
  
  return cleaned;
}

/**
 * Sanitize text for CSV export
 */
export function sanitizeCsvText(text) {
  if (!text) return '';
  
  let sanitized = String(text).trim();
  
  // Prevent formula injection
  const dangerousChars = ['=', '+', '-', '@', '\t', '\r', '\n'];
  if (dangerousChars.some(char => sanitized.startsWith(char))) {
    sanitized = "'" + sanitized;
  }
  
  // Remove pipe characters that might break CSV
  sanitized = sanitized.replace(/\|/g, ' ');
  
  return sanitized;
}

/**
 * Process comments through the filtering pipeline
 */
export function processComments(comments) {
  const stats = {
    original: comments.length,
    emoji_only: 0,
    spam_promo: 0,
    duplicates: 0,
    generic_praise: 0,
    off_topic: 0,
    after_hard_filters: 0,
  };
  
  // Add normalized text for deduplication
  const seen = new Set();
  const processed = [];
  
  for (const comment of comments) {
    const text = comment.text || '';
    const normalized = normalizeForDedup(text);
    
    // Hard filters
    if (isEmojiOnly(text)) {
      stats.emoji_only++;
      continue;
    }
    
    if (isSpamOrPromo(text)) {
      stats.spam_promo++;
      continue;
    }
    
    if (seen.has(normalized)) {
      stats.duplicates++;
      continue;
    }
    seen.add(normalized);
    
    // Soft filters (flagged but not removed)
    const isGeneric = isGenericShortPraise(text);
    const isOffTopic = isOffTopicNoise(text);
    
    if (isGeneric) stats.generic_praise++;
    if (isOffTopic) stats.off_topic++;
    
    const cleanedText = cleanCommentText(text);
    processed.push({
      ...comment,
      text: sanitizeCsvText(text),
      clean_text: cleanedText,
      is_generic_praise: isGeneric,
      is_off_topic: isOffTopic,
      normalized,
      sentiment: scoreSentiment(cleanedText),
    });
  }
  
  stats.after_hard_filters = processed.length;
  
  return { comments: processed, stats };
}

/**
 * Stratified sampling for large comment sets
 */
export function stratifiedSample(comments, targetSize = 2500) {
  if (comments.length <= targetSize) {
    return { sampled: comments, size: comments.length };
  }
  
  // Score comments by priority
  const scored = comments.map(comment => {
    let score = 0;
    const text = comment.text || '';
    
    // High engagement
    if (comment.likes >= getPercentile(comments.map(c => c.likes), 75)) {
      score += 3;
    }
    
    // Questions
    if (text.includes('?')) {
      score += 4;
    }
    
    // Negative feedback (high value for insights)
    const negativeWords = /\b(but|however|disappointed|issue|problem|wrong|bad|terrible|worst|hate|confused|why|unclear)\b/i;
    if (negativeWords.test(text)) {
      score += 5;
    }
    
    // Purchase intent
    const conversionWords = /\b(buy|purchase|order|link|price|cost|where to get|how much)\b/i;
    if (conversionWords.test(text)) {
      score += 4;
    }
    
    // Deprioritize generic/off-topic
    if (comment.is_generic_praise || comment.is_off_topic) {
      score = 0;
    }
    
    return { ...comment, priority_score: score };
  });
  
  // Sort by priority
  scored.sort((a, b) => b.priority_score - a.priority_score);
  
  // Take top 80% from high priority
  const highPriorityCount = Math.floor(targetSize * 0.8);
  const highPriority = scored.slice(0, highPriorityCount);
  
  // Random sample from remaining
  const remaining = scored.slice(highPriorityCount);
  const randomSampleCount = Math.min(targetSize - highPriorityCount, remaining.length);
  const randomSample = shuffleArray(remaining).slice(0, randomSampleCount);
  
  const sampled = [...highPriority, ...randomSample];
  
  return { sampled, size: sampled.length };
}

/**
 * Extract themes and keywords from comments
 */
export function extractThemesAndKeywords(texts, topN = 20) {
  if (!texts || texts.length === 0) {
    return { keywords: [], themes: [] };
  }
  
  const stopWords = new Set([
    'this', 'that', 'with', 'from', 'your', 'they', 'have', 'will',
    'what', 'about', 'would', 'there', 'their', 'which', 'when',
    'like', 'just', 'really', 'very', 'been', 'being', 'were',
    'much', 'many', 'some', 'more', 'also', 'only', 'such',
    'than', 'then', 'them', 'these', 'those', 'into', 'over',
  ]);
  
  // Extract words (4+ characters)
  const wordCounts = {};
  const bigramCounts = {};
  
  for (const text of texts) {
    const words = text.toLowerCase().match(/\b[a-zA-Z]{4,}\b/g) || [];
    const filteredWords = words.filter(w => !stopWords.has(w));
    
    // Count single words
    for (const word of filteredWords) {
      wordCounts[word] = (wordCounts[word] || 0) + 1;
    }
    
    // Count bigrams
    for (let i = 0; i < filteredWords.length - 1; i++) {
      const bigram = `${filteredWords[i]} ${filteredWords[i + 1]}`;
      bigramCounts[bigram] = (bigramCounts[bigram] || 0) + 1;
    }
  }
  
  // Sort and get top N
  const keywords = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, topN)
    .map(([word, count]) => ({ word, count }));
  
  const themes = Object.entries(bigramCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([theme, count]) => ({ theme, count }));
  
  return { keywords, themes };
}

// Helper functions
function getPercentile(arr, percentile) {
  const sorted = [...arr].sort((a, b) => a - b);
  const index = Math.ceil((percentile / 100) * sorted.length) - 1;
  return sorted[index] || 0;
}

function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export default {
  processComments,
  stratifiedSample,
  extractThemesAndKeywords,
  cleanCommentText,
  sanitizeCsvText,
};
