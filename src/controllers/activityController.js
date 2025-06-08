import {
  getUserActivities,
  deleteUserActivities,
} from '../services/activityService.js';
import { ACTIVITY_CONSTANTS } from '../constants/activityConstants.js';

const getActivities = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const page = parseInt(req.query.page) || ACTIVITY_CONSTANTS.DEFAULT_PAGE;
    const limit = parseInt(req.query.limit) || ACTIVITY_CONSTANTS.DEFAULT_LIMIT;

    if (limit > ACTIVITY_CONSTANTS.MAX_LIMIT) {
      return res.status(400).json({
        success: false,
        message: `Limit cannot exceed ${ACTIVITY_CONSTANTS.MAX_LIMIT}`,
      });
    }

    const result = await getUserActivities(userId, page, limit);
    return res.status(200).json({
      success: true,
      data: result.activities,
      pagination: result.pagination,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to fetch activities',
    });
  }
};

const deleteActivities = async (req, res) => {
  try {
    const userId = req.user.id; // From auth middleware
    const result = await deleteUserActivities(userId);
    return res.status(200).json({
      success: true,
      message: result.message,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error.message || 'Failed to delete activities',
    });
  }
};

export { getActivities, deleteActivities };
