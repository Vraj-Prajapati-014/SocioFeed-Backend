import prisma from '../config/database.js';
import { ACTIVITY_CONSTANTS } from '../constants/activityConstants.js';

const getUserActivities = async (
  userId,
  page = ACTIVITY_CONSTANTS.DEFAULT_PAGE,
  limit = ACTIVITY_CONSTANTS.DEFAULT_LIMIT
) => {
  try {
    const skip = (page - 1) * limit;
    const activities = await prisma.activity.findMany({
      where: { userId },
      include: {
        post: {
          select: {
            id: true,
            content: true,
            user: { select: { username: true } },
          },
        },
        comment: {
          select: {
            id: true,
            content: true,
            user: { select: { username: true } },
          },
        },
        user: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    });

    const totalActivities = await prisma.activity.count({ where: { userId } });

    // Instead of throwing an error, return empty data
    return {
      activities: activities.map(activity => ({
        ...activity,
        post: activity.post
          ? {
              id: activity.post.id,
              content: activity.post.content,
              author: { username: activity.post.user.username },
            }
          : null,
        comment: activity.comment
          ? {
              id: activity.comment.id,
              content: activity.comment.content,
              author: { username: activity.comment.user.username },
            }
          : null,
        user: { username: activity.user.username },
      })),
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(totalActivities / limit),
        totalItems: totalActivities,
        hasNextPage: skip + limit < totalActivities,
        hasPrevPage: page > 1,
        limit,
      },
    };
  } catch (error) {
    console.error('activityService - Error fetching user activities:', error);
    throw new Error(error.message || 'Failed to fetch activities');
  }
};

const deleteUserActivities = async userId => {
  try {
    const deletedCount = await prisma.activity.deleteMany({
      where: { userId },
    });
    return {
      message: `Successfully deleted ${deletedCount.count} activities`,
      deletedCount: deletedCount.count,
    };
  } catch (error) {
    console.error('activityService - Error deleting user activities:', error);
    throw new Error(error.message || 'Failed to delete activities');
  }
};

export { getUserActivities, deleteUserActivities };
