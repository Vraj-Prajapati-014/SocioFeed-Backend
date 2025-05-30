import { verifyJwtToken } from '../utils/jwt.js';
import { ERROR_MESSAGES } from '../constants/errors.js';
import logger from '../config/logger.js';

export const authMiddleware = async (req, res, next) => {
  const token = req.cookies.jwt; // Only check cookie
  if (!token) {
    logger.warn('No token provided', { url: req.url });
    return res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
  }

  try {
    const decoded = verifyJwtToken(token);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    logger.error(`JWT verification failed: ${error.message}`, { url: req.url });
    res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
  }
};
