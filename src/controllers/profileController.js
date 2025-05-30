import {
  getProfileByUsername,
  updateUserInfo,
  updateUserAvatar,
  followUser,
  unfollowUser,
  getFollowers,
  getFollowing,
  searchUsers,
} from '../services/profileService.js';
import prisma from '../config/database.js';
import logger from '../config/logger.js';
import { PROFILE_CONSTANTS } from '../constants/profileConstants.js';

// Get user profile by username
export const getProfile = async (req, res, next) => {
  try {
    const { username } = req.params;
    const profile = await getProfileByUsername(username, req.user.id);
    res.status(200).json(profile);
  } catch (error) {
    logger.error('Get profile failed', {
      username: req.params.username,
      userId: req.user.id,
      error: error.message,
    });
    next(error);
  }
};

// Update username and bio
export const updateInfo = async (req, res, next) => {
  try {
    const { username, bio } = req.body;
    const userId = req.user.id;

    const profileUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!profileUser || profileUser.id !== userId) {
      logger.warn('Unauthorized profile update attempt', { userId });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_UNAUTHORIZED_EDIT),
        { status: 403 }
      );
    }

    const result = await updateUserInfo(userId, { username, bio });
    res.status(200).json(result);
  } catch (error) {
    logger.error('Update user info failed', {
      userId: req.user.id,
      error: error.message,
    });
    next(error);
  }
};

// Update avatar
export const updateAvatar = async (req, res, next) => {
  try {
    const userId = req.user.id;
    const file = req.file; // File uploaded via multer

    const profileUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!profileUser || profileUser.id !== userId) {
      logger.warn('Unauthorized avatar update attempt', { userId });
      throw Object.assign(
        new Error(PROFILE_CONSTANTS.ERROR_UNAUTHORIZED_EDIT),
        { status: 403 }
      );
    }

    const result = await updateUserAvatar(userId, file);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Update avatar failed', {
      userId: req.user.id,
      error: error.message,
    });
    next(error);
  }
};

// Follow a user
export const follow = async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;
    const result = await followUser(followerId, followingId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Follow failed', {
      followerId: req.user.id,
      followingId: req.params.userId,
      error: error.message,
    });
    next(error);
  }
};

// Unfollow a user
export const unfollow = async (req, res, next) => {
  try {
    const followerId = req.user.id;
    const followingId = req.params.userId;
    const result = await unfollowUser(followerId, followingId);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Unfollow failed', {
      followerId: req.user.id,
      followingId: req.params.userId,
      error: error.message,
    });
    next(error);
  }
};

// Get followers list with pagination
export const getFollowersList = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { page, limit } = req.query;
    const pageNum = parseInt(page, 10) || PROFILE_CONSTANTS.DEFAULT_PAGE;
    const limitNum = parseInt(limit, 10) || PROFILE_CONSTANTS.DEFAULT_LIMIT;

    const result = await getFollowers(username, pageNum, limitNum);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get followers failed', {
      username: req.params.username,
      error: error.message,
    });
    next(error);
  }
};

// Get following list with pagination
export const getFollowingList = async (req, res, next) => {
  try {
    const { username } = req.params;
    const { page, limit } = req.query;
    const pageNum = parseInt(page, 10) || PROFILE_CONSTANTS.DEFAULT_PAGE;
    const limitNum = parseInt(limit, 10) || PROFILE_CONSTANTS.DEFAULT_LIMIT;

    const result = await getFollowing(username, pageNum, limitNum);
    res.status(200).json(result);
  } catch (error) {
    logger.error('Get following failed', {
      username: req.params.username,
      error: error.message,
    });
    next(error);
  }
};

// Search users with pagination
export const search = async (req, res, next) => {
  try {
    const { query, page, limit } = req.query;
    const pageNum = parseInt(page, 10) || PROFILE_CONSTANTS.DEFAULT_PAGE;
    const limitNum = parseInt(limit, 10) || PROFILE_CONSTANTS.DEFAULT_LIMIT;

    const users = await searchUsers(query, req.user.id, pageNum, limitNum);
    res.status(200).json(users);
  } catch (error) {
    logger.error('User search failed', {
      query: req.query.query,
      userId: req.user.id,
      error: error.message,
    });
    next(error);
  }
};
