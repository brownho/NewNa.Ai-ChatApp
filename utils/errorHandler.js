// Standard error responses
const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR',
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  NOT_FOUND: 'NOT_FOUND',
  RATE_LIMIT_ERROR: 'RATE_LIMIT_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  EXTERNAL_API_ERROR: 'EXTERNAL_API_ERROR',
  FILE_UPLOAD_ERROR: 'FILE_UPLOAD_ERROR',
  SERVER_ERROR: 'SERVER_ERROR'
};

// Error response formatter
const createErrorResponse = (type, message, details = null) => {
  const errorMap = {
    [ErrorTypes.VALIDATION_ERROR]: { status: 400, code: 'BAD_REQUEST' },
    [ErrorTypes.AUTHENTICATION_ERROR]: { status: 401, code: 'UNAUTHORIZED' },
    [ErrorTypes.AUTHORIZATION_ERROR]: { status: 403, code: 'FORBIDDEN' },
    [ErrorTypes.NOT_FOUND]: { status: 404, code: 'NOT_FOUND' },
    [ErrorTypes.RATE_LIMIT_ERROR]: { status: 429, code: 'TOO_MANY_REQUESTS' },
    [ErrorTypes.DATABASE_ERROR]: { status: 500, code: 'INTERNAL_ERROR' },
    [ErrorTypes.EXTERNAL_API_ERROR]: { status: 502, code: 'BAD_GATEWAY' },
    [ErrorTypes.FILE_UPLOAD_ERROR]: { status: 400, code: 'UPLOAD_FAILED' },
    [ErrorTypes.SERVER_ERROR]: { status: 500, code: 'INTERNAL_ERROR' }
  };
  
  const errorInfo = errorMap[type] || errorMap[ErrorTypes.SERVER_ERROR];
  
  return {
    error: {
      type: type,
      code: errorInfo.code,
      message: message,
      details: details,
      timestamp: new Date().toISOString()
    },
    status: errorInfo.status
  };
};

// Async error wrapper
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

// Database error handler
const handleDatabaseError = (err, operation) => {
  console.error(`Database error during ${operation}:`, err);
  
  // Check for common database errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    if (err.message.includes('UNIQUE')) {
      return createErrorResponse(
        ErrorTypes.VALIDATION_ERROR,
        'This record already exists',
        { field: 'unknown' }
      );
    }
  }
  
  return createErrorResponse(
    ErrorTypes.DATABASE_ERROR,
    'A database error occurred',
    process.env.NODE_ENV === 'development' ? err.message : null
  );
};

// Validation error formatter
const formatValidationErrors = (errors) => {
  return createErrorResponse(
    ErrorTypes.VALIDATION_ERROR,
    'Validation failed',
    { errors: errors }
  );
};

module.exports = {
  ErrorTypes,
  createErrorResponse,
  asyncHandler,
  handleDatabaseError,
  formatValidationErrors
};