import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { generateEmailTemplate } from '../utils/emailTemplate.js';

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

// 📩 Activation Email
export const sendActivationEmail = async (user, token) => {
  const activationUrl = `${env.APP_URL}/activate/${token}`;

  const html = generateEmailTemplate({
    title: 'Activate Your SocioFeed Account',
    message:
      'Thanks for signing up! Please activate your account using the button below.',
    actionUrl: activationUrl,
    actionText: 'Activate Account',
    footer:
      'This link expires in 24 hours. If you did not sign up, please ignore this email.',
  });

  const mailOptions = {
    from: env.EMAIL_USER,
    to: user.email,
    subject: 'Activate Your SocioFeed Account',
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Activation email sent to ${user.email}`);
  } catch (error) {
    logger.error(
      `Failed to send activation email to ${user.email}: ${error.message}`
    );
    throw error;
  }
};

// 🔑 Password Reset Email
export const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${env.APP_URL}/reset-password/${token}`;

  const html = generateEmailTemplate({
    title: 'Reset Your SocioFeed Password',
    message: 'Click the button below to reset your password.',
    actionUrl: resetUrl,
    actionText: 'Reset Password',
    footer:
      'This link expires in 1 hour. If you didn’t request a password reset, you can ignore this email.',
  });

  const mailOptions = {
    from: env.EMAIL_USER,
    to: user.email,
    subject: 'Reset Your SocioFeed Password',
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info(`Password reset email sent to ${user.email}`);
  } catch (error) {
    logger.error(
      `Failed to send password reset email to ${user.email}: ${error.message}`
    );
    throw error;
  }
};
