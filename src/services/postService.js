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

  const following = await prisma.follow.findMany({
    where: { followerId: userId },
    select: { followingId: true },
  });
  const followingIds = following.map(f => f.followingId);
  const userIdsToQuery = [...followingIds, userId];

  const totalPosts = await prisma.post.count({
    where: { userId: { in: userIdsToQuery } },
  });

  const posts = await prisma.post.findMany({
    where: { userId: { in: userIdsToQuery } },
    orderBy: { createdAt: 'desc' },
    skip,
    take: limit,
    include: {
      user: { select: { id: true, username: true, avatarUrl: true } },
      images: { select: { imageUrl: true, mediaType: true } },
      likes: { select: { userId: true } },
      comments: { select: { id: true } },
      savedPosts: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
    },
  });

  const formattedPosts = posts.map(post => {
    const hasLiked = post.likes.some(like => like.userId === userId);
    return {
      ...post,
      hasLiked,
      likesCount: post._count.likes,
      commentsCount: post._count.comments,
      isSaved: post.savedPosts.length > 0,
      likes: undefined,
      savedPosts: undefined,
      _count: undefined,
    };
  });

  return { posts: formattedPosts, totalPosts };
};

export const getPostById = async (postId, userId, page, limit) => {
  const skip = (page - 1) * limit;

  // Count all comments (including nested replies) for the post
  const totalComments = await prisma.comment.count({
    where: { postId }, // Removed parentId: null to count all comments
  });

  const post = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      user: { select: { username: true, avatarUrl: true } },
      images: true,
      likes: { select: { userId: true } },
      comments: {
        where: { parentId: null },
        include: {
          user: { select: { username: true, avatarUrl: true } },
          commentLikes: { select: { userId: true } },
          replies: {
            include: {
              user: { select: { username: true, avatarUrl: true } },
              commentLikes: { select: { userId: true } },
              _count: { select: { commentLikes: true } },
              replies: {
                include: {
                  user: { select: { username: true, avatarUrl: true } },
                  commentLikes: { select: { userId: true } },
                  _count: { select: { commentLikes: true } },
                },
              },
            },
          },
          _count: { select: { commentLikes: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
      },
      savedPosts: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true } },
    },
  });

  if (!post) {
    logger.warn('Post not found', { postId });
    throw new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND);
  }

  const hasLiked = post.likes.some(like => like.userId === userId);

  const mapComment = comment => ({
    ...comment,
    hasLiked: comment.commentLikes.some(like => like.userId === userId),
    likesCount: comment._count.commentLikes,
    commentLikes: undefined,
    _count: undefined,
    replies: comment.replies.map(reply => ({
      ...reply,
      hasLiked: reply.commentLikes.some(like => like.userId === userId),
      likesCount: reply._count?.commentLikes || 0,
      commentLikes: undefined,
      _count: undefined,
      replies: reply.replies.map(nestedReply => ({
        ...nestedReply,
        hasLiked: nestedReply.commentLikes.some(like => like.userId === userId),
        likesCount: nestedReply._count?.commentLikes || 0,
        commentLikes: undefined,
        _count: undefined,
      })),
    })),
  });

  const formattedPost = {
    ...post,
    author: {
      id: post.user.id,
      username: post.user.username,
      avatarUrl: post.user.avatarUrl,
    },
    hasLiked,
    likesCount: post._count.likes,
    isSaved: post.savedPosts.length > 0,
    comments: post.comments.map(mapComment),
    totalComments, // Add totalComments to the formattedPost
  };

  delete formattedPost.likes;
  delete formattedPost.savedPosts;
  delete formattedPost._count;

  return { post: formattedPost, totalComments };
};

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
    data: { userId, postId },
  });

  await prisma.activity.create({
    data: {
      userId,
      type: POSTS_CONSTANTS.ACTIVITY_TYPE_LIKE_POST,
      postId,
    },
  });

  const updatedPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { _count: { select: { likes: true } } },
  });

  logger.info('Post liked successfully', { userId, postId });

  return {
    message: 'Post liked successfully',
    likesCount: updatedPost._count.likes,
    hasLiked: true,
  };
};

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

  const updatedPost = await prisma.post.findUnique({
    where: { id: postId },
    select: { _count: { select: { likes: true } } },
  });

  logger.info('Post unliked successfully', { userId, postId });

  return {
    message: 'Post unliked successfully',
    likesCount: updatedPost._count.likes,
    hasLiked: false,
  };
};

