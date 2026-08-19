import rateLimit from 'express-rate-limit';

const configuredMax = Number.parseInt(process.env.DEMO_RATE_LIMIT_MAX || '20', 10);

export const demoRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: Number.isFinite(configuredMax) && configuredMax > 0 ? configuredMax : 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demo rate limit reached. Please try again later.', code: 'DEMO_RATE_LIMITED' },
  validate: { trustProxy: false },
});
