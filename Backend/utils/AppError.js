class AppError extends Error {
  constructor(statusCode, code, message, extra = {}) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.code = code;
    this.extra = extra || {};
  }

  toBody() {
    return {
      ...(this.code ? { code: this.code } : {}),
      message: this.message,
      ...this.extra,
    };
  }
}

module.exports = AppError;
