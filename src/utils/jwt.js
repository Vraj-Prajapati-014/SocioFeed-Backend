import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import env from '../config/env.js';
import { AUTH_CONSTANTS } from '../constants/auth.js';
import logger from '../config/logger.js';

export const generateJwtToken = user => {
  try {
    return jwt.sign({ id: user.id }, env.JWT_SECRET, {
      expiresIn: AUTH_CONSTANTS.JWT_TOKEN_EXPIRY,
    });
  } catch (error) {
    logger.error('Failed to generate JWT', {
      userId: user.id,
      error: error.message,
    });
    throw new Error('Failed to generate JWT');
  }
};

export const generateRefreshToken = async user => {
  const refreshToken = uuidv4();
  const expiresAt = new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY);

  try {
    await prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId: user.id,
        expiresAt,
      },
    });
    logger.info('Refresh token generated', { userId: user.id });
    return refreshToken;
  } catch (error) {
    logger.error('Failed to generate refresh token', {
      userId: user.id,
      error: error.message,
    });
    throw new Error('Failed to generate refresh token');
  }
};

export const verifyJwtToken = token => {
  try {
    return jwt.verify(token, env.JWT_SECRET);
  } catch (error) {
    logger.error('JWT verification failed', { error: error.message });
    throw new Error('Invalid JWT token');
  }
};

export const verifyRefreshToken = async token => {
  try {
    const refreshToken = await prisma.refreshToken.findUnique({
      where: { token },
      include: { user: true },
    });
    if (!refreshToken || refreshToken.expiresAt < new Date()) {
      logger.warn('Invalid or expired refresh token', { token });
      return null;
    }
    return refreshToken;
  } catch (error) {
    logger.error('Failed to verify refresh token', { error: error.message });
    return null;
  }
};

export const invalidateRefreshToken = async token => {
  try {
    await prisma.refreshToken.delete({ where: { token } });
    logger.info('Refresh token invalidated', { token });
  } catch (error) {
    logger.error('Failed to invalidate refresh token', {
      error: error.message,
    });
    throw new Error('Failed to invalidate refresh token');
  }
};
