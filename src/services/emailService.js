import nodemailer from 'nodemailer';
import env from '../config/env.js';
import logger from '../config/logger.js';
import { generateEmailTemplate } from '../utils/emailTemplate.js';
import { EMAIL_CONSTANTS } from '../constants/email.js';

const transporter = nodemailer.createTransport({
  host: env.EMAIL_HOST,
  port: env.EMAIL_PORT,
  secure: env.EMAIL_PORT === 465, // True for port 465, false for 587
  auth: {
    user: env.EMAIL_USER,
    pass: env.EMAIL_PASS,
  },
});

const sendEmail = async (to, subject, html, userId = 'unknown') => {
  const mailOptions = {
    from: env.EMAIL_USER,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    logger.info('Email sent', { to, subject, userId });
  } catch (error) {
    logger.error('Email sending failed', {
      to,
      subject,
      userId,
      error: error.message,
    });
    throw error;
  }
};

// 📩 Activation Email
export const sendActivationEmail = async (user, token) => {
  const activationUrl = `${env.APP_URL}/activate/${token}`;
  const html = generateEmailTemplate({
    title: EMAIL_CONSTANTS.ACTIVATION.TITLE,
    message: EMAIL_CONSTANTS.ACTIVATION.MESSAGE,
    actionUrl: activationUrl,
    actionText: EMAIL_CONSTANTS.ACTIVATION.ACTION_TEXT,
    footer: EMAIL_CONSTANTS.ACTIVATION.FOOTER,
  });

  await sendEmail(
    user.email,
    EMAIL_CONSTANTS.ACTIVATION.SUBJECT,
    html,
    user.id
  );
};

// 🔑 Password Reset Email
export const sendPasswordResetEmail = async (user, token) => {
  const resetUrl = `${env.APP_URL}/reset-password/${token}`;
  const html = generateEmailTemplate({
    title: EMAIL_CONSTANTS.RESET.TITLE,
    message: EMAIL_CONSTANTS.RESET.MESSAGE,
    actionUrl: resetUrl,
    actionText: EMAIL_CONSTANTS.RESET.ACTION_TEXT,
    footer: EMAIL_CONSTANTS.RESET.FOOTER,
  });

  await sendEmail(user.email, EMAIL_CONSTANTS.RESET.SUBJECT, html, user.id);
};
