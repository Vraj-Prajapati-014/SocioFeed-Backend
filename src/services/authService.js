import prisma from '../config/database.js';
import bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';
import {
  generateJwtToken,
  generateRefreshToken,
  // verifyRefreshToken,
  invalidateRefreshToken,
} from '../utils/jwt.js';
import { sendActivationEmail, sendPasswordResetEmail } from './emailService.js';
import { AUTH_CONSTANTS } from '../constants/auth.js';
import { ERROR_MESSAGES } from '../constants/errors.js';
// import logger from '../config/logger.js';

export const registerUser = async ({ username, email, password }) => {
  const existingUser = await prisma.user.findFirst({
    where: { OR: [{ username }, { email }] },
  });

  if (existingUser) {
    if (existingUser.username === username) {
      throw new Error(ERROR_MESSAGES.USERNAME_ALREADY_EXISTS);
    }
    throw new Error(ERROR_MESSAGES.EMAIL_ALREADY_EXISTS);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await prisma.user.create({
    data: { username, email, password: hashedPassword },
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
  return {
    message:
      'Registration successful, please check your email to activate your account',
  };
};

export const loginUser = async ({ usernameOrEmail, password }) => {
  const user = await prisma.user.findFirst({
    where: { OR: [{ username: usernameOrEmail }, { email: usernameOrEmail }] },
  });

  if (!user) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
  }

  if (!user.isActive) {
    throw new Error(ERROR_MESSAGES.ACCOUNT_NOT_ACTIVE);
  }

  const isPasswordValid = await bcrypt.compare(password, user.password);
  if (!isPasswordValid) {
    throw new Error(ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  const token = generateJwtToken(user);
  const refreshToken = await generateRefreshToken(user);
  return {
    token,
    refreshToken,
    user: { id: user.id, username: user.username, email: user.email },
  };
};

export const activateAccount = async token => {
  const activationToken = await prisma.activationToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!activationToken || activationToken.expiresAt < new Date()) {
    throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
  }

  await prisma.user.update({
    where: { id: activationToken.userId },
    data: { isActive: true },
  });

  await prisma.activationToken.delete({ where: { token } });
  return { message: 'Account activated successfully' };
};

export const forgotPassword = async email => {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new Error(ERROR_MESSAGES.USER_NOT_FOUND);
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
  return { message: 'Password reset link sent to your email' };
};

export const resetPassword = async (token, password) => {
  const resetToken = await prisma.passwordResetToken.findUnique({
    where: { token },
    include: { user: true },
  });

  if (!resetToken || resetToken.expiresAt < new Date()) {
    throw new Error(ERROR_MESSAGES.INVALID_TOKEN);
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id: resetToken.userId },
    data: { password: hashedPassword },
  });

  await prisma.passwordResetToken.delete({ where: { token } });
  return { message: 'Password reset successfully' };
};

export const logoutUser = async refreshToken => {
  await invalidateRefreshToken(refreshToken);
  return { message: 'Logged out successfully' };
};
