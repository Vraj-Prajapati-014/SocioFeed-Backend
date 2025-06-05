import { Server } from 'socket.io';
import { verifyJwtToken } from '../utils/jwt.js';
import logger from './logger.js';
import env from './env.js';
import { CHAT_CONSTANTS } from '../constants/chatConstants.js';
import prisma from './database.js';

const initializeSocket = server => {
  const io = new Server(server, {
    path: env.SOCKET_PATH,
    cors: {
      origin: env.APP_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Map to store userId to socketId
  const userSockets = new Map();

  // Middleware for authentication
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        logger.warn('No token provided for WebSocket connection');
        return next(new Error(CHAT_CONSTANTS.ERROR_WEBSOCKET_AUTH_FAILED));
      }
      const decoded = verifyJwtToken(token);
      socket.user = { id: decoded.id };
      next();
    } catch (error) {
      logger.error('WebSocket authentication failed', { error: error.message });
      next(new Error(CHAT_CONSTANTS.ERROR_WEBSOCKET_AUTH_FAILED));
    }
  });

  io.on('connection', socket => {
    const userId = socket.user.id;
    logger.info('User connected via WebSocket', {
      userId,
      socketId: socket.id,
    });

    // Store userId to socketId mapping
    userSockets.set(userId, socket.id);

    // Join a room based on userId
    socket.join(userId);

    // Handle sending a message
    socket.on('sendMessage', async ({ receiverId, content }) => {
      try {
        if (!receiverId || !content) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_INVALID_MESSAGE_CONTENT,
          });
          return;
        }

        if (userId === receiverId) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_CANNOT_MESSAGE_SELF,
          });
          return;
        }

        // Validate receiver exists
        const receiver = await prisma.user.findUnique({
          where: { id: receiverId },
        });
        if (!receiver) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_USER_NOT_FOUND,
          });
          return;
        }

        // Validate content length
        if (
          content.length > CHAT_CONSTANTS.MAX_MESSAGE_LENGTH ||
          content.trim() === ''
        ) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_INVALID_MESSAGE_CONTENT,
          });
          return;
        }

        // Create message in database
        const message = await prisma.message.create({
          data: {
            content: content.trim(),
            senderId: userId,
            receiverId,
          },
          include: {
            sender: { select: { id: true, username: true, avatarUrl: true } },
            receiver: { select: { id: true, username: true, avatarUrl: true } },
          },
        });

        // Emit message to sender and receiver
        socket.emit('message', message);
        const receiverSocketId = userSockets.get(receiverId);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('message', message);
        }

        logger.info('Message sent', {
          messageId: message.id,
          senderId: userId,
          receiverId,
        });
      } catch (error) {
        logger.error('Error sending message', { userId, error: error.message });
        socket.emit('error', {
          message: error.message || 'Failed to send message',
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      userSockets.delete(userId);
      logger.info('User disconnected from WebSocket', {
        userId,
        socketId: socket.id,
      });
    });
  });

  return io;
};

export default initializeSocket;
