const mongoose = require('mongoose');
const config = require('../config');
const logger = require('../utils/logger');

// Custom Error class for API specific errors
class ApiError extends Error {
  constructor(statusCode, message, isOperational = true, stack = '') {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = isOperational; // Operational errors are expected (e.g., user input error)
    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

// Middleware to convert certain errors to ApiError
const errorConverter = (err, req, res, next) => {
  let error = err;
  if (!(error instanceof ApiError)) {
    const statusCode =
      error.statusCode || (error instanceof mongoose.Error ? 400 : 500);
    const message = error.message || 'Internal Server Error';
    // For non-operational errors, don't expose detailed stack in production unless necessary
    error = new ApiError(statusCode, message, false, config.env === 'development' ? err.stack : undefined);
  }
  next(error);
};

// Main error handling middleware
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  let { statusCode, message } = err;

  // For non-operational errors in production, send a generic message
  if (config.env === 'production' && !err.isOperational) {
    statusCode = 500;
    message = 'An unexpected error occurred. Please try again later.';
  }

  res.locals.errorMessage = err.message; // For potential server-side logging if needed

  const response = {
    success: false,
    message,
    ...(config.env === 'development' && { stack: err.stack }), // Include stack in development
  };

  if (config.env === 'development' || err.isOperational) { // Log all errors in dev, only operational in prod for less noise (can be adjusted)
    logger.error(`[ErrorHandler] Status: ${statusCode}, Message: ${message}, Stack: ${err.stack || 'N/A'}`);
  } else if (config.env === 'production' && !err.isOperational) {
    logger.error(`[ErrorHandler] Non-operational error: Status: ${statusCode}, Message: ${message}, Original Error: ${err.message}`);
  }


  res.status(statusCode).json(response);
};

module.exports = {
  ApiError,
  errorConverter,
  errorHandler,
};