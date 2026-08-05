/**
 * Reusable Axios client for HZPay upstream API
 * - Base URL from config
 * - Timeout from env
 * - Retry 3x only for network/timeout + 429/502/503/504
 * - Never retry validation / merchant / signature business errors
 */

const axios = require('axios');
const axiosRetry = require('axios-retry').default || require('axios-retry');
const config = require('../config');
const logger = require('../utils/logger');
const { RETRYABLE_CODES, RETRYABLE_HTTP_STATUSES } = require('../constants');

const isRetryableError = (error) => {
  if (!error) return false;

  if (error.response) {
    const data = error.response.data;
    const msg = String(data?.msg || data?.message || '').toLowerCase();
    if (
      msg.includes('sign') ||
      msg.includes('valid') ||
      msg.includes('merchant') ||
      msg.includes('already exists') ||
      msg.includes('tracking order') ||
      msg.includes('duplicate') ||
      msg.includes('param')
    ) {
      return false;
    }

    const status = error.response.status;
    if (RETRYABLE_HTTP_STATUSES.includes(status)) return true;
    if (status >= 400 && status < 500) return false;
  }

  if (axiosRetry.isNetworkError(error)) return true;
  if (axiosRetry.isRetryableError(error)) return true;
  if (error.code && RETRYABLE_CODES.includes(error.code)) return true;
  if (error.message && /timeout|network error|ECONNRESET/i.test(error.message)) return true;
  return false;
};

const createHzpayClient = () => {
  const client = axios.create({
    baseURL: config.hzpay.baseURL,
    timeout: config.hzpay.timeoutMs,
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
  });

  axiosRetry(client, {
    retries: config.hzpay.retryCount,
    retryDelay: axiosRetry.exponentialDelay,
    retryCondition: isRetryableError,
    shouldResetTimeout: true,
    onRetry: (retryCount, error, requestConfig) => {
      logger.warn('AxiosClient', `Retry #${retryCount}`, {
        url: requestConfig?.url,
        code: error?.code,
        status: error?.response?.status,
        message: error?.message,
      });
    },
  });

  client.interceptors.request.use((req) => {
    req.metadata = { start: Date.now() };
    const safePayload = req.data ? { ...req.data } : undefined;
    if (safePayload?.sign) safePayload.sign = '[REDACTED]';
    if (safePayload?.accountNo) {
      safePayload.accountNo = String(safePayload.accountNo).replace(/.(?=.{4})/g, '*');
    }

    logger.gatewayLogger.info('Outgoing HZPay request', {
      method: req.method,
      url: `${req.baseURL || ''}${req.url || ''}`,
      headers: req.headers,
      payload: safePayload,
    });
    return req;
  });

  client.interceptors.response.use(
    (res) => {
      const ms = Date.now() - (res.config.metadata?.start || Date.now());
      logger.gatewayLogger.info('HZPay response', {
        url: `${res.config.baseURL || ''}${res.config.url || ''}`,
        statusCode: res.status,
        executionMs: ms,
        data: res.data,
      });
      logger.responseLogger.info('HZPay response body', {
        statusCode: res.status,
        executionMs: ms,
        data: res.data,
      });
      res.executionMs = ms;
      res.retryCount = res.config['axios-retry']?.retryCount || 0;
      return res;
    },
    (err) => {
      const cfg = err.config || {};
      const ms = Date.now() - (cfg.metadata?.start || Date.now());
      logger.gatewayLogger.error('HZPay request failed', {
        url: `${cfg.baseURL || ''}${cfg.url || ''}`,
        statusCode: err.response?.status,
        executionMs: ms,
        code: err.code,
        message: err.message,
        data: err.response?.data,
      });
      err.executionMs = ms;
      err.retryCount = cfg['axios-retry']?.retryCount || 0;
      return Promise.reject(err);
    }
  );

  return client;
};

const hzpayClient = createHzpayClient();

module.exports = {
  hzpayClient,
  createHzpayClient,
  isRetryableError,
};
