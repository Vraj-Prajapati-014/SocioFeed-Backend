import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { PROFILE_CONSTANTS } from '../constants/profileConstants.js';
import { cloudinary } from '../config/cloudinary.js';

export const getProfileByUsername = async (username, requestingUserId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        username: true,
        bio: true,
        avatarUrl: true,
        createdAt: true,
        posts: {
          select: {
            id: true,
            content: true,
            createdAt: true,
            images: { select: { imageUrl: true } },
            likes: { select: { userId: true } },
            comments: { select: { id: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        followers: { select: { followerId: true } },
        following: { select: { followingId: true } },
        _count: {
          select: { followers: true, following: true, posts: true },
        },
      },
    });

    if (!user) {
      logger.warn('Profile not found', { username });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_PROFILE_NOT_FOUND),
        { status: 404 }
      );
    }

    const isFollowing = user.followers.some(
      follow => follow.followerId === requestingUserId
    );

    return {
      ...user,
      isFollowing,
      followersCount: user._count.followers,
      followingCount: user._count.following,
      postsCount: user._count.posts,
    };
  } catch (error) {
    logger.error('Failed to fetch profile', { username, error: error.message });
    throw error;
  }
};

export const updateUserInfo = async (userId, { username, bio }) => {
  try {
    const data = {};
    if (username) data.username = username;
    if (bio !== undefined) data.bio = bio;

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data,
      select: {
        id: true,
        username: true,
        bio: true,
      },
    });

    logger.info('User info updated', { userId });
    return { message: 'User info updated successfully', user: updatedUser };
  } catch (error) {
    if (error.code === 'P2002') {
      logger.warn('Username already exists', { username });
      throw Object.assign(new Error('Username already exists'), {
        status: 400,
      });
    }
    logger.error('Failed to update user info', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

export const updateUserAvatar = async (userId, file) => {
  try {
    if (!file) {
      logger.warn('No file provided for avatar upload', { userId });
      throw Object.assign(new Error('No file provided'), { status: 400 });
    }

    // Upload the file to Cloudinary using a buffer
    const uploadResult = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'profile-pics',
          upload_preset: process.env.CLOUDINARY_UPLOAD_PRESET,
          resource_type: 'image',
        },
        (error, result) => {
          if (error) {
            logger.error('Cloudinary upload failed', { error: error.message });
            return reject(error);
          }
          resolve(result);
        }
      );
      uploadStream.end(file.buffer);
    });

    const avatarUrl = uploadResult.secure_url;
    logger.info('Avatar uploaded to Cloudinary', { userId, avatarUrl });

    // Update the user's avatarUrl in the database
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: { avatarUrl },
      select: {
        id: true,
        avatarUrl: true,
      },
    });

    logger.info('User avatar updated', { userId });
    return { message: 'Avatar updated successfully', user: updatedUser };
  } catch (error) {
    logger.error('Failed to update user avatar', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

export const followUser = async (followerId, followingId) => {
  try {
    if (followerId === followingId) {
      logger.warn('User attempted to follow self', { userId: followerId });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_CANNOT_FOLLOW_SELF),
        { status: 400 }
      );
    }

    const followingUser = await prisma.user.findUnique({
      where: { id: followingId },
    });

    if (!followingUser) {
      logger.warn('User to follow not found', { followingId });
      throw Object.assign(new Error(PROFILE_CONSTANTS.ERROR_USER_NOT_FOUND), {
        status: 404,
      });
    }

    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (existingFollow) {
      logger.warn('User already following', { followerId, followingId });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_ALREADY_FOLLOWING),
        { status: 400 }
      );
    }

    await prisma.follow.create({
      data: {
        followerId,
        followingId,
      },
    });

    const updatedCounts = await prisma.user.findUnique({
      where: { id: followingId },
      select: {
        _count: {
          select: { followers: true, following: true },
        },
      },
    });

    logger.info('User followed', { followerId, followingId });
    return {
      message: 'Followed successfully',
      followersCount: updatedCounts._count.followers,
      followingCount: updatedCounts._count.following,
    };
  } catch (error) {
    logger.error('Failed to follow user', {
      followerId,
      followingId,
      error: error.message,
    });
    throw error;
  }
};

