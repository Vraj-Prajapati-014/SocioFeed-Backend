import { body, query } from 'express-validator';
import { POSTS_CONSTANTS } from '../constants/postConstants.js';

// Validation schema for creating a post
export const createPostSchema = [
  body('content')
    .isLength({ max: POSTS_CONSTANTS.MAX_CONTENT_LENGTH })
    .withMessage(
      `Post content must be at most ${POSTS_CONSTANTS.MAX_CONTENT_LENGTH} characters`
    )
    .notEmpty()
    .withMessage(POSTS_CONSTANTS.ERROR_INVALID_POST_CONTENT)
    .trim(),
];

// Validation schema for creating/editing a comment
export const commentSchema = [
  body('content')
    .isLength({ max: POSTS_CONSTANTS.MAX_COMMENT_LENGTH })
    .withMessage(
      `Comment must be at most ${POSTS_CONSTANTS.MAX_COMMENT_LENGTH} characters`
    )
    .notEmpty()
    .withMessage(POSTS_CONSTANTS.ERROR_INVALID_COMMENT_CONTENT)
    .trim(),
];

// Pagination schema (aligned with your existing pattern)
export const paginationSchema = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer')
    .toInt(),
  query('limit')
    .optional()
    .isInt({ min: 1, max: POSTS_CONSTANTS.MAX_LIMIT })
    .withMessage(`Limit must be between 1 and ${POSTS_CONSTANTS.MAX_LIMIT}`)
    .toInt(),
];
