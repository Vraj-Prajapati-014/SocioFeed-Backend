import prisma from '../config/database.js';
import { CHAT_CONSTANTS } from '../constants/chatConstants.js';

export const getConversations = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  // Fetch messages involving the user
  const messages = await prisma.message.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      isDeleted: false,
    },
    select: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
      receiver: { select: { id: true, username: true, avatarUrl: true } },
      content: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  // Extract unique conversation partners
  const conversationsMap = new Map();
  for (const msg of messages) {
    const otherUser = msg.sender.id === userId ? msg.receiver : msg.sender;
    if (!conversationsMap.has(otherUser.id)) {
      conversationsMap.set(otherUser.id, {
        user: {
          id: otherUser.id,
          username: otherUser.username,
          avatarUrl: otherUser.avatarUrl || null,
        },
        lastMessage: msg.content,
        lastMessageAt: msg.createdAt.toISOString(),
      });
    }
  }

  const allConversations = Array.from(conversationsMap.values());
  const totalConversations = allConversations.length;

  // Apply pagination
  const conversations = allConversations.slice(skip, skip + limit);

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
      isDeleted: false,
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
      isDeleted: false,
    },
  });

  return { messages, totalMessages };
};

export const createMessage = async (userId, receiverId, content) => {
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
    throw Object.assign(new Error(CHAT_CONSTANTS.ERROR_NOT_FOLLOWING), {
      status: 403,
    });
  }

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

export const deleteMessage = async (userId, messageId) => {
  // Fetch the message
  const message = await prisma.message.findUnique({
    where: { id: messageId },
    include: {
      sender: { select: { id: true } },
      receiver: { select: { id: true } },
    },
  });

  if (!message) {
    throw Object.assign(new Error(CHAT_CONSTANTS.ERROR_MESSAGE_NOT_FOUND), {
      status: 404,
    });
  }

  // Check if the user is the sender
  if (message.sender.id !== userId) {
    throw Object.assign(new Error(CHAT_CONSTANTS.ERROR_NOT_AUTHORIZED), {
      status: 403,
    });
  }

  // Soft delete the message
  return prisma.message.update({
    where: { id: messageId },
    data: { isDeleted: true },
    include: {
      sender: { select: { id: true, username: true, avatarUrl: true } },
      receiver: { select: { id: true, username: true, avatarUrl: true } },
    },
  });
};
