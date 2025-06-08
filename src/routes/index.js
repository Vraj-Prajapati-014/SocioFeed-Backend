// src/routes/index.js

import express from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profile.js';
import { PROFILE_CONSTANTS } from '../constants/profileConstants.js';
import { POSTS_CONSTANTS } from '../constants/postConstants.js';
import postRoutes from './postRoutes.js';
import { CHAT_CONSTANTS } from '../constants/chatConstants.js';
import chatRoutes from '../routes/chatRoutes.js';
import ActivityRoutes from '../routes/activityRoutes.js';
import { ACTIVITY_CONSTANTS } from '../constants/activityConstants.js';

const router = express.Router();

// Mount auth routes under /api/auth
router.use('/auth', authRoutes);

// Mount profile routes under /api/profile
router.use(PROFILE_CONSTANTS.PROFILE_BASE_URL, profileRoutes);
router.use(POSTS_CONSTANTS.POSTS_BASE_URL, postRoutes);
router.use(CHAT_CONSTANTS.CHAT_BASE_URL, chatRoutes);
router.use(ACTIVITY_CONSTANTS.ACTIVITY_BASE_URL, ActivityRoutes);

export default router;
