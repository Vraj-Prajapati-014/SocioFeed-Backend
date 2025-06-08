import express from 'express';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  getConversations,
  getMessages,
  createMessage,
  deleteMessage,
} from '../controllers/chatController.js';
import { CHAT_CONSTANTS } from '../constants/chatConstants.js';
import {
  conversationSchema,
  messageSchema,
  deleteMessageSchema,
} from '../utils/validators.js';

const router = express.Router();

router.get(
  CHAT_CONSTANTS.CHAT_CONVERSATIONS,
  authMiddleware,
  validate(conversationSchema),
  getConversations
);

router.get(
  CHAT_CONSTANTS.CHAT_MESSAGES,
  authMiddleware,
  validate(conversationSchema),
  getMessages
);

router.post(
  CHAT_CONSTANTS.CHAT_MESSAGE_CREATE + '/:userId',
  authMiddleware,
  validate(messageSchema),
  createMessage
);

router.delete(
  CHAT_CONSTANTS.CHAT_MESSAGE_DELETE,
  authMiddleware,
  validate(deleteMessageSchema),
  deleteMessage
);

export default router;
