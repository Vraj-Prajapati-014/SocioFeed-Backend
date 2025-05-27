import {
  registerUser,
  loginUser,
  activateAccount,
  forgotPassword,
  resetPassword,
  logoutUser,
} from '../services/authService.js';
// import logger from '../config/logger.js';/

export const register = async (req, res, next) => {
  try {
    const result = await registerUser(req.body);
    res.status(201).json(result);
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const result = await loginUser(req.body);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const activate = async (req, res, next) => {
  try {
    const result = await activateAccount(req.params.token);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const forgot = async (req, res, next) => {
  try {
    const result = await forgotPassword(req.body.email);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const reset = async (req, res, next) => {
  try {
    const result = await resetPassword(req.params.token, req.body.password);
    res.json(result);
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const result = await logoutUser(req.body.refreshToken);
    res.json(result);
  } catch (error) {
    next(error);
  }
};
