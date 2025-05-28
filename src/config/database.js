import { PrismaClient } from '../../generated/prisma/client.js';
import logger from './logger.js';

const prisma = new PrismaClient();

async function connectDb() {
  try {
    await prisma.$connect();
    logger.info('Connected to database successfully');
  } catch (error) {
    logger.error('Failed to connect to database', { error: error.message });
    throw error; // Let the app handle the error (e.g., exit)
  }
}

// Connect when the module is imported
connectDb();

export default prisma;
