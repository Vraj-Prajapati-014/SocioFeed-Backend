import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import routes from './src/routes/index.js';
import { errorMiddleware } from './src/middleware/errorMiddleware.js';
import logger from './src/config/logger.js';
import env from './src/config/env.js';

dotenv.config({ path: `.env.${process.env.NODE_ENV || 'development'}` });

const app = express();

app.use(cors());
app.use(express.json());
app.use('/api', routes);
app.use(errorMiddleware);

app.listen(env.PORT, () => {
  logger.info(`Server running on port ${env.PORT}`);
});
