import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import routes from './src/routes/index.js';
import { errorMiddleware } from './src/middleware/errorMiddleware.js';
import logger from './src/config/logger.js';
import env from './src/config/env.js';
import cookieParser from 'cookie-parser';
import { configureCloudinary } from './src/config/cloudinary.js';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

configureCloudinary();

const app = express();
app.use(cookieParser());
app.use(
  cors({
    origin: env.APP_URL || 'http://localhost:5173', // Use env variable
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'], // Expanded headers
  })
);
app.use(express.json());
// app.use(`/api/${PROFILE_CONSTANTS.PROFILE_BASE_URL}`, profileRoutes);
app.use('/api', routes);

app.use(errorMiddleware);

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});
