import multer from 'multer';
import logger from '../config/logger.js';
import { cloudinary } from '../config/cloudinary.js';
import { POSTS_CONSTANTS } from '../constants/postConstants.js';

// Storage configuration for Multer
const storage = multer.memoryStorage();

// File filter for profile pictures (images only)
const profileFileFilter = (req, file, cb) => {
  if (!file.mimetype.startsWith('image/')) {
    logger.warn('Invalid file type uploaded for profile', {
      mimetype: file.mimetype,
    });
    return cb(new Error('Only image files are allowed'), false);
  }
  cb(null, true);
};

// File filter for posts (images and videos)
const postFileFilter = (req, file, cb) => {
  const allowedTypes = ['image/', 'video/'];
  const isValidType = allowedTypes.some(type => file.mimetype.startsWith(type));
  if (!isValidType) {
    logger.warn('Invalid file type uploaded for post', {
      mimetype: file.mimetype,
    });
    return cb(new Error('Only image and video files are allowed'), false);
  }
  cb(null, true);
};

// Multer configuration for profile pictures
export const uploadProfile = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
  fileFilter: profileFileFilter,
});

// Multer configuration for posts (up to 4 images/videos)
export const uploadPost = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // Limit file size to 10MB for posts (larger for videos)
    files: POSTS_CONSTANTS.MAX_IMAGES_PER_POST, // Limit to 4 files
  },
  fileFilter: postFileFilter,
});

// Function to upload files to Cloudinary and return URLs
export const uploadToCloudinary = async (files, folder) => {
  try {
    const uploadPromises = files.map(async file => {
      const isVideo = file.mimetype.startsWith('video/');
      const resourceType = isVideo ? 'video' : 'image';

      // Convert buffer to base64 for Cloudinary upload
      const base64File = file.buffer.toString('base64');
      const dataUri = `data:${file.mimetype};base64,${base64File}`;

      const result = await cloudinary.uploader.upload(dataUri, {
        folder: `sociofeed/${folder}`,
        resource_type: resourceType,
        transformation: isVideo
          ? [{ quality: 'auto', fetch_format: 'auto' }] // Optimize video
          : [
              { width: 800, height: 800, crop: 'limit' }, // Resize image
              { quality: 'auto', fetch_format: 'auto' }, // Optimize image
            ],
      });

      return {
        url: result.secure_url,
        type: resourceType, // Store whether it's an image or video
      };
    });

    const results = await Promise.all(uploadPromises);
    return results;
  } catch (error) {
    logger.error(`Cloudinary upload error: ${error.message}`);
    throw new Error('Failed to upload files to Cloudinary');
  }
};
