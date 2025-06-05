import { cleanEnv, str, port, url, email } from 'envalid';
import fs from 'fs';
import path from 'path';
import 'dotenv/config';

const envFile = path.join(process.cwd(), '.env');
if (!fs.existsSync(envFile)) {
  console.warn(
    'Warning: .env file not found. Using default environment variables.'
  );
}

const env = cleanEnv(
  process.env,
  {
    NODE_ENV: str({
      choices: ['development', 'production', 'test'],
      default: 'development',
      desc: 'Node environment',
    }),
    DATABASE_URL: url({ desc: 'PostgreSQL database URL' }),
    PORT: port({ default: 5000, desc: 'Server port' }),
    JWT_SECRET: str({ desc: 'JWT secret key' }),
    EMAIL_HOST: str({ desc: 'Email server host' }),
    EMAIL_PORT: port({ desc: 'Email server port' }),
    EMAIL_USER: email({ desc: 'Email server user' }),
    EMAIL_PASS: str({ desc: 'Email server password' }),
    APP_URL: url({ desc: 'Base URL for activation/reset links' }),
    LOG_DIR: str({ desc: 'Directory for log files (e.g., logs)' }),
    LOG_LEVEL: str({
      choices: ['error', 'warn', 'info', 'debug'],
      default: 'debug',
      desc: 'Logging level (error, warn, info, debug)',
    }),
    CLOUDINARY_CLOUD_NAME: str({ desc: 'cloudinary cloud name' }),
    CLOUDINARY_API_KEY: str({ desc: 'cloudinary API Key' }),
    CLOUDINARY_API_SECRET: str({ desc: 'cloudinary api secreat' }),
    CLOUDINARY_UPLOAD_PRESET: str({ desc: 'cloudinary upload preset' }),
    SOCKET_PATH: str({ default: '/socket.io', desc: 'Socket.IO path' }),
  },
  {
    strict: true,
    dotEnvPath: envFile,
    reporter: ({ errors }) => {
      if (Object.keys(errors).length > 0) {
        console.error('Environment variable validation failed:');
        Object.entries(errors).forEach(([key, error]) => {
          console.error(`- ${key}: ${error.message || 'Invalid value'}`);
        });
        process.exit(1);
      }
    },
  }
);

export default env;
