import * as yup from 'yup';
import { AUTH_CONSTANTS } from '../constants/auth.js';

export const registerSchema = yup.object({
  username: yup
    .string()
    .matches(AUTH_CONSTANTS.REGEX_USERNAME, 'Username must be alphanumeric')
    .max(50, 'Username must be at most 50 characters')
    .required('Username is required'),
  email: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),
  password: yup
    .string()
    // .matches(
    //   AUTH_CONSTANTS.REGEX_PASSWORD,
    //   'Password must be at least 8 characters, include uppercase, lowercase, number, and special character'
    // )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});

export const loginSchema = yup.object({
  usernameOrEmail: yup.string().required('Username or email is required'),
  password: yup.string().required('Password is required'),
});

export const forgotPasswordSchema = yup.object({
  email: yup
    .string()
    .email('Invalid email format')
    .required('Email is required'),
});

export const resetPasswordSchema = yup.object({
  password: yup
    .string()
    .matches(
      AUTH_CONSTANTS.REGEX_PASSWORD,
      'Password must be at least 8 characters, include uppercase, lowercase, number, and special character'
    )
    .required('Password is required'),
  confirmPassword: yup
    .string()
    .oneOf([yup.ref('password')], 'Passwords must match')
    .required('Confirm password is required'),
});
