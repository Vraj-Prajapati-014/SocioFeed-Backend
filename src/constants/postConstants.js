const POSTS_BASE_URL = '/posts';
const POSTS_HOME_FEED = '/';
const POSTS_BY_ID = '/:postId';
const POSTS_CREATE = '/';
const POSTS_LIKE = '/:postId/like';
const POSTS_UNLIKE = '/:postId/like';
const POSTS_COMMENTS = '/:postId/comments';
const POSTS_COMMENTS_EDIT = '/comments/:commentId';
const POSTS_COMMENTS_DELETE = '/comments/:commentId';
const POSTS_SAVE = '/:postId/save';
const POSTS_UNSAVE = '/:postId/save';
const POSTS_SAVED = '/saved';

// Error messages
const ERROR_POST_NOT_FOUND = 'Post not found';
const ERROR_ALREADY_LIKED = 'You have already liked this post';
const ERROR_NOT_LIKED = 'You have not liked this post';
const ERROR_COMMENT_NOT_FOUND = 'Comment not found';
const ERROR_UNAUTHORIZED_COMMENT_EDIT =
  'You are not authorized to edit this comment';
const ERROR_UNAUTHORIZED_COMMENT_DELETE =
  'You are not authorized to delete this comment';
const ERROR_ALREADY_SAVED = 'You have already saved this post';
const ERROR_NOT_SAVED = 'You have not saved this post';
const ERROR_INVALID_POST_CONTENT = 'Invalid post content';
const ERROR_INVALID_COMMENT_CONTENT = 'Invalid comment content';
const ERROR_TOO_MANY_IMAGES = 'Too many images uploaded';

// Post constraints
const MAX_IMAGES_PER_POST = 4;
const MAX_CONTENT_LENGTH = 5000;
const MAX_COMMENT_LENGTH = 1000;

// Pagination defaults (aligned with your profile constants)
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

// Activity types
const ACTIVITY_TYPE_CREATE_POST = 'CREATE_POST';
const ACTIVITY_TYPE_LIKE_POST = 'LIKE_POST';
const ACTIVITY_TYPE_CREATE_COMMENT = 'CREATE_COMMENT';

export const POSTS_CONSTANTS = {
  POSTS_BASE_URL,
  POSTS_HOME_FEED,
  POSTS_BY_ID,
  POSTS_CREATE,
  POSTS_LIKE,
  POSTS_UNLIKE,
  POSTS_COMMENTS,
  POSTS_COMMENTS_EDIT,
  POSTS_COMMENTS_DELETE,
  POSTS_SAVE,
  POSTS_UNSAVE,
  POSTS_SAVED,
  ERROR_POST_NOT_FOUND,
  ERROR_ALREADY_LIKED,
  ERROR_NOT_LIKED,
  ERROR_COMMENT_NOT_FOUND,
  ERROR_UNAUTHORIZED_COMMENT_EDIT,
  ERROR_UNAUTHORIZED_COMMENT_DELETE,
  ERROR_ALREADY_SAVED,
  ERROR_NOT_SAVED,
  ERROR_INVALID_POST_CONTENT,
  ERROR_INVALID_COMMENT_CONTENT,
  ERROR_TOO_MANY_IMAGES,
  MAX_IMAGES_PER_POST,
  MAX_CONTENT_LENGTH,
  MAX_COMMENT_LENGTH,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
  ACTIVITY_TYPE_CREATE_POST,
  ACTIVITY_TYPE_LIKE_POST,
  ACTIVITY_TYPE_CREATE_COMMENT,
};
