import logger from '../config/logger.js';
import env from '../config/env.js';
import { ERROR_MESSAGES } from '../constants/errors.js';

export const errorMiddleware = (err, req, res, next) => {
  const status =
    Number.isInteger(err.status) && err.status >= 400 && err.status < 600
      ? err.status
      : 500;
  const message = err.message || ERROR_MESSAGES.SERVER_ERROR;
  const isProduction = env.NODE_ENV === 'production';

  // Log error with request context
  logger.error('Request error', {
    message: err.message,
    status,
    method: req.method,
    url: req.url,
    userId: req.user?.id || 'unauthenticated',
    stack: isProduction ? undefined : err.stack, // Hide stack in production
  });

  // Send response to client
  res.status(status).json({
    error: message,
  });

  next(); // Pass to next middleware (optional, for compatibility)
};
