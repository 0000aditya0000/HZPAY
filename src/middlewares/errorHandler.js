const logger = require('../utils/logger');
const {
  AppError,
  ValidationError,
  GatewayError,
  SignatureError,
  DuplicateTransactionError,
} = require('../utils/errors');

const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
    error: { path: req.originalUrl },
  });
};

const errorHandler = (err, req, res, next) => {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = 500;
  let message = 'Internal server error';
  let errorPayload = {};

  if (err instanceof DuplicateTransactionError) {
    statusCode = 409;
    message = err.message;
    errorPayload = { code: err.code || 'DUPLICATE_TRANSACTION', ...(err.details || {}) };
  } else if (err instanceof ValidationError) {
    statusCode = 400;
    message = err.message;
    errorPayload = err.details || {};
  } else if (err instanceof SignatureError) {
    statusCode = 401;
    message = err.message;
  } else if (err instanceof GatewayError) {
    statusCode = err.statusCode || 502;
    message = err.message;
    errorPayload = err.details || {};
  } else if (err instanceof AppError) {
    statusCode = err.statusCode || 500;
    message = err.message;
    errorPayload = err.details || {};
  } else if (err?.isJoi) {
    statusCode = 400;
    message = 'Validation Failed';
    errorPayload = err.details;
  } else if (err?.name === 'SequelizeDatabaseError' || err?.name === 'SequelizeValidationError') {
    statusCode = 500;
    message = 'Database error';
    errorPayload = { sqlMessage: err.parent?.sqlMessage || err.message };
  } else if (err?.isAxiosError) {
    statusCode = err.response?.status || 502;
    message = 'Payment gateway request failed';
    errorPayload = { code: err.response?.data?.code || err.code };
  } else if (err?.code === 'ECONNABORTED' || /timeout/i.test(err?.message || '')) {
    statusCode = 504;
    message = 'Gateway timeout';
  }

  logger.logError('ErrorHandler', message, err);

  return res.status(statusCode).json({
    success: false,
    message,
    error: errorPayload,
    requestId: req.requestId,
  });
};

const registerProcessHandlers = () => {
  process.on('unhandledRejection', (reason) => {
    logger.exceptionLogger.error('Unhandled Promise Rejection', {
      reason: reason instanceof Error ? reason.message : reason,
      stack: reason instanceof Error ? reason.stack : undefined,
    });
  });

  process.on('uncaughtException', (err) => {
    logger.exceptionLogger.error('Uncaught Exception', {
      error: err.message,
      stack: err.stack,
    });
  });
};

module.exports = {
  notFoundHandler,
  errorHandler,
  registerProcessHandlers,
};
