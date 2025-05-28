import * as Yup from 'yup';
import { AUTH_CONSTANTS } from '../constants/auth.js';

export const registerSchema = Yup.object({
  username: Yup.string()
    .matches(AUTH_CONSTANTS.REGEX_USERNAME, 'Username must be alphanumeric')
    .max(50, 'Username must be at most 50 characters')
    .required('Username is required'),
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
  password: Yup.string()
    .min(
      AUTH_CONSTANTS.MIN_PASSWORD_LENGTH,
      'Password must be at least 8 characters'
    )
    .matches(
      AUTH_CONSTANTS.REGEX_PASSWORD,
      'Password must include uppercase, lowercase, number, and special character (@#$%^&*!#)'
    )
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

export const loginSchema = Yup.object({
  usernameOrEmail: Yup.string().required('Username or email is required'),
  password: Yup.string().required('Password is required'),
});

export const forgotPasswordSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
});

export const resetPasswordSchema = Yup.object({
  token: Yup.string().required('Token is required'),
  password: Yup.string()
    .min(
      AUTH_CONSTANTS.MIN_PASSWORD_LENGTH,
      'Password must be at least 8 characters'
    )
    .matches(
      AUTH_CONSTANTS.REGEX_PASSWORD,
      'Password must include uppercase, lowercase, number, and special character (@#$%^&*!#)'
    )
    .required('Password is required'),
  confirmPassword: Yup.string()
    .oneOf([Yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

export const activateSchema = Yup.object({
  token: Yup.string().required('Token is required'),
});

export const resendActivationSchema = Yup.object({
  email: Yup.string()
    .email('Invalid email format')
    .required('Email is required'),
});
