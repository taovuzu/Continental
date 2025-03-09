class ApiResponse {
  constructor(statusCode, data = null, message = "Success", success = true) {
    this.success = success !== false;
    this.statusCode = statusCode;
    this.message = message;
    this.data = data;
    this.timestamp = new Date().toISOString();
    this.path = null;
  }

  static success(data = null, message = "Success", statusCode = 200) {
    return new ApiResponse(statusCode, data, message, true);
  }

  static created(data = null, message = "Resource created successfully") {
    return new ApiResponse(201, data, message, true);
  }

  static noContent(message = "No content") {
    return new ApiResponse(204, null, message, true);
  }

  static error(statusCode, message = "Error", errors = []) {
    return new ApiResponse(statusCode, null, message, false);
  }

  withRequest(req) {
    this.path = req && (req.originalUrl || req.url) ? (req.originalUrl || req.url) : null;
    this.timestamp = new Date().toISOString();
    return this;
  }

  toJSON() {
    return {
      success: this.success,
      statusCode: this.statusCode,
      message: this.message,
      data: this.data,
      timestamp: this.timestamp,
      path: this.path
    };
  }

  send(res) {
    return res.status(this.statusCode).json(this.toJSON());
  }
}

export { ApiResponse };