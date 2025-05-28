import logger from '../config/logger.js';
import { ERROR_MESSAGES } from '../constants/errors.js';

export const validate = schema => async (req, res, next) => {
  try {
    await schema.validate(req.body, { abortEarly: false });
    next();
  } catch (error) {
    const details = error.errors || ['Validation failed'];
    logger.error('Validation error', {
      message: ERROR_MESSAGES.INVALID_INPUT,
      details,
      method: req.method,
      url: req.url,
    });
    res.status(400).json({
      error: ERROR_MESSAGES.INVALID_INPUT,
      details,
    });
  }
};
