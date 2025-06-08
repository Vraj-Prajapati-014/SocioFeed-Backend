import express from 'express';
import {
  getActivities,
  deleteActivities,
} from '../controllers/activityController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authMiddleware, getActivities);
router.delete('/', authMiddleware, deleteActivities);

export default router;
