import prisma from '../config/database.js';
import { uploadToCloudinary } from '../utils/fileUpload.js';
import { POSTS_CONSTANTS } from '../constants/postConstants.js';
import logger from '../config/logger.js';

// Create a new post
export const createPost = async (userId, content, files) => {
  const mediaItems =
    files.length > 0 ? await uploadToCloudinary(files, 'posts') : [];

  const post = await prisma.post.create({
    data: {
      content,
      userId,
      images: {
        create: mediaItems.map(item => ({
          imageUrl: item.url,
          mediaType: item.type,
        })),
      },
    },
    include: {
      user: { select: { username: true, avatarUrl: true } },
      images: true,
      likes: true,
      comments: true,
    },
  });

  await prisma.activity.create({
    data: {
      userId,
      type: POSTS_CONSTANTS.ACTIVITY_TYPE_CREATE_POST,
      postId: post.id,
    },
  });

  return post;
};

export const getHomeFeed = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  // Get the IDs of users the logged-in user is following
  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map(f => f.followingId);

  // Include the logged-in user's own posts by adding their ID to the list
  const userIdsToQuery = [...followingIds, userId];

  // Count total posts from followed users (including the logged-in user)
  const totalPosts = await prisma.post.count({
    where: {
      userId: { in: userIdsToQuery },
    },
  });

  // Fetch posts with necessary relations
  const posts = await prisma.post.findMany({
    where: {
      userId: { in: userIdsToQuery },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      // user: { select: { username: true, avatarUrl: true } },
      images: { select: { imageUrl: true, mediaType: true } },
      likes: { select: { userId: true } }, // To compute hasLiked
      comments: { select: { id: true } },
      savedPosts: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true } }, // To get likesCount and commentsCount
    },
  });

  // Map posts to include hasLiked, likesCount, and clean up response
  const formattedPosts = posts.map(post => {
    const hasLiked = post.likes.some(like => like.userId === userId);
    return {
      ...post,
      hasLiked,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isSaved: post.savedPosts.length > 0, // Add isSaved for consistency
      likes: undefined, // Remove raw likes array
      savedPosts: undefined, // Remove raw savedPosts array
      _count: undefined, // Remove raw _count object
    };
  });

  return { posts: formattedPosts, totalPosts };
};

// Get post by ID with paginated comments
// Get post by ID with paginated comments
export const getPostById = async (postId, userId, page, limit) => {
  const skip = (page - 1) * limit;

  const totalComments = await prisma.comment.count({
    where: { postId, parentId: null }, // Only count top-level comments
  });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { username: true, avatarUrl: true } },
      images: true,
      likes: { select: { userId: true } },
      comments: {
        where: { parentId: null }, // Fetch only top-level comments
        include: {
          user: { select: { username: true, avatarUrl: true } },
          commentLikes: { select: { userId: true } },
          replies: {
            include: {
              user: { select: { username: true, avatarUrl: true } },
              commentLikes: { select: { userId: true } },
              replies: {
                include: {
                  user: { select: { username: true, avatarUrl: true } },
                  commentLikes: { select: { userId: true } },
                },
              },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      },
      savedPosts: { where: { userId }, select: { id: true } },
      _count: {
        select: { likes: true }, // Include the count of likes
      },
    },
  });

  if (!post) {
    logger.warn('Post not found', { postId });
    throw new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND);
  }

  // Compute hasLiked based on the logged-in user
  const hasLiked = post.likes.some(like => like.userId === userId);

  // Prepare the post response with additional fields
  const postResponse = {
    ...post,
    hasLiked,
    likesCount: post._count.likes, // Total number of likes
    isSaved: post.savedPosts.length > 0, // Add isSaved field for consistency
  };

  // Remove fields that shouldn't be exposed to the client
  delete postResponse.likes; // Remove raw likes array
  delete postResponse.savedPosts; // Remove raw savedPosts array
  delete postResponse._count; // Remove raw _count object

  return { post: postResponse, totalComments };
};

// Like a post
export const likePost = async (userId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    logger.warn('Post not found for liking', { postId, userId });
    throw Object.assign(new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND), {
      status: 404,
    });
  }

  const existingLike = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (existingLike) {
    logger.warn('User already liked this post', { userId, postId });
    throw Object.assign(new Error(POSTS_CONSTANTS.ERROR_ALREADY_LIKED), {
      status: 400,
    });
  }

  await prisma.like.create({
    data: {
      userId,
      postId,
    },
  });

  await prisma.activity.create({
    data: {
      userId,
      type: POSTS_CONSTANTS.ACTIVITY_TYPE_LIKE_POST,
      postId,
    },
  });

  // Fetch the updated likes count
  const updatedPost = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      _count: {
        select: { likes: true },
      },
    },
  });

  logger.info('Post liked successfully', { userId, postId });

  return {
    message: 'Post liked successfully',
    likesCount: updatedPost._count.likes,
    hasLiked: true,
  };
};

