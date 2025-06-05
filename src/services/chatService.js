import prisma from '../config/database.js';
import { CHAT_CONSTANTS } from '../constants/chatConstants.js';

export const getConversations = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  // Fetch messages involving the user
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    select: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
      receiver: { select: { id: true, username: true, avatarUrl: true } },
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
    distinct: ['senderId', 'receiverId'],
    skip,
    take: limit,
  });

  // Extract unique conversation partners
  const conversations = [];
  const seenUserIds = new Set([userId]);

  for (const msg of messages) {
    const otherUser = msg.sender.id === userId ? msg.receiver : msg.sender;
    if (!seenUserIds.has(otherUser.id)) {
      seenUserIds.add(otherUser.id);
      conversations.push({
        user: otherUser,
        lastMessageAt: msg.createdAt,
      });
    }
  }

  // Count total conversations
  const totalConversations = await prisma.message.count({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    distinct: ['senderId', 'receiverId'],
  });

  return { conversations, totalConversations };
};

export const getMessages = async (userId, otherUserId, page, limit) => {
  const skip = (page - 1) * limit;

  // Validate other user exists
  const otherUser = await prisma.user.findUnique({
    where: { id: otherUserId },
  });
  if (!otherUser) {
    throw Object.assign(new Error(CHAT_CONSTANTS.ERROR_USER_NOT_FOUND), {
      status: 404,
    });
  }

  // Fetch messages
  const messages = await prisma.message.findMany({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
      receiver: { select: { id: true, username: true, avatarUrl: true } },
    },
    orderBy: { createdAt: 'asc' },
    skip,
    take: limit,
  });

  // Count total messages
  const totalMessages = await prisma.message.count({
    where: {
      OR: [
        { senderId: userId, receiverId: otherUserId },
        { senderId: otherUserId, receiverId: userId },
      ],
    },
  });

  return { messages, totalMessages };
};

export const createMessage = async (userId, receiverId, content) => {
  if (userId === receiverId) {
    throw Object.assign(new Error(CHAT_CONSTANTS.ERROR_CANNOT_MESSAGE_SELF), {
      status: 400,
    });
  }

  // Validate receiver exists
  const receiver = await prisma.user.findUnique({ where: { id: receiverId } });
  if (!receiver) {
    throw Object.assign(new Error(CHAT_CONSTANTS.ERROR_USER_NOT_FOUND), {
      status: 404,
    });
  }

  // Validate content
  if (
    !content ||
    content.trim().length === 0 ||
    content.length > CHAT_CONSTANTS.MAX_MESSAGE_LENGTH
  ) {
    throw Object.assign(
      new Error(CHAT_CONSTANTS.ERROR_INVALID_MESSAGE_CONTENT),
      { status: 400 }
    );
  }

  // Create message
  return prisma.message.create({
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
};
