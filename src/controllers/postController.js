import logger from '../config/logger.js';
import { POSTS_CONSTANTS } from '../constants/postConstants.js';
import * as postService from '../services/postService.js';

// Create a new post
export const createPost = async (req, res) => {
  try {
    const { content } = req.body;
    const files = req.files || [];
    const post = await postService.createPost(req.user.id, content, files);
    res.status(201).json(post);
  } catch (error) {
    logger.error(`Create post error: ${error.message}`);
    res.status(500).json({ message: 'Failed to create post' });
  }
};

export const getHomeFeed = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || POSTS_CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || POSTS_CONSTANTS.DEFAULT_LIMIT,
      POSTS_CONSTANTS.MAX_LIMIT
    );

    const { posts, totalPosts } = await postService.getHomeFeed(
      req.user.id,
      page,
      limit
    );

    const totalPages = Math.ceil(totalPosts / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      data: posts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalPosts,
        hasNextPage,
        hasPrevPage,
        limit,
      },
    });
  } catch (error) {
    logger.error(`Get home feed error: ${error.message}`, {
      userId: req.user.id,
    });
    res
      .status(500)
      .json({ message: error.message || 'Failed to fetch home feed' });
  }
};

export const getPostById = async (req, res) => {
  try {
    const { postId } = req.params;
    const page = parseInt(req.query.page) || POSTS_CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || POSTS_CONSTANTS.DEFAULT_LIMIT,
      POSTS_CONSTANTS.MAX_LIMIT
    );

    const { post, totalComments } = await postService.getPostById(
      postId,
      req.user.id,
      page,
      limit
    );

    if (!post) {
      logger.warn('Post not found in controller', { postId });
      return res
        .status(404)
        .json({ message: POSTS_CONSTANTS.ERROR_POST_NOT_FOUND });
    }

    const totalPages = Math.ceil(totalComments / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      data: post,
      commentsPagination: {
        currentPage: page,
        totalPages,
        totalItems: totalComments,
        hasNextPage,
        hasPrevPage,
        limit,
      },
    });
  } catch (error) {
    logger.error(`Get post error: ${error.message}`, { userId: req.user.id });

    const status =
      error.message === POSTS_CONSTANTS.ERROR_POST_NOT_FOUND ? 404 : 500;
    res.status(status).json({ message: error.message });
  }
};

// Like a post
export const likePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await postService.likePost(req.user.id, postId);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Like post error: ${error.message}`, { userId: req.user.id });
    const status =
      error.status ||
      (error.message === POSTS_CONSTANTS.ERROR_POST_NOT_FOUND ? 404 : 400);
    res.status(status).json({ message: error.message });
  }
};

// Unlike a post
export const unlikePost = async (req, res) => {
  try {
    const { postId } = req.params;
    const result = await postService.unlikePost(req.user.id, postId);
    res.status(200).json(result);
  } catch (error) {
    logger.error(`Unlike post error: ${error.message}`, {
      userId: req.user.id,
    });
    const status = error.status || 400;
    res.status(status).json({ message: error.message });
  }
};

// Create a comment
export const createComment = async (req, res) => {
  try {
    const { postId } = req.params;
    const { content } = req.body;
    const comment = await postService.createComment(
      req.user.id,
      postId,
      content
    );
    res.status(201).json(comment);
  } catch (error) {
    logger.error(`Create comment error: ${error.message}`);
    const status =
      error.message === POSTS_CONSTANTS.ERROR_POST_NOT_FOUND ? 404 : 500;
    res.status(status).json({ message: error.message });
  }
};

// Edit a comment
export const editComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    const { content } = req.body;
    const updatedComment = await postService.editComment(
      req.user.id,
      commentId,
      content
    );
    res.status(200).json(updatedComment);
  } catch (error) {
    logger.error(`Edit comment error: ${error.message}`);
    const status =
      error.message === POSTS_CONSTANTS.ERROR_COMMENT_NOT_FOUND ||
      error.message === POSTS_CONSTANTS.ERROR_UNAUTHORIZED_COMMENT_EDIT
        ? 403
        : 500;
    res.status(status).json({ message: error.message });
  }
};

// Delete a comment
export const deleteComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    await postService.deleteComment(req.user.id, commentId);
    res.status(200).json({ message: 'Comment deleted' });
  } catch (error) {
    logger.error(`Delete comment error: ${error.message}`);
    const status =
      error.message === POSTS_CONSTANTS.ERROR_COMMENT_NOT_FOUND ||
      error.message === POSTS_CONSTANTS.ERROR_UNAUTHORIZED_COMMENT_DELETE
        ? 403
        : 500;
    res.status(status).json({ message: error.message });
  }
};

// Save a post
export const savePost = async (req, res) => {
  try {
    const { postId } = req.params;
    await postService.savePost(req.user.id, postId);
    res.status(200).json({ message: 'Post saved' });
  } catch (error) {
    logger.error(`Save post error: ${error.message}`);
    const status =
      error.message === POSTS_CONSTANTS.ERROR_POST_NOT_FOUND ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

// Unsave a post
export const unsavePost = async (req, res) => {
  try {
    const { postId } = req.params;
    await postService.unsavePost(req.user.id, postId);
    res.status(200).json({ message: 'Post unsaved' });
  } catch (error) {
    logger.error(`Unsave post error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
};

