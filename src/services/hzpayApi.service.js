/**
 * Low-level HZPay HTTP API service — deposit + payout only.
 */

const config = require('../config');
const { hzpayClient } = require('../utils/axiosClient');
const { signParams, formatAmountForGateway } = require('../helpers/signature');
const { HZPAY_PATHS, GATEWAY_SUCCESS_CODE, BANK_CODES, DEFAULT_PAY_TYPE } = require('../constants');
const { GatewayError, mapGatewayError } = require('../utils/errors');
const logger = require('../utils/logger');
const { logRepository } = require('../repositories');

class HzpayApiService {
  constructor({
    client = hzpayClient,
    merchantId = config.hzpay.merchantId,
    secret = config.hzpay.secret,
    version = config.hzpay.version,
    signType = config.hzpay.signType,
  } = {}) {
    this.client = client;
    this.merchantId = merchantId;
    this.secret = secret;
    this.version = version;
    this.signType = signType;
  }

  _assertConfig() {
    if (!this.merchantId) throw new GatewayError('HZPAY_MERCHANT_ID is not configured');
    if (!this.secret || this.secret === 'YOUR_SECRET_HERE') {
      throw new GatewayError('HZPAY_SECRET_KEY is not configured');
    }
  }

  _signed(params, options = {}) {
    this._assertConfig();
    return signParams(
      {
        mchNo: this.merchantId,
        signType: this.signType,
        version: this.version,
        ...params,
      },
      this.secret,
      options
    );
  }

  async _post(path, payload, meta = {}) {
    const start = Date.now();
    const logPayload = { ...payload, sign: payload.sign ? '[REDACTED]' : undefined };

    try {
      const response = await this.client.post(path, payload);
      const executionMs = response.executionMs || Date.now() - start;
      const retryCount = response.retryCount || 0;

      await logRepository
        .createGateway({
          request_id: meta.requestId,
          correlation_id: meta.correlationId,
          merchant_id: payload.mchNo || this.merchantId,
          order_no: payload.mchOrderId || payload.orderNo || null,
          direction: 'outbound',
          method: 'POST',
          path,
          status: 'SUCCESS',
          gateway_status: String(response.data?.code ?? ''),
          http_status: response.status,
          execution_ms: executionMs,
          retry_count: retryCount,
          headers: response.config?.headers || null,
          request_payload: logPayload,
          response_payload: response.data,
          raw_payload: response.data,
        })
        .catch(() => {});

      return {
        data: response.data,
        status: response.status,
        executionMs,
        retryCount,
      };
    } catch (err) {
      await logRepository
        .createGateway({
          request_id: meta.requestId,
          correlation_id: meta.correlationId,
          merchant_id: payload.mchNo || this.merchantId,
          order_no: payload.mchOrderId || payload.orderNo || null,
          direction: 'outbound',
          method: 'POST',
          path,
          status: 'FAILED',
          gateway_status: String(err.response?.data?.code ?? err.code ?? ''),
          http_status: err.response?.status || null,
          execution_ms: err.executionMs || Date.now() - start,
          retry_count: err.retryCount || 0,
          request_payload: logPayload,
          response_payload: err.response?.data || null,
          error_message: err.message,
          stack_trace: err.stack,
        })
        .catch(() => {});

      const rawMsg = err.response?.data?.msg || err.response?.data?.message || err.message;
      throw mapGatewayError(rawMsg, err.response?.data || null);
    }
  }

  /**
   * Deposit — POST /gateway/order/create
   * Success ONLY when code == 0
   */
  async createPayinOrder(input, meta = {}) {
    // Amount string must match signed value exactly (docs example: amount=100, not 100.00)
    const amount = formatAmountForGateway(input.amount);
    const body = this._signed({
      mchOrderId: input.mchOrderId,
      payType: String(input.payType ?? config.hzpay.defaultPayType ?? DEFAULT_PAY_TYPE),
      notifyUrl: input.notifyUrl || config.hzpay.notifyUrl,
      ...(input.returnUrl || config.hzpay.returnUrl
        ? { returnUrl: input.returnUrl || config.hzpay.returnUrl }
        : {}),
      amount,
      goodsName: input.goodsName || 'Recharge',
    });

    logger.info('HzpayApi', 'createPayinOrder', {
      mchOrderId: body.mchOrderId,
      amount: body.amount,
      payType: body.payType,
    });

    const result = await this._post(HZPAY_PATHS.CREATE_ORDER, body, meta);
    const gw = result.data;

    if (!gw || Number(gw.code) !== GATEWAY_SUCCESS_CODE) {
      throw mapGatewayError(gw?.msg || gw?.message || 'HZPay deposit create failed', gw);
    }

    return result;
  }

  /**
   * Payout — POST /gateway/payout/create
   * Success ONLY when code == 0
   */
  async createPayoutOrder(input, meta = {}) {
    const amount = formatAmountForGateway(input.amount);
    const bankCode = input.bankCode || (input.upi ? BANK_CODES.UPI : BANK_CODES.IMPS);

    const body = this._signed({
      mchOrderId: input.mchOrderId,
      notifyUrl: input.notifyUrl || config.hzpay.payoutNotifyUrl,
      amount,
      bankCode: String(bankCode),
      accountNo: String(input.accountNo),
      name: String(input.name),
      ifsc: String(input.ifsc),
      ...(input.upi ? { upi: String(input.upi) } : {}),
    });

    logger.info('HzpayApi', 'createPayoutOrder', {
      mchOrderId: body.mchOrderId,
      bankCode: body.bankCode,
      amount: body.amount,
    });

    const result = await this._post(HZPAY_PATHS.CREATE_PAYOUT, body, meta);
    const gw = result.data;

    if (!gw || Number(gw.code) !== GATEWAY_SUCCESS_CODE) {
      throw mapGatewayError(gw?.msg || gw?.message || 'HZPay payout create failed', gw);
    }

    return result;
  }
}

module.exports = {
  HzpayApiService,
  hzpayApiService: new HzpayApiService(),
};
