/**
 * Pay-in business service
 * Controllers → this layer → repositories + HZPay API
 */

const config = require('../config');
const { hzpayApiService } = require('./hzpayApi.service');
const { platformService } = require('./platform.service');
const {
  rechargeRepository,
  paymentOrderRepository,
  userRepository,
  logRepository,
} = require('../repositories');
const { generatePayinOrderId } = require('../helpers/orderId');
const { ORDER_STATUS, PAY_STATUS, ALL_PAY_TYPES, DEFAULT_PAY_TYPE } = require('../constants');
const { verifySignature } = require('../helpers/signature');
const { ValidationError, GatewayError, SignatureError } = require('../utils/errors');
const logger = require('../utils/logger');

class PaymentService {
  /**
   * JSON ACK expected by HZPay callbacks (placeholder until official docs).
   */
  acknowledgeWebhook() {
    return { code: 0, msg: 'success' };
  }

  _resolvePayType() {
    const payType = Number(config.hzpay.defaultPayType ?? DEFAULT_PAY_TYPE);
    if (!ALL_PAY_TYPES.includes(payType)) {
      throw new ValidationError('Invalid payment type configured', { payType });
    }
    return payType;
  }

  async createUserOrder(input, meta = {}) {
    const { amount, userId, user_mobile, recharge_type, goodsName } = input;

    if (String(userId) === '23414') {
      throw new ValidationError('Recharge not allowed');
    }

    if (!amount || Number(amount) <= 0) {
      throw new ValidationError('Valid amount is required');
    }

    if (!config.hzpay.notifyUrl) {
      throw new ValidationError('Notify URL is not configured');
    }

    logger.info('PaymentService', 'createUserOrder start', { userId, amount });

    const user = await userRepository.getStatus(userId);
    if (!user) throw new ValidationError('User not found', { userId });
    if (Number(user.status) !== 1) {
      throw new ValidationError('Not allowed to recharge - user account is not active');
    }

    const mchOrderId = generatePayinOrderId();
    const orderAmount = Number(amount);
    const payType = this._resolvePayType();

    logger.info('PaymentService', 'Calling HZPay createPayin', { mchOrderId, orderAmount, payType });

    const gatewayResult = await hzpayApiService.createPayinOrder(
      {
        mchOrderId,
        amount: orderAmount,
        payType,
        notifyUrl: config.hzpay.notifyUrl,
        returnUrl: config.hzpay.returnUrl,
        goodsName: goodsName || 'Recharge',
      },
      meta
    );

    const gw = gatewayResult.data;
    logger.info('PaymentService', 'HZPay response', {
      code: gw?.code,
      msg: gw?.msg,
      hasData: Boolean(gw?.data),
    });

    if (!gw || Number(gw.code) !== 0 || !gw.data) {
      throw new GatewayError('HZPay deposit create failed', { code: gw?.code });
    }

    const { orderNo, payUrl, amount: gwAmount } = gw.data;
    if (!payUrl) {
      throw new GatewayError('Failed to get payment URL from HZPay', { code: gw.code });
    }

    logger.info('PaymentService', 'Inserting recharge row', { mchOrderId, orderNo });

    await rechargeRepository.createPending({
      orderId: mchOrderId,
      userId,
      userMobile: user_mobile,
      amount: orderAmount,
      rechargeType: recharge_type || 'hzpay',
    });

    await paymentOrderRepository
      .create({
        merchant_id: String(config.hzpay.merchantId),
        merchant_order_no: mchOrderId,
        gateway_order_no: orderNo || null,
        user_id: userId,
        order_amount: orderAmount,
        pay_type: payType,
        status: ORDER_STATUS.PENDING,
        pay_url: payUrl,
        notify_url: config.hzpay.notifyUrl,
        return_url: config.hzpay.returnUrl,
        extra: `uid=${userId}`,
        raw_request: { amount, userId, mchOrderId, payType },
        raw_response: gw,
        request_id: meta.requestId || null,
      })
      .catch((err) => logger.warn('PaymentService', 'PaymentOrder insert skipped', { error: err.message }));

    return {
      paymentUrl: payUrl,
      orderNo,
      merchantOrderNo: mchOrderId,
      orderAmount: gwAmount != null ? Number(gwAmount) : orderAmount,
      payStatus: gw.data.payStatus,
    };
  }

