/**
 * Input validation middleware for API routes
 */

// UUID v4 regex pattern
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * Validate that a string is a valid UUID v4
 */
export const isValidUUID = (str) => {
  return typeof str === 'string' && UUID_REGEX.test(str);
};

/**
 * Middleware to validate :id parameter is a valid UUID
 */
export const validateUUID = (paramName = 'id') => {
  return (req, res, next) => {
    const value = req.params[paramName];
    if (!value || !isValidUUID(value)) {
      return res.status(400).json({
        error: `Invalid ${paramName} format`,
        details: `Parameter '${paramName}' must be a valid UUID`
      });
    }
    next();
  };
};

/**
 * Validate pagination parameters
 */
export const validatePagination = (req, res, next) => {
  const { limit, offset } = req.query;

  if (limit !== undefined) {
    const limitNum = parseInt(limit, 10);
    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(400).json({
        error: 'Invalid limit parameter',
        details: 'Limit must be a number between 1 and 100'
      });
    }
    req.query.limit = limitNum;
  }

  if (offset !== undefined) {
    const offsetNum = parseInt(offset, 10);
    if (isNaN(offsetNum) || offsetNum < 0) {
      return res.status(400).json({
        error: 'Invalid offset parameter',
        details: 'Offset must be a non-negative number'
      });
    }
    req.query.offset = offsetNum;
  }

  next();
};

/**
 * Sanitize string input to prevent XSS
 */
export const sanitizeString = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
};

/**
 * Validate URL format
 */
export const isValidUrl = (str) => {
  try {
    const url = new URL(str);
    return ['http:', 'https:'].includes(url.protocol);
  } catch {
    return false;
  }
};

export default {
  isValidUUID,
  validateUUID,
  validatePagination,
  sanitizeString,
  isValidUrl,
};
