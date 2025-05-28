export const AUTH_CONSTANTS = {
  JWT_TOKEN_EXPIRY: 60 * 60 * 1000,
  MIN_PASSWORD_LENGTH: 8,
  REFRESH_TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000,
  ACTIVATION_TOKEN_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours
  PASSWORD_RESET_TOKEN_EXPIRY: 60 * 60 * 1000, // 1 hour
  REGEX_USERNAME: /^[a-zA-Z0-9]+$/,
  REGEX_PASSWORD:
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@#$%^&*!])[A-Za-z\d@#$%^&*!]{8,}$/,
};
