import { ERROR_MESSAGES } from '../constants/errors.js';

export const validate = schema => async (req, res, next) => {
  try {
    await schema.validate(req.body, { abortEarly: false });
    next();
  } catch (error) {
    res
      .status(400)
      .json({ error: ERROR_MESSAGES.INVALID_INPUT, details: error.errors });
  }
};
