import prisma from '../config/database.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  generateJwtToken,
  generateRefreshToken,
  verifyRefreshToken,
  invalidateRefreshToken,
} from '../utils/jwt.js';
import {
  sendActivationEmail,
  sendPasswordResetEmail,
} from '../services/emailService.js';
import { AUTH_CONSTANTS } from '../constants/auth.js';
import { ERROR_MESSAGES } from '../constants/errors.js';
import logger from '../config/logger.js';

// Register new user
export const registerUser = async ({ username, email, password }) => {
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
    include: { activationTokens: true },
  });

  if (existingUser) {
    const hasValidToken = existingUser.activationTokens.some(
      token => token.expiresAt > new Date()
    );
    if (!existingUser.isActive && !hasValidToken) {
      await prisma.activationToken.deleteMany({
        where: { userId: existingUser.id },
      });
      await prisma.user.delete({ where: { id: existingUser.id } });
      logger.info('Deleted unactivated user for re-registration', {
        email,
        username,
      });
    } else {
      logger.warn('User already exists', { username, email });
      if (existingUser.username === username) {
        throw Object.assign(new Error(ERROR_MESSAGES.USERNAME_ALREADY_EXISTS), {
          status: 400,
        });
      }
      throw Object.assign(new Error(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS), {
        status: 400,
      });
    }
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword, isActive: false },
  });

  const token = uuidv4();
  await prisma.activationToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.ACTIVATION_TOKEN_EXPIRY),
    },
  });

  await sendActivationEmail(user, token);
  logger.info('User registered', { userId: user.id, email });
  return {
    message:
      'Registration successful, please check your email to activate your account',
  };
};

// Login user
export const loginUser = async ({ usernameOrEmail, password }) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }] },
  });

  if (!user) {
    logger.warn('User not found', { usernameOrEmail });
    throw Object.assign(new Error(ERROR_MESSAGES.USER_NOT_FOUND), {
      status: 404,
    });
  }

  if (!user.isActive) {
    logger.warn('Account not active', { userId: user.id });
    throw Object.assign(new Error(ERROR_MESSAGES.ACCOUNT_NOT_ACTIVE), {
      status: 403,
      action: 'resend_activation',
    });
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    logger.warn('Invalid password', { userId: user.id });
    throw Object.assign(new Error(ERROR_MESSAGES.INVALID_CREDENTIALS), {
      status: 401,
    });
  }

  const token = generateJwtToken(user);
  const refreshToken = await generateRefreshToken(user);
  logger.info('User logged in', { userId: user.id });
  return {
    token,
    refreshToken,
    user: { id: user.id, username: user.username, email: user.email },
  };
};

// Activate account
export const activateAccount = async token => {
  const activationToken = await prisma.activationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!activationToken || activationToken.expiresAt < new Date()) {
    logger.warn('Invalid or expired activation token', { token });
    throw Object.assign(new Error(ERROR_MESSAGES.INVALID_TOKEN), {
      status: 400,
    });
  }

  await prisma.user.update({
    where: { id: activationToken.userId },
    data: { isActive: true },
  });

  await prisma.activationToken.delete({ where: { token } });
  logger.info('Account activated', { userId: activationToken.userId });
  return { message: 'Account activated successfully' };
};

// Resend activation email
export const resendActivation = async email => {
  const user = await prisma.user.findUnique({
    where: { email },
  });

  if (!user) {
    logger.warn('User not found for activation resend', { email });
    throw Object.assign(new Error(ERROR_MESSAGES.USER_NOT_FOUND), {
      status: 404,
    });
  }

  if (user.isActive) {
    logger.warn('Account already active', { email });
    throw Object.assign(new Error(ERROR_MESSAGES.ACCOUNT_ALREADY_ACTIVE), {
      status: 400,
    });
  }

  // Delete all existing activation tokens
  await prisma.activationToken.deleteMany({
    where: { userId: user.id },
  });

  // Create new token
  const token = uuidv4();
  await prisma.activationToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.ACTIVATION_TOKEN_EXPIRY),
    },
  });

  await sendActivationEmail(user, token);
  logger.info('Activation email resent', { userId: user.id, email });
  return { message: 'Activation email resent successfully' };
};

// Request password reset
export const forgotPassword = async email => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    logger.warn('User not found', { email });
    throw Object.assign(new Error(ERROR_MESSAGES.USER_NOT_FOUND), {
      status: 404,
    });
  }

  const token = uuidv4();
  await prisma.passwordResetToken.create({
    data: {
      token,
      userId: user.id,
      expiresAt: new Date(
        Date.now() + AUTH_CONSTANTS.PASSWORD_RESET_TOKEN_EXPIRY
      ),
    },
  });

  await sendPasswordResetEmail(user, token);
  logger.info('Password reset email sent', { userId: user.id, email });
  return { message: 'Password reset link sent to your email' };
};

// Reset password
export const resetPassword = async (token, password) => {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    logger.warn('Invalid or expired reset token', { token });
    throw Object.assign(new Error(ERROR_MESSAGES.INVALID_TOKEN), {
      status: 400,
    });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.delete({ where: { token } });
  logger.info('Password reset successful', { userId: resetToken.userId });
  return { message: 'Password reset successfully' };
};

// Logout user
export const logoutUser = async refreshToken => {
  if (refreshToken) {
    await invalidateRefreshToken(refreshToken);
  }
  logger.info('User logged out');
  return { message: 'Logged out successfully' };
};

// Refresh JWT
export const refreshToken = async refreshToken => {
  if (!refreshToken) {
    logger.warn('No refresh token provided');
    throw Object.assign(new Error(ERROR_MESSAGES?.INVALID_TOKEN), {
      status: 401,
    });
  }

  const tokenData = await verifyRefreshToken(refreshToken);
  if (!tokenData) {
    logger.warn('Invalid or expired refresh token', { refreshToken });
    throw Object.assign(new Error(ERROR_MESSAGES?.INVALID_TOKEN), {
      status: 401,
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: tokenData.userId },
  });

  if (!user) {
    logger.warn('User not found for refresh token', {
      userId: tokenData.userId,
    });
    throw Object.assign(new Error(ERROR_MESSAGES?.USER_NOT_FOUND), {
      status: 404,
    });
  }

  const token = generateJwtToken(user);
  const newRefreshToken = await generateRefreshToken(user); // Generate a new refresh token
  logger.info('New JWT and refresh token generated', { userId: user.id });
  return {
    token,
    refreshToken: newRefreshToken,
    user: { id: user.id, username: user.username, email: user.email },
  };
};
