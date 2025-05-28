import winston from 'winston';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

const LOG_DIR = process.env.LOG_DIR || 'logs';
const LOG_LEVEL = process.env.LOG_LEVEL || 'debug';

const logger = winston.createLogger({
  level: LOG_LEVEL,
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.json()
  ),
  transports: [
    new winston.transports.Console(),
    new winston.transports.File({
      filename: `${LOG_DIR}/error.log`,
      level: 'error',
    }),
    new winston.transports.File({ filename: `${LOG_DIR}/combined.log` }),
  ],
});

if (!fs.existsSync(LOG_DIR)) {
  fs.mkdirSync(LOG_DIR);
}

export default logger;
