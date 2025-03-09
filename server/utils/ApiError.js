class ApiError extends Error {
  constructor(statusCode, message = "Something went wrong", errors = [], stack = "", code = null) {
    super(message);
    this.statusCode = statusCode;
    this.message = message;
    this.errors = errors;
    this.code = code || `HTTP_${statusCode}`;
    this.success = false;
    this.timestamp = new Date().toISOString();
    this.path = null;

    if (stack) {
      this.stack = stack;
    } else {
      Error.captureStackTrace(this, this.constructor);
    }
  }

  static badRequest(message = "Bad request", errors = []) {
    return new ApiError(400, message, errors);
  }

  static unauthorized(message = "Unauthorized", errors = []) {
    return new ApiError(401, message, errors);
  }

  static forbidden(message = "Forbidden", errors = []) {
    return new ApiError(403, message, errors);
  }

  static notFound(message = "Resource not found", errors = []) {
    return new ApiError(404, message, errors);
  }

  static conflict(message = "Conflict", errors = []) {
    return new ApiError(409, message, errors);
  }

  static unprocessableEntity(message = "Unprocessable entity", errors = []) {
    return new ApiError(422, message, errors);
  }

  static internal(message = "Internal server error", errors = []) {
    return new ApiError(500, message, errors);
  }

  static serviceUnavailable(message = "Service unavailable", errors = []) {
    return new ApiError(503, message, errors);
  }
}

export { ApiError };