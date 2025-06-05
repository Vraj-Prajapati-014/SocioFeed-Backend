const PROFILE_BASE_URL = '/profile';
const PROFILE_BY_USERNAME = '/:id';
const PROFILE_UPDATE_INFO = '/update-info';
const PROFILE_UPDATE_AVATAR = '/update-avatar';
const PROFILE_FOLLOW = '/follow/:userId';
const PROFILE_UNFOLLOW = '/unfollow/:userId';
const PROFILE_FOLLOWERS = '/:id/followers';
const PROFILE_FOLLOWING = '/:id/following';
const PROFILE_SEARCH = '/search';

// Error messages
const ERROR_PROFILE_NOT_FOUND = 'Profile not found';
const ERROR_UNAUTHORIZED_EDIT = 'You are not authorized to edit this profile';
const ERROR_ALREADY_FOLLOWING = 'You are already following this user';
const ERROR_NOT_FOLLOWING = 'You are not following this user';
const ERROR_CANNOT_FOLLOW_SELF = 'You cannot follow yourself';
const ERROR_USER_NOT_FOUND = 'User not found';
const ERROR_INVALID_SEARCH_QUERY = 'Invalid search query';

// Validation
const MAX_USERNAME_LENGTH = 50;
const MAX_BIO_LENGTH = 500;

// Pagination defaults
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export const PROFILE_CONSTANTS = {
  PROFILE_BASE_URL,
  PROFILE_BY_USERNAME,
  PROFILE_UPDATE_INFO,
  PROFILE_UPDATE_AVATAR,
  PROFILE_FOLLOW,
  PROFILE_UNFOLLOW,
  PROFILE_FOLLOWERS,
  PROFILE_FOLLOWING,
  PROFILE_SEARCH,
  ERROR_PROFILE_NOT_FOUND,
  ERROR_UNAUTHORIZED_EDIT,
  ERROR_ALREADY_FOLLOWING,
  ERROR_NOT_FOLLOWING,
  ERROR_CANNOT_FOLLOW_SELF,
  ERROR_USER_NOT_FOUND,
  ERROR_INVALID_SEARCH_QUERY,
  MAX_USERNAME_LENGTH,
  MAX_BIO_LENGTH,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
