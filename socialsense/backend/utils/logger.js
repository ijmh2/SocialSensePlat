/**
 * Production-safe logger that redacts sensitive information
 */

const isProduction = process.env.NODE_ENV === 'production';

// Redact sensitive values (show first 4 chars only)
const redact = (value) => {
  if (!value || typeof value !== 'string') return '[redacted]';
  if (value.length <= 8) return '[redacted]';
  return `${value.slice(0, 4)}...`;
};

// Safe logging - redacts user IDs and session IDs in production
export const logger = {
  info: (message, data = {}) => {
    if (isProduction) {
      // Redact sensitive fields
      const safeData = { ...data };
      if (safeData.userId) safeData.userId = redact(safeData.userId);
      if (safeData.sessionId) safeData.sessionId = redact(safeData.sessionId);
      if (safeData.subscriptionId) safeData.subscriptionId = redact(safeData.subscriptionId);
      console.log(`[INFO] ${message}`, Object.keys(safeData).length ? safeData : '');
    } else {
      console.log(`[INFO] ${message}`, data);
    }
  },

  warn: (message, data = {}) => {
    if (isProduction) {
      const safeData = { ...data };
      if (safeData.userId) safeData.userId = redact(safeData.userId);
      console.warn(`[WARN] ${message}`, Object.keys(safeData).length ? safeData : '');
    } else {
      console.warn(`[WARN] ${message}`, data);
    }
  },

  error: (message, error = null) => {
    if (isProduction) {
      // Only log error type and message, not stack trace
      console.error(`[ERROR] ${message}`, error?.message || '');
    } else {
      console.error(`[ERROR] ${message}`, error);
    }
  },

  // Debug logs only in development
  debug: (message, data = {}) => {
    if (!isProduction) {
      console.log(`[DEBUG] ${message}`, data);
    }
  },
};

export default logger;