  async createPayin(input, meta = {}) {
    if (!input.amount && !input.orderAmount) {
      throw new ValidationError('Valid amount is required');
    }

    const mchOrderId = input.mchOrderId || input.merchantOrderNo || generatePayinOrderId();
    const amount = Number(input.amount ?? input.orderAmount);
    const payType = this._resolvePayType();
    const notifyUrl = input.notifyUrl || config.hzpay.notifyUrl;

    if (!notifyUrl) throw new ValidationError('Notify URL is required');
    if (!(amount > 0)) throw new ValidationError('Valid amount is required');

    const result = await hzpayApiService.createPayinOrder(
      {
        mchOrderId,
        amount,
        payType,
        notifyUrl,
        returnUrl: input.returnUrl || config.hzpay.returnUrl,
        goodsName: input.goodsName || 'Recharge',
      },
      meta
    );

    const gw = result.data;
    if (!gw || Number(gw.code) !== 0) {
      throw new GatewayError('Payin create failed', { code: gw?.code });
    }

    await paymentOrderRepository
      .create({
        merchant_id: String(config.hzpay.merchantId),
        merchant_order_no: mchOrderId,
        gateway_order_no: gw.data?.orderNo || null,
        user_id: input.userId || null,
        order_amount: amount,
        pay_type: payType,
        status: ORDER_STATUS.PENDING,
        pay_url: gw.data?.payUrl || null,
        notify_url: notifyUrl,
        return_url: input.returnUrl || config.hzpay.returnUrl,
        extra: input.extra || null,
        raw_request: input,
        raw_response: gw,
        request_id: meta.requestId || null,
      })
      .catch(() => {});

    return gw.data;
  }

  /**
   * Default callback payload (placeholder — replace when official docs arrive):
   * { mchNo, mchOrderId, orderNo, amount, payStatus, sign, ... }
   * payStatus: "1" success, "2" failed
   */
  async processPayinWebhook(payload, meta = {}) {
    const signatureValid = verifySignature(payload, config.hzpay.secret, {
      forceAmountDecimals: true,
    });

    const mchOrderId = payload.mchOrderId || payload.merchantOrderNo || payload.mchOrderNo;

    await logRepository
      .createWebhook({
        request_id: meta.requestId,
        correlation_id: meta.correlationId,
        merchant_id: payload.mchNo || config.hzpay.merchantId,
        order_no: mchOrderId || payload.orderNo,
        direction: 'inbound',
        method: 'POST',
        path: '/api/payment/webhook',
        status: 'RECEIVED',
        webhook_code: payload.payStatus != null ? Number(payload.payStatus) : null,
        signature_valid: signatureValid,
        request_payload: payload,
        raw_payload: payload,
        processed: false,
      })
      .catch(() => {});

    if (!signatureValid) {
      logger.error('PaymentWebhook', 'Invalid signature', { mchOrderId });
      throw new SignatureError('Webhook signature verification failed');
    }

    if (!mchOrderId) {
      logger.warn('PaymentWebhook', 'Missing mchOrderId');
      return { processed: false, reason: 'missing_order' };
    }

    const payStatus = String(payload.payStatus ?? payload.status ?? '');

    if (payStatus === PAY_STATUS.SUCCESS) {
      const affected = await rechargeRepository.markSuccessIfPending(mchOrderId);
      if (affected === 0) {
        logger.warn('PaymentWebhook', 'Already processed or not found', { mchOrderId });
        return { processed: false, reason: 'duplicate_or_missing' };
      }

      await paymentOrderRepository
        .updateByMerchantOrderNo(mchOrderId, {
          status: ORDER_STATUS.SUCCESS,
          utr: payload.utr || null,
          gateway_order_no: payload.orderNo || undefined,
          paid_at: payload.orderDate ? new Date(payload.orderDate) : new Date(),
        })
        .catch(() => {});

      const recharge = await rechargeRepository.findByOrderId(mchOrderId);
      if (recharge) {
        try {
          await platformService.processSuccessfulDeposit({
            userId: recharge.userId,
            amount: parseFloat(recharge.recharge_amount),
            orderId: mchOrderId,
          });
        } catch (platformErr) {
          logger.logError(
            'PaymentWebhook',
            `CRITICAL: Platform credit failed for ${mchOrderId} — manual intervention required`,
            platformErr
          );
        }
      }

      return { processed: true, status: 'success' };
    }

    if (payStatus === PAY_STATUS.FAILED) {
      await rechargeRepository.markFailed(mchOrderId);
      await paymentOrderRepository
        .updateByMerchantOrderNo(mchOrderId, {
          status: ORDER_STATUS.FAILED,
        })
        .catch(() => {});
      return { processed: true, status: 'failed' };
    }

    return { processed: false, reason: 'unknown_status', payStatus };
  }
}

module.exports = {
  PaymentService,
  paymentService: new PaymentService(),
};
