import {
  registerUser,
  loginUser,
  activateAccount,
  forgotPassword,
  resetPassword,
  logoutUser,
  // refreshToken,
  resendActivation,
} from '../services/authService.js';
import logger from '../config/logger.js';
import env from '../config/env.js';
import { AUTH_CONSTANTS } from '../constants/auth.js';

// Register new user
export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    logger.info('User registration attempted', { email: req.body.email });
    res.status(201).json(result);
  } catch (error) {
    logger.error('Registration failed', {
      email: req.body.email,
      error: error.message,
    });
    next(error);
  }
};

// Login user and set cookies
export const login = async (req, res, next) => {
  try {
    const { token, refreshToken, user } = await loginUser(req.body);
    logger.info('User logged in', { userId: user.id });
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      maxAge: AUTH_CONSTANTS.JWT_TOKEN_EXPIRY,
    });
    res.cookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY,
    });
    res.json({ user });
  } catch (error) {
    logger.error('Login failed', {
      usernameOrEmail: req.body.usernameOrEmail,
      error: error.message,
    });
    next(error);
  }
};

// Activate account
export const activate = async (req, res, next) => {
  try {
    const result = await activateAccount(req.body.token);
    logger.info('Account activation attempted', { token: req.body.token });
    res.json(result);
  } catch (error) {
    logger.error('Activation failed', { error: error.message });
    next(error);
  }
};

// Request password reset
export const forgot = async (req, res, next) => {
  try {
    const result = await forgotPassword(req.body.email);
    logger.info('Password reset requested', { email: req.body.email });
    res.json(result);
  } catch (error) {
    logger.error('Password reset request failed', {
      email: req.body.email,
      error: error.message,
    });
    next(error);
  }
};

// Reset password
export const reset = async (req, res, next) => {
  try {
    const result = await resetPassword(req.body.token, req.body.password);
    logger.info('Password reset attempted', { token: req.body.token });
    res.json(result);
  } catch (error) {
    logger.error('Password reset failed', { error: error.message });
    next(error);
  }
};

// Logout user
export const logout = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const result = await logoutUser(refreshToken);
    logger.info('User logged out', { userId: req.user?.id || 'unknown' });
    res.clearCookie('jwt');
    res.clearCookie('refreshToken');
    res.json(result);
  } catch (error) {
    logger.error('Logout failed', {
      userId: req.user?.id || 'unknown',
      error: error.message,
    });
    next(error);
  }
};

// Refresh JWT
export const refresh = async (req, res, next) => {
  try {
    const refreshToken = req.cookies.refreshToken;
    const { token, user } = await refreshToken(refreshToken);
    logger.info('Token refreshed', { userId: user.id });
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      maxAge: AUTH_CONSTANTS.JWT_TOKEN_EXPIRY,
    });
    res.json({ user });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    res.clearCookie('jwt');
    res.clearCookie('refreshToken');
    next(error);
  }
};

// Resend activation email
export const resend = async (req, res, next) => {
  try {
    const result = await resendActivation(req.body.email);
    logger.info('Activation resend requested', { email: req.body.email });
    res.json(result);
  } catch (error) {
    logger.error('Activation resend failed', {
      email: req.body.email,
      error: error.message,
    });
    next(error);
  }
};
