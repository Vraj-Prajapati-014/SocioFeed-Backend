import express from 'express';
import cookieParser from 'cookie-parser';
import authRoutes from '../routes/authRoutes.js';
import { errorMiddleware } from '../middleware/errorMiddleware.js';

const app = express();

app.use(express.json());
app.use(cookieParser());
app.use('/auth', authRoutes);
app.use(errorMiddleware);

export default app;
