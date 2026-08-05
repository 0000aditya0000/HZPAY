require('dotenv').config();

const toInt = (v, fallback) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) ? n : fallback;
};

const toFloat = (v, fallback) => {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : fallback;
};

const config = Object.freeze({
  env: process.env.NODE_ENV || 'development',
  port: toInt(process.env.PORT, 3011),
  allowedOrigins: (process.env.ALLOWED_ORIGINS || '*').split(',').map((s) => s.trim()),
  bodyLimit: process.env.BODY_LIMIT || '1mb',
  rateLimit: {
    windowMs: toInt(process.env.RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
    max: toInt(process.env.RATE_LIMIT_MAX, 100),
  },

  hzpay: {
    baseURL: (process.env.HZPAY_BASE_URL || 'https://api.hzpay.968.run').replace(/\/$/, ''),
    merchantId: process.env.HZPAY_MERCHANT_ID || '',
    secret: process.env.HZPAY_SECRET_KEY || '',
    version: process.env.HZPAY_VERSION || '1.0',
    signType: process.env.HZPAY_SIGN_TYPE || 'SHA512',
    timeoutMs: toInt(process.env.HZPAY_TIMEOUT_MS || process.env.HZPAY_TIMEOUT, 30000),
    retryCount: toInt(process.env.HZPAY_RETRY_COUNT, 3),
    defaultPayType: toInt(process.env.HZPAY_DEFAULT_PAY_TYPE, 101),
    notifyUrl: process.env.HZPAY_NOTIFY_URL || process.env.NOTIFY_URL || '',
    payoutNotifyUrl: process.env.HZPAY_PAYOUT_NOTIFY_URL || process.env.PAYOUT_NOTIFY_URL || '',
    returnUrl: process.env.RETURN_URL || '',
  },

  db: {
    host: process.env.DB_HOST || 'localhost',
    port: toInt(process.env.DB_PORT, 3306),
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'skillpay',
    logging: process.env.DB_LOGGING === 'true',
    syncLogTables: process.env.DB_SYNC_LOG_TABLES !== 'false',
  },

  platform: {
    baseURL: (process.env.PLATFORM_BASE_URL || 'https://api.rollix777.com').replace(/\/$/, ''),
    walletBonusMultiplier: toFloat(process.env.WALLET_BONUS_MULTIPLIER, 1.1),
  },

  logLevel: process.env.LOG_LEVEL || 'info',
});

module.exports = config;