export const unfollowUser = async (followerId, followingId) => {
  try {
    const existingFollow = await prisma.follow.findUnique({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    if (!existingFollow) {
      logger.warn('User not following', { followerId, followingId });
      throw Object.assign(new Error(PROFILE_CONSTANTS.ERROR_NOT_FOLLOWING), {
        status: 400,
      });
    }

    await prisma.follow.delete({
      where: {
        followerId_followingId: { followerId, followingId },
      },
    });

    const updatedCounts = await prisma.user.findUnique({
      where: { id: followingId },
      select: {
        _count: {
          select: { followers: true, following: true },
        },
      },
    });

    logger.info('User unfollowed', { followerId, followingId });
    return {
      message: 'Unfollowed successfully',
      followersCount: updatedCounts._count.followers,
      followingCount: updatedCounts._count.following,
    };
  } catch (error) {
    logger.error('Failed to unfollow user', {
      followerId,
      followingId,
      error: error.message,
    });
    throw error;
  }
};
export const getFollowers = async (username, page, limit) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        // Fetch users this user follows (user is followingId)
        following: {
          select: {
            follower: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
        },
        _count: {
          select: { following: true }, // Count of users this user follows
        },
      },
    });

    if (!user) {
      logger.warn('Profile not found for followers', { username });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_PROFILE_NOT_FOUND),
        { status: 404 }
      );
    }

    const followers = user.following.map(follow => follow.follower);

    logger.debug('Fetched followers data', { username, followers });

    return {
      followers,
      pagination: {
        total: user._count.following,
        page,
        limit,
        totalPages: Math.ceil(user._count.following / limit),
      },
    };
  } catch (error) {
    logger.error('Failed to fetch followers', {
      username,
      page,
      limit,
      error: error.message,
    });
    throw error;
  }
};

export const getFollowing = async (username, page, limit) => {
  try {
    const user = await prisma.user.findUnique({
      where: { username },
      select: {
        id: true,
        // Fetch users who follow this user (user is followerId)
        followers: {
          select: {
            following: {
              select: {
                id: true,
                username: true,
                avatarUrl: true,
              },
            },
          },
          skip: (page - 1) * limit,
          take: limit,
        },
        _count: {
          select: { followers: true }, // Count of users who follow this user
        },
      },
    });

    if (!user) {
      logger.warn('Profile not found for following', { username });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_PROFILE_NOT_FOUND),
        { status: 404 }
      );
    }

    const following = user.followers.map(follow => follow.following);

    logger.debug('Fetched following data', { username, following });

    return {
      following,
      pagination: {
        total: user._count.followers,
        page,
        limit,
        totalPages: Math.ceil(user._count.followers / limit),
      },
    };
  } catch (error) {
    logger.error('Failed to fetch following', {
      username,
      page,
      limit,
      error: error.message,
    });
    throw error;
  }
};

export const searchUsers = async (query, requestingUserId, page, limit) => {
  try {
    const trimmedQuery = query.trim();

    if (!trimmedQuery || trimmedQuery.length < 1) {
      logger.warn('Invalid search query', { query: trimmedQuery });
      throw Object.assign(new Error('Invalid search query'), { status: 400 });
    }

    // Debug: Fetch all active users to see what data we're working with
    const allUsers = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, username: true, bio: true, isActive: true },
    });
    logger.debug('All active users for search', {
      allUsers,
      query: trimmedQuery,
    });

    const users = await prisma.user.findMany({
      where: {
        OR: [
          // Trim the username in the query to handle spaces
          {
            username: {
              contains: trimmedQuery,
              mode: 'insensitive',
            },
          },
          // Trim the bio in the query to handle spaces
          {
            bio: {
              contains: trimmedQuery,
              mode: 'insensitive',
            },
          },
        ],
        isActive: true,
      },
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        following: { select: { followerId: true } },
      },
      skip: (page - 1) * limit,
      take: limit,
    });

    const total = await prisma.user.count({
      where: {
        OR: [
          {
            username: {
              contains: trimmedQuery,
              mode: 'insensitive',
            },
          },
          {
            bio: {
              contains: trimmedQuery,
              mode: 'insensitive',
            },
          },
        ],
        isActive: true,
      },
    });

    const usersWithFollowStatus = users.map(user => ({
      ...user,
      isFollowing: user.following.some(
        follow => follow.followerId === requestingUserId
      ),
    }));

    logger.info('User search completed', {
      query: trimmedQuery,
      resultCount: users.length,
      page,
      limit,
      results: usersWithFollowStatus,
    });
    return {
      users: usersWithFollowStatus,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  } catch (error) {
    logger.error('Failed to search users', { query, error: error.message });
    throw error;
  }
};
