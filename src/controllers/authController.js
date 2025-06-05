import env from '../config/env.js';
import logger from '../config/logger.js';
import {
  activateAccount,
  forgotPassword,
  loginUser,
  logoutUser,
  registerUser,
  refreshToken,
  resendActivation,
  resetPassword,
} from '../services/authService.js';
// import jwt from 'jsonwebtoken';
import prisma from '../config/database.js';
// import {verifyJwtToken} from '../utils/jwt.js';
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
    const token = req.params.token; // Read token from URL parameter
    if (!token) {
      throw new Error('Activation token is required');
    }
    const result = await activateAccount(token);
    logger.info('Account activation attempted', { token });
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
    const result = await resetPassword(
      req.params.token,
      req.body.password,
      req.body.confirmPassword
    );
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

export const refresh = async (req, res) => {
  try {
    const refreshTokenValue = req.cookies.refreshToken;
    if (!refreshTokenValue) {
      throw new Error('No refresh token provided');
    }
    const {
      token,
      refreshToken: newRefreshToken,
      user,
    } = await refreshToken(refreshTokenValue);
    logger.info('Token refreshed', { userId: user.id });
    res.cookie('jwt', token, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: AUTH_CONSTANTS.JWT_TOKEN_EXPIRY,
    });
    res.cookie('refreshToken', newRefreshToken, {
      httpOnly: true,
      secure: env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY,
    });
    res.json({ message: 'Token refreshed', user });
  } catch (error) {
    logger.error('Token refresh failed', { error: error.message });
    res.clearCookie('jwt');
    res.clearCookie('refreshToken');
    res
      .status(error.status || 401)
      .json({ message: error.message || 'Unauthorized' });
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

export const getMe = async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: { id: true, username: true, email: true },
    });
    if (!user) {
      throw Object.assign(new Error('User not found'), { status: 404 });
    }
    res.json({ user });
  } catch (error) {
    logger.error('Get me failed', { error: error.message });
    res.status(error.status || 500).json({ message: error.message });
  }
};
