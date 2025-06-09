import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import routes from './src/routes/index.js';
import { errorMiddleware } from './src/middleware/errorMiddleware.js';
import logger from './src/config/logger.js';
import env from './src/config/env.js';
import cookieParser from 'cookie-parser';
import { configureCloudinary } from './src/config/cloudinary.js';
import initializeSocket from './src/config/socket.js';
import { createServer } from 'http';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

configureCloudinary();

const app = express();
const server = createServer(app);

// Initialize Socket.IO with the HTTP server
initializeSocket(server, app);

app.use(cookieParser());
app.use(
  cors({
    origin: env.APP_URL || 'http://localhost:5173',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  })
);
app.use(express.json());
app.use('/api', routes);

app.use(errorMiddleware);

// Use server.listen instead of app.listen to start the HTTP server with Socket.IO
server.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});
