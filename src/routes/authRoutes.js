import express from 'express';
import {
  register,
  login,
  activate,
  forgot,
  reset,
  logout,
  refresh,
  resend,
} from '../controllers/authController.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  activateSchema,
  resendActivationSchema,
} from '../utils/validators.js';
// import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/register', validate(registerSchema), register);
router.post('/login', validate(loginSchema), login);
router.post('/activate', validate(activateSchema), activate);
router.post('/forgot-password', validate(forgotPasswordSchema), forgot);
router.post('/reset-password', validate(resetPasswordSchema), reset);
router.post('/logout', logout);
router.post('/refresh', refresh);
router.post('/resend-activation', validate(resendActivationSchema), resend);

export default router;
