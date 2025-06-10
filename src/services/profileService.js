import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { PROFILE_CONSTANTS } from '../constants/profileConstants.js';
import { cloudinary } from '../config/cloudinary.js';

export const getProfileById = async (userId, requestingUserId) => {
  try {
    logger.debug('Fetching profile', { userId, requestingUserId });

    if (!requestingUserId) {
      logger.warn('Invalid requestingUserId', { userId, requestingUserId });
      throw Object.assign(new Error('Invalid requesting user ID'), {
        status: 400,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
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
            updatedAt: true,
            userId: true,
            images: { select: { imageUrl: true, mediaType: true } },
            likes: { select: { userId: true } },
            comments: { select: { id: true } },
            savedPosts: {
              where: { userId: requestingUserId },
              select: { id: true },
            },
            _count: { select: { likes: true, comments: true } },
          },
          orderBy: { createdAt: 'desc' },
        },
        followers: { select: { following: true } },
        following: { select: { follower: true } },
        isOnline: true,
        _count: {
          select: { followers: true, following: true, posts: true },
        },
      },
    });

    if (!user) {
      logger.warn('Profile not found', { userId });
      throw Object.assign(new Error('Profile not found'), { status: 404 });
    }

    logger.debug('Raw user data', { userId, followers: user.followers });

    const followExists = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: requestingUserId,
          followingId: userId,
        },
      },
      select: { followingId: true },
    });
    const followsYou = await prisma.follow.findUnique({
      where: {
        followerId_followingId: {
          followerId: userId,
          followingId: requestingUserId,
        },
      },
    });

    const isFollowing = !!followExists;
    logger.debug('Computed isFollowing', {
      userId,
      requestingUserId,
      isFollowing,
    });

    const formattedPosts = user.posts.map(post => ({
      ...post,
      author: {
        id: user.id,
        username: user.username,
        avatarUrl: user.avatarUrl,
      },
      hasLiked: post.likes.some(like => like.userId === requestingUserId),
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isSaved: post.savedPosts.length > 0,
      likes: undefined,
      savedPosts: undefined,
      _count: undefined,
    }));

    const profile = {
      ...user,
      posts: formattedPosts,
      isFollowing,
      followersCount: user._count.following,
      followingCount: user._count.followers,
      postsCount: user._count.posts,
      followers: undefined,
      following: undefined,
      _count: undefined,
      followsYou: !!followsYou,
    };

    logger.debug('Returning profile', { userId, profile });

    return profile;
  } catch (error) {
    logger.error('Failed to fetch profile', { userId, error: error.message });
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

    // Fetch counts for the following user (target user)
    const followingUserCounts = await prisma.user.findUnique({
      where: { id: followingId },
      select: {
        _count: {
          select: { followers: true, following: true },
        },
      },
    });

    // Fetch counts for the follower user (current user)
    const followerUserCounts = await prisma.user.findUnique({
      where: { id: followerId },
      select: {
        _count: {
          select: { followers: true, following: true },
        },
      },
    });

    logger.debug('Updated counts after follow', {
      followerId,
      followingId,
      follower: {
        followersCount: followerUserCounts._count.followers,
        followingCount: followerUserCounts._count.following,
      },
      following: {
        followersCount: followingUserCounts._count.followers,
        followingCount: followingUserCounts._count.following,
      },
    });

    logger.info('User followed', { followerId, followingId });
    return {
      message: 'Followed successfully',
      followingUser: {
        id: followingId,
        followersCount: followingUserCounts._count.followers,
        followingCount: followingUserCounts._count.following,
      },
      followerUser: {
        id: followerId,
        followersCount: followerUserCounts._count.followers,
        followingCount: followerUserCounts._count.following,
      },
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

    // Fetch counts for the following user (target user)
    const followingUserCounts = await prisma.user.findUnique({
      where: { id: followingId },
      select: {
        _count: {
          select: { followers: true, following: true },
        },
      },
    });

    // Fetch counts for the follower user (current user)
    const followerUserCounts = await prisma.user.findUnique({
      where: { id: followerId },
      select: {
        _count: {
          select: { followers: true, following: true },
        },
      },
    });

    logger.debug('Updated counts after unfollow', {
      followerId,
      followingId,
      follower: {
        followersCount: followerUserCounts._count.followers,
        followingCount: followerUserCounts._count.following,
      },
      following: {
        followersCount: followingUserCounts._count.followers,
        followingCount: followingUserCounts._count.following,
      },
    });

    logger.info('User unfollowed', { followerId, followingId });
    return {
      message: 'Unfollowed successfully',
      followingUser: {
        id: followingId,
        followersCount: followingUserCounts._count.followers,
        followingCount: followingUserCounts._count.following,
      },
      followerUser: {
        id: followerId,
        followersCount: followerUserCounts._count.followers,
        followingCount: followerUserCounts._count.following,
      },
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
export const getFollowers = async (id, requestingUserId, page, limit) => {
  try {
    const parsedPage = parseInt(page, 10);
    const parsedLimit = parseInt(limit, 10);

    if (isNaN(parsedPage) || parsedPage < 1) {
      logger.warn('Invalid page value', { page });
      throw Object.assign(new Error('Page must be a positive integer'), {
        status: 400,
      });
    }

    if (isNaN(parsedLimit) || parsedLimit < 1) {
      logger.warn('Invalid limit value', { limit });
      throw Object.assign(new Error('Limit must be a positive integer'), {
        status: 400,
      });
    }

    if (!requestingUserId) {
      logger.warn('Invalid requestingUserId', { id, requestingUserId });
      throw Object.assign(new Error('Invalid requesting user ID'), {
        status: 400,
      });
    }

    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        following: {
          // Query the 'following' relation to get followers
          select: {
            follower: {
              // Select the 'follower' user (e.g., Manan for Princy)
              select: {
                id: true,
                username: true,
                avatarUrl: true,
                following: {
                  // To determine if requestingUserId follows this follower
                  select: { followerId: true },
                  where: { followerId: requestingUserId },
                },
              },
            },
          },
          skip: (parsedPage - 1) * parsedLimit,
          take: parsedLimit,
        },
        _count: {
          select: { following: true }, // Total followers = count of 'following' relation
        },
      },
    });

    if (!user) {
      logger.warn('Profile not found for followers', { id });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_PROFILE_NOT_FOUND),
        { status: 404 }
      );
    }

    const followers = user.following.map(follow => {
      const follower = follow.follower;
      return {
        ...follower,
        isFollowing: follower.following.some(
          f => f.followerId === requestingUserId
        ),
        following: undefined,
      };
    });

    logger.debug('Fetched followers data', { id, followers });

    return {
      followers,
      pagination: {
        total: user._count.following, // Use _count.following for total followers
        page: parsedPage,
        limit: parsedLimit,
        totalPages: Math.ceil(user._count.following / parsedLimit),
      },
    };
  } catch (error) {
    logger.error('Failed to fetch followers', {
      id,
      page,
      limit,
      error: error.message,
    });
    throw error;
  }
};

