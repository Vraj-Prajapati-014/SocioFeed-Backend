const CHAT_BASE_URL = '/chat';
const CHAT_CONVERSATIONS = '/conversations';
const CHAT_MESSAGES = '/messages/:userId';
const CHAT_MESSAGE_CREATE = '/messages';
const CHAT_MESSAGE_DELETE = '/messages/:messageId';

// Error messages
const ERROR_USER_NOT_FOUND = 'User not found';
const ERROR_MESSAGE_NOT_FOUND = 'Message not found';
const ERROR_INVALID_MESSAGE_CONTENT = 'Invalid message content';
const ERROR_CANNOT_MESSAGE_SELF = 'Cannot send message to yourself';
const ERROR_WEBSOCKET_AUTH_FAILED = 'WebSocket authentication failed';
const ERROR_NOT_FOLLOWING = 'You can only message users you follow';
const ERROR_NOT_AUTHORIZED = 'You are not authorized to delete this message';

// Validation
const MAX_MESSAGE_LENGTH = 2000;

// Pagination defaults
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

export const CHAT_CONSTANTS = {
  CHAT_BASE_URL,
  CHAT_CONVERSATIONS,
  CHAT_MESSAGES,
  CHAT_MESSAGE_CREATE,
  CHAT_MESSAGE_DELETE,
  ERROR_USER_NOT_FOUND,
  ERROR_MESSAGE_NOT_FOUND,
  ERROR_INVALID_MESSAGE_CONTENT,
  ERROR_CANNOT_MESSAGE_SELF,
  ERROR_WEBSOCKET_AUTH_FAILED,
  ERROR_NOT_FOLLOWING,
  ERROR_NOT_AUTHORIZED,
  MAX_MESSAGE_LENGTH,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};
