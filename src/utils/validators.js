import { body, query, param } from 'express-validator';
import { AUTH_CONSTANTS } from '../constants/auth.js';
import { PROFILE_CONSTANTS } from '../constants/profileConstants.js';
import { CHAT_CONSTANTS } from '../constants/chatConstants.js';

export const registerSchema = [
  body('username')
    .matches(AUTH_CONSTANTS.REGEX_USERNAME)
    .withMessage('Username must be alphanumeric')
    .isLength({ max: 50 })
    .withMessage('Username must be at most 50 characters')
    .notEmpty()
    .withMessage('Username is required')
    .trim(),
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .notEmpty()
    .withMessage('Email is required')
    .normalizeEmail(),
  body('password')
    .isLength({ min: AUTH_CONSTANTS.MIN_PASSWORD_LENGTH })
    .withMessage('Password must be at least 8 characters')
    .matches(AUTH_CONSTANTS.REGEX_PASSWORD)
    .withMessage(
      'Password must include uppercase, lowercase, number, and special character (@#$%^&*!#)'
    )
    .notEmpty()
    .withMessage('Password is required'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords must match')
    .notEmpty()
    .withMessage('Confirm password is required'),
];

export const loginSchema = [
  body('usernameOrEmail')
    .notEmpty()
    .withMessage('Username or email is required')
    .trim(),
  body('password').notEmpty().withMessage('Password is required'),
];

export const forgotPasswordSchema = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .notEmpty()
    .withMessage('Email is required')
    .normalizeEmail(),
];

export const resetPasswordSchema = [
  body('password')
    .isLength({ min: AUTH_CONSTANTS.MIN_PASSWORD_LENGTH })
    .withMessage('Password must be at least 8 characters')
    .matches(AUTH_CONSTANTS.REGEX_PASSWORD)
    .withMessage(
      'Password must include uppercase, lowercase, number, and special character (@#$%^&*!#)'
    )
    .notEmpty()
    .withMessage('Password is required'),
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('Passwords must match')
    .notEmpty()
    .withMessage('Confirm password is required'),
];

export const resendActivationSchema = [
  body('email')
    .isEmail()
    .withMessage('Invalid email format')
    .notEmpty()
    .withMessage('Email is required')
    .normalizeEmail(),
];

export const updateInfoSchema = [
  body('username')
    .optional()
    .isLength({ max: PROFILE_CONSTANTS.MAX_USERNAME_LENGTH })
    .withMessage(
      `Username must be at most ${PROFILE_CONSTANTS.MAX_USERNAME_LENGTH} characters`
    )
    .trim(),
  body('bio')
    .optional()
    .isLength({ max: PROFILE_CONSTANTS.MAX_BIO_LENGTH })
    .withMessage(
      `Bio must be at most ${PROFILE_CONSTANTS.MAX_BIO_LENGTH} characters`
    ),
];

export const updateAvatarSchema = [
  body('avatarUrl').optional().isURL().withMessage('Invalid URL'),
];

export const paginationSchema = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: PROFILE_CONSTANTS.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${PROFILE_CONSTANTS.MAX_LIMIT}`)
    .toInt(),
];

export const searchSchema = [
  query('query')
    .isLength({ min: 1 })
    .withMessage('Search query is required')
    .isLength({ max: 100 })
    .withMessage('Search query must be at most 100 characters')
    .notEmpty()
    .withMessage('Search query is required')
    .trim(),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: PROFILE_CONSTANTS.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${PROFILE_CONSTANTS.MAX_LIMIT}`)
    .toInt(),
];

export const messageSchema = [
  body('content')
    .isLength({ min: 1, max: CHAT_CONSTANTS.MAX_MESSAGE_LENGTH })
    .withMessage(
      `Message must be between 1 and ${CHAT_CONSTANTS.MAX_MESSAGE_LENGTH} characters`
    )
    .notEmpty()
    .withMessage('Message content is required')
    .trim(),
  param('userId')
    .isUUID()
    .withMessage('Invalid user ID')
    .notEmpty()
    .withMessage('Receiver ID is required'),
];

export const conversationSchema = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: CHAT_CONSTANTS.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${CHAT_CONSTANTS.MAX_LIMIT}`)
    .toInt(),
];

export const deleteMessageSchema = [
  param('messageId')
    .isUUID()
    .withMessage('Invalid message ID')
    .notEmpty()
    .withMessage('Message ID is required'),
];