export const createComment = async (userId, postId, content) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND);
  }

  const comment = await prisma.comment.create({
    data: { content, userId, postId },
    include: { user: { select: { username: true, avatarUrl: true } } },
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
export const savePost = async (userId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    logger.warn('Post not found for saving', { postId, userId });
    throw Object.assign(new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND), {
      status: 404,
    });
  }

  const existingSave = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (existingSave) {
    logger.warn('Post already saved', { userId, postId });
    throw Object.assign(new Error(POSTS_CONSTANTS.ERROR_ALREADY_SAVED), {
      status: 400,
    });
  }

  const savedPost = await prisma.savedPost.create({
    data: { userId, postId },
  });
  logger.info('Saved post created', {
    userId,
    postId,
    savedPostId: savedPost.id,
  });

  // Fetch updated post to include isSaved
  const updatedPost = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      savedPosts: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
      user: { select: { username: true, avatarUrl: true } },
      images: true,
    },
  });

  return {
    message: 'Post saved successfully',
    isSaved: true,
    post: {
      ...updatedPost,
      isSaved: updatedPost.savedPosts.length > 0,
      likesCount: updatedPost._count.likes,
      commentsCount: updatedPost._count.comments,
      savedPosts: undefined,
      _count: undefined,
    },
  };
};

export const unsavePost = async (userId, postId) => {
  const savedPost = await prisma.savedPost.findUnique({
    where: { userId_postId: { userId, postId } },
  });
  if (!savedPost) {
    logger.warn('Post not saved', { userId, postId });
    throw Object.assign(new Error(POSTS_CONSTANTS.ERROR_NOT_SAVED), {
      status: 400,
    });
  }

  await prisma.savedPost.delete({
    where: { userId_postId: { userId, postId } },
  });

  // Fetch updated post to include isSaved
  const updatedPost = await prisma.post.findUnique({
    where: { id: postId },
    include: {
      savedPosts: { where: { userId }, select: { id: true } },
      _count: { select: { likes: true, comments: true } },
      user: { select: { username: true, avatarUrl: true } },
      images: true,
    },
  });

  logger.info('Post unsaved successfully', { userId, postId });

  return {
    message: 'Post unsaved successfully',
    isSaved: false,
    post: {
      ...updatedPost,
      isSaved: updatedPost.savedPosts.length > 0,
      likesCount: updatedPost._count.likes,
      commentsCount: updatedPost._count.comments,
      savedPosts: undefined,
      _count: undefined,
    },
  };
};
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
          savedPosts: { where: { userId }, select: { id: true } },
          _count: { select: { likes: true, comments: true } },
        },
      },
    },
  });

  const formattedPosts = savedPosts.map(sp => ({
    ...sp.post,
    hasLiked: sp.post.likes.some(like => like.userId === userId),
    likesCount: sp.post._count.likes,
    commentsCount: sp.post._count.comments,
    isSaved: sp.post.savedPosts.length > 0,
    author: sp.post.user,
    likes: undefined,
    savedPosts: undefined,
    _count: undefined,
  }));

  logger.info('Fetched saved posts', {
    userId,
    totalSavedPosts,
    postsCount: formattedPosts.length,
  });

  return {
    formattedPosts,
    totalSavedPosts,
    nextPage: totalSavedPosts > page * limit ? page + 1 : null,
  };
};
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
    data: { content, userId, postId, parentId: parentCommentId },
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

export const likeComment = async (userId, commentId) => {
  const comment = await prisma.comment.findUnique({ where: { id: commentId } });
  if (!comment) {
    throw Object.assign(new Error(POSTS_CONSTANTS.ERROR_COMMENT_NOT_FOUND), {
      status: 404,
    });
  }

  const existingLike = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });
  if (existingLike) {
    throw Object.assign(
      new Error(POSTS_CONSTANTS.ERROR_ALREADY_LIKED_COMMENT),
      { status: 400 }
    );
  }

  await prisma.commentLike.create({
    data: { userId, commentId },
  });

  await prisma.activity.create({
    data: {
      userId,
      type: POSTS_CONSTANTS.ACTIVITY_TYPE_LIKE_COMMENT,
      postId: comment.postId,
      commentId,
    },
  });

  const updatedComment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { _count: { select: { commentLikes: true } } },
  });

  return {
    message: 'Comment liked successfully',
    likesCount: updatedComment._count.commentLikes,
    hasLiked: true,
  };
};

export const unlikeComment = async (userId, commentId) => {
  const like = await prisma.commentLike.findUnique({
    where: { userId_commentId: { userId, commentId } },
  });
  if (!like) {
    throw Object.assign(new Error(POSTS_CONSTANTS.ERROR_NOT_LIKED_COMMENT), {
      status: 400,
    });
  }

  await prisma.commentLike.delete({
    where: { userId_commentId: { userId, commentId } },
  });

  const updatedComment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { _count: { select: { commentLikes: true } } },
  });

  return {
    message: 'Comment unliked successfully',
    likesCount: updatedComment._count.commentLikes,
    hasLiked: false,
  };
};

export const deletePost = async (userId, postId) => {
  const post = await prisma.post.findUnique({ where: { id: postId } });
  if (!post) {
    throw new Error(POSTS_CONSTANTS.ERROR_POST_NOT_FOUND);
  }
  if (post.userId !== userId) {
    throw new Error(POSTS_CONSTANTS.ERROR_UNAUTHORIZED_POST_DELETE);
  }

  await prisma.post.delete({ where: { id: postId } });
};
