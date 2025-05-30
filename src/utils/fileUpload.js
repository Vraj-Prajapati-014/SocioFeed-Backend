import multer from 'multer';
import logger from '../config/logger.js';

const storage = multer.memoryStorage();

const upload = multer({
  storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // Limit file size to 5MB
  },
  fileFilter: (req, file, cb) => {
    // Accept only image files
    if (!file.mimetype.startsWith('image/')) {
      logger.warn('Invalid file type uploaded', { mimetype: file.mimetype });
      return cb(new Error('Only image files are allowed'), false);
    }
    cb(null, true);
  },
});

export default upload;
