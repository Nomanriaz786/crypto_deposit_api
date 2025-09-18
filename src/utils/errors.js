class ApiError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = 'ApiError';
    Error.captureStackTrace(this, this.constructor);
  }
}

class ValidationError extends ApiError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

class NotFoundError extends ApiError {
  constructor(message = 'Resource not found') {
    super(message, 404);
    this.name = 'NotFoundError';
  }
}

class UnauthorizedError extends ApiError {
  constructor(message = 'Unauthorized access') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

class ConflictError extends ApiError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

module.exports = {
  ApiError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ConflictError
};