import express from 'express';
import {
  register,
  login,
  activate,
  forgot,
  reset,
  logout,
} from '../controllers/authController.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../utils/validators.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.get('/activate/:token', activate);
router.post('/forgot-password', validate(forgotPasswordSchema), forgot);
router.post('/reset-password/:token', validate(resetPasswordSchema), reset);
router.post('/logout', logout);

export default router;
