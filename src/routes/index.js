// src/routes/index.js

import express from 'express';
import authRoutes from './authRoutes.js';
import profileRoutes from './profile.js';
import { PROFILE_CONSTANTS } from '../constants/profileConstants.js';

const router = express.Router();

// Mount auth routes under /api/auth
router.use('/auth', authRoutes);

// Mount profile routes under /api/profile
router.use(PROFILE_CONSTANTS.PROFILE_BASE_URL, profileRoutes);

export default router;
