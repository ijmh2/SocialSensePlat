// Rule-based sentiment analysis — no AI API calls needed

const POSITIVE_WORDS = new Set([
  'good', 'great', 'awesome', 'amazing', 'love', 'loved', 'loving',
  'excellent', 'fantastic', 'wonderful', 'beautiful', 'perfect',
  'best', 'brilliant', 'outstanding', 'incredible', 'impressive',
  'helpful', 'useful', 'informative', 'inspiring', 'inspired',
  'enjoy', 'enjoyed', 'entertaining', 'fun', 'funny', 'hilarious',
  'cool', 'nice', 'lovely', 'superb', 'remarkable', 'exceptional',
  'recommend', 'recommended', 'favorite', 'favourite', 'valuable',
  'thank', 'thanks', 'grateful', 'appreciate', 'appreciated',
  'happy', 'glad', 'pleased', 'satisfied', 'excited',
  'agree', 'agreed', 'correct', 'right', 'true', 'accurate',
  'quality', 'professional', 'clean', 'clear', 'easy', 'simple',
  'worth', 'effective', 'efficient', 'reliable', 'solid', 'strong',
  'creative', 'innovative', 'unique', 'genius', 'smart', 'clever',
  'fire', 'goat', 'legendary', 'epic', 'dope', 'sick', 'lit',
  'underrated', 'subscribe', 'subscribed', 'support', 'supported',
  'insightful', 'powerful', 'phenomenal', 'stunning', 'magnificent',
  'wholesome', 'blessed', 'masterpiece', 'flawless', 'pristine',
]);

const NEGATIVE_WORDS = new Set([
  'bad', 'terrible', 'awful', 'horrible', 'worst', 'poor', 'trash',
  'hate', 'hated', 'hating', 'dislike', 'disappointing', 'disappointed',
  'boring', 'bored', 'waste', 'wasted', 'useless', 'pointless',
  'wrong', 'incorrect', 'false', 'fake', 'misleading', 'clickbait',
  'annoying', 'annoyed', 'frustrated', 'frustrating', 'confusing',
  'confused', 'unclear', 'complicated', 'difficult', 'hard',
  'ugly', 'cheap', 'broken', 'failed', 'failure', 'error',
  'problem', 'issue', 'bug', 'glitch', 'crash', 'crashed',
  'slow', 'laggy', 'lag', 'scam', 'ripoff', 'overpriced',
  'overrated', 'mediocre', 'average', 'meh', 'cringe', 'crappy',
  'stupid', 'dumb', 'ridiculous', 'absurd', 'nonsense',
  'stop', 'quit', 'unsubscribe', 'unfollowed',
  'disagree', 'offensive', 'inappropriate', 'unprofessional',
  'regret', 'refund', 'complaint', 'lacking', 'missing',
  'pathetic', 'disgusting', 'atrocious', 'dreadful', 'horrendous',
  'toxic', 'garbage', 'rubbish', 'sucks', 'lame',
]);

const INTENSIFIERS = new Set([
  'very', 'really', 'extremely', 'super', 'absolutely', 'totally',
  'completely', 'incredibly', 'amazingly', 'truly', 'deeply', 'highly',
  'so', 'insanely', 'ridiculously', 'unbelievably',
]);

const NEGATORS = new Set([
  'not', "n't", 'no', 'never', 'neither', 'nor', 'hardly', 'barely',
  'scarcely', 'rarely', "don't", "doesn't", "didn't", "won't",
  "wouldn't", "couldn't", "shouldn't", "isn't", "aren't", "wasn't",
]);

export function scoreSentiment(text) {
  if (!text || typeof text !== 'string') {
    return { score: 0, label: 'neutral', positive_count: 0, negative_count: 0 };
  }

  const words = text.toLowerCase().match(/\b[\w']+\b/g) || [];
  let score = 0;
  let positiveCount = 0;
  let negativeCount = 0;

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    let wordScore = 0;

    if (POSITIVE_WORDS.has(word)) {
      wordScore = 1;
      positiveCount++;
    } else if (NEGATIVE_WORDS.has(word)) {
      wordScore = -1;
      negativeCount++;
    } else {
      continue;
    }

    // Check for preceding negator (look back up to 3 words)
    const lookback = Math.max(0, i - 3);
    let negated = false;
    for (let j = lookback; j < i; j++) {
      if (NEGATORS.has(words[j])) {
        negated = true;
        break;
      }
    }
    if (negated) {
      wordScore *= -1;
      if (wordScore > 0) { negativeCount--; positiveCount++; }
      else { positiveCount--; negativeCount++; }
    }

    // Check for preceding intensifier
    if (i > 0 && INTENSIFIERS.has(words[i - 1])) {
      wordScore *= 1.5;
    }

    score += wordScore;
  }

  const maxPossible = Math.max(1, positiveCount + negativeCount);
  const normalizedScore = Math.max(-1, Math.min(1, score / maxPossible));

  let label;
  if (normalizedScore > 0.1) label = 'positive';
  else if (normalizedScore < -0.1) label = 'negative';
  else label = 'neutral';

  return {
    score: Math.round(normalizedScore * 100) / 100,
    label,
    positive_count: Math.max(0, positiveCount),
    negative_count: Math.max(0, negativeCount),
  };
}

export function aggregateSentiment(sentimentResults) {
  if (!sentimentResults || sentimentResults.length === 0) {
    return { positive: 0, negative: 0, neutral: 0, total: 0, average_score: 0, positive_pct: 0, negative_pct: 0, neutral_pct: 0 };
  }

  const counts = { positive: 0, negative: 0, neutral: 0 };
  let totalScore = 0;

  for (const result of sentimentResults) {
    counts[result.label]++;
    totalScore += result.score;
  }

  return {
    positive: counts.positive,
    negative: counts.negative,
    neutral: counts.neutral,
    total: sentimentResults.length,
    average_score: Math.round((totalScore / sentimentResults.length) * 100) / 100,
    positive_pct: Math.round((counts.positive / sentimentResults.length) * 100),
    negative_pct: Math.round((counts.negative / sentimentResults.length) * 100),
    neutral_pct: Math.round((counts.neutral / sentimentResults.length) * 100),
  };
}
