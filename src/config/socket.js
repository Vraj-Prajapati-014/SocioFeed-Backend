import { Server } from 'socket.io';
import cookie from 'cookie';
import { verifyJwtToken } from '../utils/jwt.js';
import logger from './logger.js';
import env from './env.js';
import { CHAT_CONSTANTS } from '../constants/chatConstants.js';
import prisma from './database.js';

const initializeSocket = (server, app) => {
  const io = new Server(server, {
    path: env.SOCKET_PATH,
    cors: {
      origin: env.APP_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Make io available to controllers
  app.set('io', io);

  // Map to store userId to socketId
  const userSockets = new Map();

  // Middleware for authentication using HTTP-only cookie
  io.use(async (socket, next) => {
    try {
      const cookieHeader = socket.handshake.headers.cookie;
      if (!cookieHeader) {
        logger.warn('No cookie provided for WebSocket connection');
        return next(new Error(CHAT_CONSTANTS.ERROR_WEBSOCKET_AUTH_FAILED));
      }

      const cookies = cookie.parse(cookieHeader);
      const token = cookies.jwt; // Match the cookie name 'jwt' from authController.js
      if (!token) {
        logger.warn('No JWT token found in cookie for WebSocket connection');
        return next(new Error(CHAT_CONSTANTS.ERROR_WEBSOCKET_AUTH_FAILED));
      }

      // Verify the JWT token using your utility function
      const decoded = verifyJwtToken(token);
      socket.user = { id: decoded.id };
      logger.info('WebSocket authentication successful', {
        userId: decoded.id,
      });
      next();
    } catch (error) {
      logger.error('WebSocket authentication failed', { error: error.message });
      next(new Error(CHAT_CONSTANTS.ERROR_WEBSOCKET_AUTH_FAILED));
    }
  });

  io.on('connection', async socket => {
    const userId = socket.user.id;
    logger.info('User connected via WebSocket', {
      userId,
      socketId: socket.id,
    });

    // Store userId to socketId mapping
    userSockets.set(userId, socket.id);

    // Join a room based on userId
    socket.join(userId);

    // Mark user as online and broadcast status to followers
    try {
      await prisma.user.update({
        where: { id: userId },
        data: { isOnline: true },
      });

      // Get user's followers to broadcast online status
      const followers = await prisma.follow.findMany({
        where: { followingId: userId },
        select: { followerId: true },
      });
      const followerIds = followers.map(f => f.followerId);

      // Broadcast online status to followers
      followerIds.forEach(followerId => {
        const followerSocketId = userSockets.get(followerId);
        if (followerSocketId) {
          io.to(followerSocketId).emit('userStatus', {
            userId,
            status: 'online',
          });
        }
      });
    } catch (error) {
      logger.error('Error updating user online status', {
        userId,
        error: error.message,
      });
    }

    // Handle sending a message
    socket.on('sendMessage', async ({ receiverId, content }, callback) => {
      try {
        if (!receiverId || !content) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_INVALID_MESSAGE_CONTENT,
          });
          return callback?.({
            status: 'error',
            message: CHAT_CONSTANTS.ERROR_INVALID_MESSAGE_CONTENT,
          });
        }

        if (userId === receiverId) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_CANNOT_MESSAGE_SELF,
          });
          return callback?.({
            status: 'error',
            message: CHAT_CONSTANTS.ERROR_CANNOT_MESSAGE_SELF,
          });
        }

        // Check if user follows the receiver
        const follow = await prisma.follow.findUnique({
          where: {
            followerId_followingId: {
              followerId: userId,
              followingId: receiverId,
            },
          },
        });
        if (!follow) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_NOT_FOLLOWING,
          });
          return callback?.({
            status: 'error',
            message: CHAT_CONSTANTS.ERROR_NOT_FOLLOWING,
          });
        }

        // Validate receiver exists
        const receiver = await prisma.user.findUnique({
          where: { id: receiverId },
        });
        if (!receiver) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_USER_NOT_FOUND,
          });
          return callback?.({
            status: 'error',
            message: CHAT_CONSTANTS.ERROR_USER_NOT_FOUND,
          });
        }

        // Validate content length
        if (
          content.length > CHAT_CONSTANTS.MAX_MESSAGE_LENGTH ||
          content.trim() === ''
        ) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_INVALID_MESSAGE_CONTENT,
          });
          return callback?.({
            status: 'error',
            message: CHAT_CONSTANTS.ERROR_INVALID_MESSAGE_CONTENT,
          });
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

        callback?.({ status: 'success', messageId: message.id });
      } catch (error) {
        logger.error('Error sending message', { userId, error: error.message });
        socket.emit('error', {
          message: error.message || 'Failed to send message',
        });
        callback?.({
          status: 'error',
          message: error.message || 'Failed to send message',
        });
      }
    });

    // Handle deleting a message
    socket.on('deleteMessage', async ({ messageId }, callback) => {
      try {
        const message = await prisma.message.findUnique({
          where: { id: messageId },
          include: {
            sender: { select: { id: true } },
            receiver: { select: { id: true } },
          },
        });

        if (!message) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_MESSAGE_NOT_FOUND,
          });
          return callback?.({
            status: 'error',
            message: CHAT_CONSTANTS.ERROR_MESSAGE_NOT_FOUND,
          });
        }

        if (message.sender.id !== userId) {
          socket.emit('error', {
            message: CHAT_CONSTANTS.ERROR_NOT_AUTHORIZED,
          });
          return callback?.({
            status: 'error',
            message: CHAT_CONSTANTS.ERROR_NOT_AUTHORIZED,
          });
        }

        // Soft delete the message
        await prisma.message.update({
          where: { id: messageId },
          data: { isDeleted: true },
        });

        // Emit message deletion to both users
        socket.emit('messageDeleted', { messageId });
        const receiverSocketId = userSockets.get(message.receiver.id);
        if (receiverSocketId) {
          io.to(receiverSocketId).emit('messageDeleted', { messageId });
        }

        logger.info('Message deleted via WebSocket', { messageId, userId });
        callback?.({ status: 'success', messageId });
      } catch (error) {
        logger.error('Error deleting message via WebSocket', {
          userId,
          messageId,
          error: error.message,
        });
        socket.emit('error', {
          message: error.message || 'Failed to delete message',
        });
        callback?.({
          status: 'error',
          message: error.message || 'Failed to delete message',
        });
      }
    });

    // Handle typing indicator
    socket.on('typing', ({ receiverId }) => {
      const receiverSocketId = userSockets.get(receiverId);
      if (receiverSocketId) {
        io.to(receiverSocketId).emit('typing', { senderId: userId });
      }
    });

    // Handle disconnection
    socket.on('disconnect', async () => {
      userSockets.delete(userId);
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { isOnline: false },
        });

        // Get user's followers to broadcast offline status
        const followers = await prisma.follow.findMany({
          where: { followingId: userId },
          select: { followerId: true },
        });
        const followerIds = followers.map(f => f.followerId);

        // Broadcast offline status to followers
        followerIds.forEach(followerId => {
          const followerSocketId = userSockets.get(followerId);
          if (followerSocketId) {
            io.to(followerSocketId).emit('userStatus', {
              userId,
              status: 'offline',
            });
          }
        });
      } catch (error) {
        logger.error('Error updating user offline status', {
          userId,
          error: error.message,
        });
      }
      logger.info('User disconnected from WebSocket', {
        userId,
        socketId: socket.id,
      });
    });
  });

  return io;
};

export default initializeSocket;
