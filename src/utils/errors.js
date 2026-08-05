class AppError extends Error {
  constructor(message, statusCode = 500, details = null) {
    super(message);
    this.name = 'AppError';
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

class ValidationError extends AppError {
  constructor(message, details = null) {
    super(message, 400, details);
    this.name = 'ValidationError';
  }
}

class GatewayError extends AppError {
  constructor(message, details = null, statusCode = 502) {
    super(message, statusCode, details);
    this.name = 'GatewayError';
  }
}

class SignatureError extends AppError {
  constructor(message = 'Invalid signature') {
    super(message, 401);
    this.name = 'SignatureError';
  }
}

class DuplicateTransactionError extends AppError {
  constructor(message = 'Duplicate Transaction Error', details = null) {
    super(message, 409, details);
    this.name = 'DuplicateTransactionError';
    this.code = 'DUPLICATE_TRANSACTION';
  }
}

/**
 * Map raw HZPay upstream messages to standardized AppErrors.
 * Never expose raw gateway messages to API clients via this mapper's return value
 * when a known mapping exists.
 */
const mapGatewayError = (rawMessage, details = null) => {
  const msg = String(rawMessage || '').toLowerCase();

  if (
    msg.includes('already exists') ||
    msg.includes('tracking order') ||
    msg.includes('duplicate')
  ) {
    return new DuplicateTransactionError('Duplicate Transaction Error', details);
  }

  if (msg.includes('sign') || msg.includes('signature')) {
    return new SignatureError('Invalid signature');
  }

  if (msg.includes('valid') || msg.includes('param') || msg.includes('required')) {
    return new ValidationError('Invalid request parameters', details);
  }

  return new GatewayError('Payment gateway request failed', details);
};

module.exports = {
  AppError,
  ValidationError,
  GatewayError,
  SignatureError,
  DuplicateTransactionError,
  mapGatewayError,
};
