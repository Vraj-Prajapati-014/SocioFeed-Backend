import logger from '../config/logger.js';
import { CHAT_CONSTANTS } from '../constants/chatConstants.js';
import * as chatService from '../services/chatService.js';

export const getConversations = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const page = parseInt(req.query.page) || CHAT_CONSTANTS.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || CHAT_CONSTANTS.DEFAULT_LIMIT;

    const { conversations, totalConversations } =
      await chatService.getConversations(userId, page, limit);

    logger.info('Conversations fetched', { userId, page, limit });

    res.json({
      data: conversations,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalConversations / limit),
        totalItems: totalConversations,
        hasNextPage: page * limit < totalConversations,
        hasPrevPage: page > 1,
        limit,
      },
    });
  } catch (error) {
    logger.error('Error fetching conversations', {
      userId: req.user.id,
      error: error.message,
    });
    next(error);
  }
};

export const getMessages = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const otherUserId = req.params.userId;
    const page = parseInt(req.query.page) || CHAT_CONSTANTS.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || CHAT_CONSTANTS.DEFAULT_LIMIT;

    const { messages, totalMessages } = await chatService.getMessages(
      userId,
      otherUserId,
      page,
      limit
    );

    logger.info('Messages fetched', { userId, otherUserId, page, limit });

    res.json({
      data: messages,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalMessages / limit),
        totalItems: totalMessages,
        hasNextPage: page * limit < totalMessages,
        hasPrevPage: page > 1,
        limit,
      },
    });
  } catch (error) {
    logger.error('Error fetching messages', {
      userId: req.user.id,
      otherUserId: req.params.userId,
      error: error.message,
    });
    next(error);
  }
};

export const createMessage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const receiverId = req.params.userId;
    const { content } = req.body;

    const message = await chatService.createMessage(
      userId,
      receiverId,
      content
    );

    // Emit WebSocket event (assuming io is available globally or passed via app)
    const io = req.app.get('io');
    io.to(userId).emit('message', message);
    io.to(receiverId).emit('message', message);

    logger.info('Message created via REST', {
      messageId: message.id,
      userId,
      receiverId,
    });

    res.status(201).json({ data: message });
  } catch (error) {
    logger.error('Error creating message', {
      userId: req.user.id,
      receiverId: req.params.userId,
      error: error.message,
    });
    next(error);
  }
};

export const deleteMessage = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const messageId = req.params.messageId;

    const message = await chatService.deleteMessage(userId, messageId);

    // Emit WebSocket event to notify both users
    const io = req.app.get('io');
    io.to(userId).emit('messageDeleted', { messageId });
    io.to(message.receiver.id).emit('messageDeleted', { messageId });

    logger.info('Message deleted', { messageId, userId });

    res.status(200).json({ message: 'Message deleted successfully' });
  } catch (error) {
    logger.error('Error deleting message', {
      userId: req.user.id,
      messageId: req.params.messageId,
      error: error.message,
    });
    next(error);
  }
};