// Get saved posts with pagination
export const getSavedPosts = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || POSTS_CONSTANTS.DEFAULT_PAGE;
    const limit = Math.min(
      parseInt(req.query.limit) || POSTS_CONSTANTS.DEFAULT_LIMIT,
      POSTS_CONSTANTS.MAX_LIMIT
    );

    const { formattedPosts, totalSavedPosts } = await postService.getSavedPosts(
      req.user.id,
      page,
      limit
    );

    const totalPages = Math.ceil(totalSavedPosts / limit);
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    res.status(200).json({
      data: formattedPosts,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalSavedPosts,
        hasNextPage,
        hasPrevPage,
        limit,
      },
    });
  } catch (error) {
    logger.error(`Get saved posts error: ${error.message}`);
    res.status(500).json({ message: 'Failed to fetch saved posts' });
  }
};

// Reply to a comment
export const replyToComment = async (req, res) => {
  try {
    const { postId, commentId } = req.params;
    const { content } = req.body;
    const comment = await postService.replyToComment(
      req.user.id,
      postId,
      commentId,
      content
    );
    res.status(201).json(comment);
  } catch (error) {
    logger.error(`Reply to comment error: ${error.message}`);
    const status =
      error.message === POSTS_CONSTANTS.ERROR_POST_NOT_FOUND ||
      error.message === POSTS_CONSTANTS.ERROR_COMMENT_NOT_FOUND
        ? 404
        : 500;
    res.status(status).json({ message: error.message });
  }
};

// Like a comment
export const likeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    await postService.likeComment(req.user.id, commentId);
    res.status(200).json({ message: 'Comment liked' });
  } catch (error) {
    logger.error(`Like comment error: ${error.message}`);
    const status =
      error.message === POSTS_CONSTANTS.ERROR_COMMENT_NOT_FOUND ? 404 : 400;
    res.status(status).json({ message: error.message });
  }
};

// Unlike a comment
export const unlikeComment = async (req, res) => {
  try {
    const { commentId } = req.params;
    await postService.unlikeComment(req.user.id, commentId);
    res.status(200).json({ message: 'Comment unliked' });
  } catch (error) {
    logger.error(`Unlike comment error: ${error.message}`);
    res.status(400).json({ message: error.message });
  }
};

// Delete a post
export const deletePost = async (req, res) => {
  try {
    const { postId } = req.params;
    await postService.deletePost(req.user.id, postId);
    res.status(200).json({ message: 'Post deleted successfully' });
  } catch (error) {
    logger.error(`Delete post error: ${error.message}`);
    const status =
      error.message === POSTS_CONSTANTS.ERROR_POST_NOT_FOUND ||
      error.message === POSTS_CONSTANTS.ERROR_UNAUTHORIZED_POST_DELETE
        ? 403
        : 500;
    res.status(status).json({ message: error.message });
  }
};
