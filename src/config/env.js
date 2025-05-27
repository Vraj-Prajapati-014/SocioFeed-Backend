import { cleanEnv, str, port, url, email } from 'envalid';

const env = cleanEnv(process.env, {
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
});

export default env;