export const getFollowing = async (userId, page, limit) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        // Fetch users who this user follows (user is followerId)
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
          select: { followers: true }, // Count of users this user follows
        },
      },
    });

    if (!user) {
      logger.warn('Profile not found for following', { userId });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_PROFILE_NOT_FOUND),
        { status: 404 }
      );
    }

    const following = user.followers.map(follow => ({
      ...follow.following,
      isFollowing: true, // Add isFollowing: true to always show MessageButton
    }));

    logger.debug('Fetched following data', { userId, following });

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
      userId,
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
      select: {
        id: true,
        username: true,
        avatarUrl: true,
        bio: true,
        following: {
          // Check if you follow them (followerId = requestingUserId, followingId = user.id)
          select: { followerId: true },
          where: { followerId: requestingUserId },
        },
        followers: {
          // Check if they follow you (followerId = user.id, followingId = requestingUserId)
          select: { followingId: true },
          where: { followingId: requestingUserId },
        },
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

    const usersWithFollowStatus = users.map(user => {
      const isOwnProfile = user.id === requestingUserId;
      const isFollowing = user.following.some(
        follow => follow.followerId === requestingUserId
      );
      const followsYou = user.followers.some(
        follow => follow.followingId === requestingUserId
      );

      return {
        ...user,
        isFollowing: isOwnProfile ? null : isFollowing,
        followsYou: isOwnProfile ? null : followsYou,
        following: undefined,
        followers: undefined,
      };
    });

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

export const getSearchHistory = async (userId, limit = 10) => {
  try {
    const searchHistory = await prisma.searchHistory.findMany({
      where: {
        userId,
      },
      select: {
        id: true,
        searchedUser: {
          select: {
            id: true,
            username: true,
            avatarUrl: true,
          },
        },
        createdAt: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: limit,
    });

    const formattedHistory = searchHistory.map(entry => ({
      id: entry.id,
      user: entry.searchedUser,
      createdAt: entry.createdAt,
    }));

    logger.info('Search history fetched', {
      userId,
      count: formattedHistory.length,
    });
    return formattedHistory;
  } catch (error) {
    logger.error('Failed to fetch search history', {
      userId,
      error: error.message,
    });
    throw error;
  }
};

// Delete a specific search history entry
export const deleteSearchHistoryEntry = async (userId, entryId) => {
  try {
    const searchEntry = await prisma.searchHistory.findUnique({
      where: { id: entryId },
    });

    if (!searchEntry) {
      logger.warn('Search history entry not found', { entryId });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_SEARCH_HISTORY_NOT_FOUND),
        { status: 404 }
      );
    }

    if (searchEntry.userId !== userId) {
      logger.warn('Unauthorized attempt to delete search history entry', {
        userId,
        entryId,
      });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_UNAUTHORIZED_DELETE),
        { status: 403 }
      );
    }

    await prisma.searchHistory.delete({
      where: { id: entryId },
    });

    logger.info('Search history entry deleted', { userId, entryId });
    return { message: 'Search history entry deleted successfully' };
  } catch (error) {
    logger.error('Failed to delete search history entry', {
      userId,
      entryId,
      error: error.message,
    });
    throw error;
  }
};
