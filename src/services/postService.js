import prisma from '../config/database.js';
import { uploadToCloudinary } from '../utils/fileUpload.js';
import { POSTS_CONSTANTS } from '../constants/postConstants.js';

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

// Get home feed (posts from followed users) with pagination
export const getHomeFeed = async (userId, page, limit) => {
  const skip = (page - 1) * limit;

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map(f => f.followingId);

  const totalPosts = await prisma.post.count({
    where: {
      userId: { in: followingIds },
    },
  });

  const posts = await prisma.post.findMany({
    where: {
      userId: { in: followingIds },
    },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      user: { select: { username: true, avatarUrl: true } },
      images: true,
      likes: { select: { userId: true } },
      comments: { select: { id: true } },
      savedPosts: { where: { userId }, select: { id: true } },
    },
  });

  return { posts, totalPosts };
};

// Get post by ID with paginated comments
export const getPostById = async (postId, userId, page, limit) => {
  const skip = (page - 1) * limit;

  const totalComments = await prisma.comment.count({
    where: { postId },
  });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { username: true, avatarUrl: true } },
      images: true,
      likes: { select: { userId: true } },
      comments: {
        include: {
          user: { select: { username: true, avatarUrl: true } },
          commentLikes: { select: { userId: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      },
      savedPosts: { where: { userId }, select: { id: true } },
    },
  });

  return { post, totalComments };
};

// Like a post
export const likePost = async (userId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND);
  }

  const existingLike = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (existingLike) {
    throw new Error(POSTS_CONSTANTS.ERROR_ALREADY_LIKED);
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
};

// Unlike a post
export const unlikePost = async (userId, postId) => {
  const like = await prisma.like.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (!like) {
    throw new Error(POSTS_CONSTANTS.ERROR_NOT_LIKED);
  }

  await prisma.like.delete({
    where: { userId_postId: { userId, postId } },
  });
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
