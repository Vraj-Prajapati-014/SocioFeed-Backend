import logger from '../config/logger.js';

export const errorMiddleware = (err, req, res) => {
  logger.error(`Error: ${err.message}, Stack: ${err.stack}`);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
  });
};
