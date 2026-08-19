import express from 'express';
import { processComments } from '../services/commentProcessor.js';
import { aggregateSentiment } from '../services/sentiment.js';
import { analyzeComments } from '../services/openai.js';
import { getAIModel, isAIConfigured } from '../services/aiClient.js';

const router = express.Router();

const MAX_COMMENTS = 200;
const MAX_COMMENT_LENGTH = 500;

function normalizeComments(input) {
  const values = Array.isArray(input)
    ? input
    : String(input || '').split(/\r?\n/);

  return values
    .map((value) => typeof value === 'string' ? value : value?.text)
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .map((value) => value.slice(0, MAX_COMMENT_LENGTH));
}

router.get('/status', (req, res) => {
  res.json({
    status: isAIConfigured() ? 'ready' : 'configuration_required',
    model: isAIConfigured() ? getAIModel() : null,
  });
});

router.post('/analyze', async (req, res) => {
  if (!isAIConfigured()) {
    return res.status(503).json({
      error: 'LLM analysis is not configured. Add OPENAI_API_KEY to backend/.env.',
      code: 'AI_NOT_CONFIGURED',
    });
  }

  const rawComments = normalizeComments(req.body?.comments);
  const platform = ['youtube', 'tiktok', 'other'].includes(req.body?.platform)
    ? req.body.platform
    : 'other';

  if (rawComments.length < 3) {
    return res.status(400).json({ error: 'Add at least 3 non-empty comments.' });
  }

  if (rawComments.length > MAX_COMMENTS) {
    return res.status(400).json({ error: `Use no more than ${MAX_COMMENTS} comments in the demo.` });
  }

  try {
    const { comments, stats: filterStats } = processComments(
      rawComments.map((text, index) => ({
        text,
        author: `commenter_${index + 1}`,
        likes: 0,
      }))
    );

    if (comments.length < 3) {
      return res.status(422).json({
        error: 'Too few substantive comments remained after spam and duplicate filtering.',
        filter_stats: filterStats,
      });
    }

    const sentiment = aggregateSentiment(
      comments.map((comment) => comment.sentiment).filter(Boolean)
    );

    const result = await analyzeComments(
      comments,
      platform,
      null,
      null,
      null,
      true,
      null,
      false,
      null,
      false
    );

    res.json({
      result,
      sentiment,
      filter_stats: filterStats,
      comments_analyzed: comments.length,
      model: getAIModel(),
    });
  } catch (error) {
    console.error(`[Demo] LLM analysis failed (${error.code || 'AI_ANALYSIS_FAILED'})`);
    res.status(error.code === 'AI_NOT_CONFIGURED' ? 503 : 502).json({
      error: error.code === 'AI_AUTH_FAILED'
        ? 'The server OpenAI key is invalid or expired. Update OPENAI_API_KEY and restart the API.'
        : 'The LLM analysis could not be completed. Please try again.',
      code: error.code || 'AI_ANALYSIS_FAILED',
    });
  }
});

export { normalizeComments };
export default router;
