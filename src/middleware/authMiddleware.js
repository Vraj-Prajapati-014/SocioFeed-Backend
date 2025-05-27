import { verifyJwtToken } from '../utils/jwt';
import { ERROR_MESSAGES } from '../constants';
import logger from '../config/logger';

export const authMiddleware = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
  }

  try {
    const decoded = verifyJwtToken(token);
    req.user = { id: decoded.id };
    next();
  } catch (error) {
    logger.error(`JWT verification failed: ${error.message}`);
    res.status(401).json({ error: ERROR_MESSAGES.UNAUTHORIZED });
  }
};
