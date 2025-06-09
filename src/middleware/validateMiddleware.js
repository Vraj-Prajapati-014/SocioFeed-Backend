import { validationResult } from 'express-validator';
import logger from '../config/logger.js';
import { ERROR_MESSAGES } from '../constants/errors.js';

export const validate = validations => async (req, res, next) => {
  await Promise.all(validations.map(validation => validation.run(req)));

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array().map(err => ({
      field: err.param, // Include the field name (e.g., "password", "confirmPassword")
      message: err.msg, // The error message (e.g., "Passwords must match")
    }));
    logger.error('Validation error', {
      message: ERROR_MESSAGES.INVALID_INPUT,
      details,
      method: req.method,
      url: req.url,
    });
    return res.status(400).json({
      error: ERROR_MESSAGES.INVALID_INPUT,
      details, // Now an array of objects with field and message
    });
  }

  next();
};
