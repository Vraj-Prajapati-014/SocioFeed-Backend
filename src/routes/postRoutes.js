import express from 'express';
import { uploadPost } from '../utils/fileUpload.js'; // Use the new uploadPost middleware
import {
  createPost,
  getHomeFeed,
  getPostById,
  likePost,
  unlikePost,
  createComment,
  editComment,
  deleteComment,
  savePost,
  unsavePost,
  getSavedPosts,
  replyToComment,
  likeComment,
  unlikeComment,
  deletePost,
} from '../controllers/postController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validateMiddleware.js';
import {
  createPostSchema,
  commentSchema,
  paginationSchema,
  commentReplySchema,
  commentLikeSchema,
  deletePostSchema,
} from '../utils/postValidation.js';
import { POSTS_CONSTANTS } from '../constants/postConstants.js';

const router = express.Router();

// Public routes with pagination
router.get(
  POSTS_CONSTANTS.POSTS_HOME_FEED,
  authMiddleware,
  validate(paginationSchema),
  getHomeFeed
);

router.get(
  POSTS_CONSTANTS.POSTS_SAVED,
  authMiddleware,
  validate(paginationSchema),
  getSavedPosts
);

router.get(
  POSTS_CONSTANTS.POSTS_BY_ID,
  authMiddleware,
  validate(paginationSchema),
  getPostById
);

router.post(
  POSTS_CONSTANTS.POSTS_CREATE,
  authMiddleware,
  uploadPost.array('media', POSTS_CONSTANTS.MAX_IMAGES_PER_POST), // Handle multiple media uploads
  validate(createPostSchema),
  createPost
);

router.post(POSTS_CONSTANTS.POSTS_LIKE, authMiddleware, likePost);

router.delete(POSTS_CONSTANTS.POSTS_UNLIKE, authMiddleware, unlikePost);

router.post(
  POSTS_CONSTANTS.POSTS_COMMENTS,
  authMiddleware,
  validate(commentSchema),
  createComment
);

router.put(
  POSTS_CONSTANTS.POSTS_COMMENTS_EDIT,
  authMiddleware,
  validate(commentSchema),
  editComment
);

router.delete(
  POSTS_CONSTANTS.POSTS_COMMENTS_DELETE,
  authMiddleware,
  deleteComment
);

// Reply to a comment
router.post(
  POSTS_CONSTANTS.POSTS_COMMENTS_REPLY,
  authMiddleware,
  validate(commentReplySchema),
  replyToComment
);

// Like a comment
router.post(
  POSTS_CONSTANTS.POSTS_COMMENTS_LIKE,
  authMiddleware,
  validate(commentLikeSchema),
  likeComment
);

// Unlike a comment
router.delete(
  POSTS_CONSTANTS.POSTS_COMMENTS_UNLIKE,
  authMiddleware,
  validate(commentLikeSchema),
  unlikeComment
);
// Delete a post
router.delete(
  POSTS_CONSTANTS.POSTS_DELETE,
  authMiddleware,
  validate(deletePostSchema),
  deletePost
);

router.post(POSTS_CONSTANTS.POSTS_SAVE, authMiddleware, savePost);

router.delete(POSTS_CONSTANTS.POSTS_UNSAVE, authMiddleware, unsavePost);

export default router;