// Unlike a post
export const unlikePost = async (userId, postId) => {
  const like = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (!like) {
    logger.warn('User has not liked this post', { userId, postId });
    throw Object.assign(new Error(POSTS_CONSTANTS.ERROR_NOT_LIKED), {
      status: 400,
    });
  }

  await prisma.like.delete({
    where: { userId_postId: { userId, postId } },
  });

  // Fetch the updated likes count
  const updatedPost = await prisma.post.findUnique({
    where: { id: postId },
    select: {
      _count: {
        select: { likes: true },
      },
    },
  });

  logger.info('Post unliked successfully', { userId, postId });

  return {
    message: 'Post unliked successfully',
    likesCount: updatedPost._count.likes,
    hasLiked: false,
  };
};

// Create a comment
export const createComment = async (userId, postId, content) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND);
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      userId,
      postId,
    },
    include: {
      user: { select: { username: true, avatarUrl: true } },
    },
  });

  await prisma.activity.create({
    data: {
      userId,
      type: POSTS_CONSTANTS.ACTIVITY_TYPE_CREATE_COMMENT,
      postId,
      commentId: comment.id,
    },
  });

  return comment;
};

// Edit a comment
export const editComment = async (userId, commentId, content) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) {
    throw new Error(POSTS_CONSTANTS.ERROR_COMMENT_NOT_FOUND);
  }
  if (comment.userId !== userId) {
    throw new Error(POSTS_CONSTANTS.ERROR_UNAUTHORIZED_COMMENT_EDIT);
  }

  return await prisma.comment.update({
    where: { id: commentId },
    data: { content },
    include: { user: { select: { username: true, avatarUrl: true } } },
  });
};

// Delete a comment
export const deleteComment = async (userId, commentId) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) {
    throw new Error(POSTS_CONSTANTS.ERROR_COMMENT_NOT_FOUND);
  }
  if (comment.userId !== userId) {
    throw new Error(POSTS_CONSTANTS.ERROR_UNAUTHORIZED_COMMENT_DELETE);
  }

  await prisma.comment.delete({ where: { id: commentId } });
};

// Save a post
export const savePost = async (userId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND);
  }

  const existingSave = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (existingSave) {
    throw new Error(POSTS_CONSTANTS.ERROR_ALREADY_SAVED);
  }

  await prisma.savedPost.create({
    data: {
      userId,
      postId,
    },
  });
};

// Unsave a post
export const unsavePost = async (userId, postId) => {
  const savedPost = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (!savedPost) {
    throw new Error(POSTS_CONSTANTS.ERROR_NOT_SAVED);
  }

  await prisma.savedPost.delete({
    where: { userId_postId: { userId, postId } },
  });
};

// Get saved posts with pagination
export const getSavedPosts = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  const totalSavedPosts = await prisma.savedPost.count({
    where: { userId },
  });

  const savedPosts = await prisma.savedPost.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      post: {
        include: {
          user: { select: { username: true, avatarUrl: true } },
          images: true,
          likes: { select: { userId: true } },
          comments: { select: { id: true } },
        },
      },
    },
  });

  const formattedPosts = savedPosts.map(sp => sp.post);

  return { formattedPosts, totalSavedPosts };
};

// Reply to a comment
export const replyToComment = async (
  userId,
  postId,
  parentCommentId,
  content
) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND);
  }

  const parentComment = await prisma.comment.findUnique({
    where: { id: parentCommentId },
  });
  if (!parentComment) {
    throw new Error(POSTS_CONSTANTS.ERROR_COMMENT_NOT_FOUND);
  }

  const comment = await prisma.comment.create({
    data: {
      content,
      userId,
      postId,
      parentId: parentCommentId,
    },
    include: {
      user: { select: { username: true, avatarUrl: true } },
      parent: { select: { id: true, userId: true, content: true } },
    },
  });

  await prisma.activity.create({
    data: {
      userId,
      type: POSTS_CONSTANTS.ACTIVITY_TYPE_CREATE_COMMENT,
      postId,
      commentId: comment.id,
    },
  });

  return comment;
};

// Like a comment
export const likeComment = async (userId, commentId) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) {
    throw new Error(POSTS_CONSTANTS.ERROR_COMMENT_NOT_FOUND);
  }

  const existingLike = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });
  if (existingLike) {
    throw new Error(POSTS_CONSTANTS.ERROR_ALREADY_LIKED_COMMENT);
  }

  await prisma.commentLike.create({
    data: {
      userId,
      commentId,
    },
  });

  await prisma.activity.create({
    data: {
      userId,
      type: POSTS_CONSTANTS.ACTIVITY_TYPE_LIKE_COMMENT,
      postId: comment.postId,
      commentId,
    },
  });
};

// Unlike a comment
export const unlikeComment = async (userId, commentId) => {
  const like = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });
  if (!like) {
    throw new Error(POSTS_CONSTANTS.ERROR_NOT_LIKED_COMMENT);
  }

  await prisma.commentLike.delete({
    where: { userId_commentId: { userId, commentId } },
  });
};

// Delete a post
export const deletePost = async (userId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND);
  }
  if (post.userId !== userId) {
    throw new Error(POSTS_CONSTANTS.ERROR_UNAUTHORIZED_POST_DELETE);
  }

  await prisma.post.delete({
    where: { id: postId },
  });

  // Note: Cascading deletes will remove related likes, comments, nested comments, images, saved posts, and activities
};
