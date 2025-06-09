import express from 'express';
import { uploadProfile } from '../utils/fileUpload.js';
import {
  getProfile,
  updateInfo,
  updateAvatar,
  follow,
  unfollow,
  getFollowersList,
  getFollowingList,
  search,
  getUserSearchHistory,
  deleteUserSearchHistoryEntry,
} from '../controllers/profileController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  updateInfoSchema,
  updateAvatarSchema,
  paginationSchema,
  searchSchema,
} from '../utils/validators.js';
import { PROFILE_CONSTANTS } from '../constants/profileConstants.js';

const router = express.Router();

// Specific routes first
router.get(
  PROFILE_CONSTANTS.PROFILE_SEARCH,
  authMiddleware,
  validate(searchSchema),
  search
);

router.get(
  PROFILE_CONSTANTS.PROFILE_FOLLOWERS,
  authMiddleware,
  validate(paginationSchema),
  getFollowersList
);

router.get(
  PROFILE_CONSTANTS.PROFILE_FOLLOWING,
  authMiddleware,
  validate(paginationSchema),
  getFollowingList
);

// Dynamic route for profile
router.get(PROFILE_CONSTANTS.PROFILE_BY_USERNAME, authMiddleware, getProfile);
router.get(
  PROFILE_CONSTANTS.PROFILE_SEARCH_HISTORY,
  authMiddleware,
  getUserSearchHistory
);
router.delete(
  PROFILE_CONSTANTS.PROFILE_DELETE_SEARCH_HISTORY,
  authMiddleware,
  deleteUserSearchHistoryEntry
);

router.put(
  PROFILE_CONSTANTS.PROFILE_UPDATE_INFO,
  authMiddleware,
  validate(updateInfoSchema),
  updateInfo
);

router.put(
  PROFILE_CONSTANTS.PROFILE_UPDATE_AVATAR,
  authMiddleware,
  uploadProfile.single('avatar'), // Handle file upload with multer
  validate(updateAvatarSchema),
  updateAvatar
);

router.put(
  PROFILE_CONSTANTS.PROFILE_UPDATE_AVATAR,
  authMiddleware,
  validate(updateAvatarSchema),
  updateAvatar
);

router.post(PROFILE_CONSTANTS.PROFILE_FOLLOW, authMiddleware, follow);

router.post(PROFILE_CONSTANTS.PROFILE_UNFOLLOW, authMiddleware, unfollow);

export default router;
