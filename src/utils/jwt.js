import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database.js';
import env from '../config/env.js';
import { AUTH_CONSTANTS } from '../constants/auth.js';

export const generateJwtToken = user => {
  return jwt.sign({ id: user.id }, env.JWT_SECRET, {
    expiresIn: AUTH_CONSTANTS.JWT_TOKEN_EXPIRY,
  });
};

export const generateRefreshToken = async user => {
  const refreshToken = uuidv4();
  await prisma.refreshToken.create({
    data: {
      token: refreshToken,
      userId: user.id,
      expiresAt: new Date(Date.now() + AUTH_CONSTANTS.REFRESH_TOKEN_EXPIRY),
    },
  });
  return refreshToken;
};

export const verifyJwtToken = token => {
  return jwt.verify(token, env.JWT_SECRET);
};

export const verifyRefreshToken = async token => {
  const refreshToken = await prisma.refreshToken.findUnique({
    where: { token },
    include: { user: true },
  });
  if (!refreshToken || refreshToken.expiresAt < new Date()) {
    return null;
  }
  return refreshToken;
};

export const invalidateRefreshToken = async token => {
  await prisma.refreshToken.delete({ where: { token } });
};
