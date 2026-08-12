/**
 * Payout business service
 */

const config = require('../config');
const { hzpayApiService } = require('./hzpayApi.service');
const {
  withdrawlRepository,
  payoutOrderRepository,
  logRepository,
} = require('../repositories');
const { generatePayoutOrderId } = require('../helpers/orderId');
const { ORDER_STATUS, PAY_STATUS, WITHDRAW_STATUS, BANK_CODES } = require('../constants');
const { verifySignature } = require('../helpers/signature');
const { ValidationError, GatewayError, SignatureError } = require('../utils/errors');
const logger = require('../utils/logger');
const { platformService } = require('./platform.service');

class PayoutService {
  /**
   * App-facing payout create (SkillPay-compatible body)
   * Body: withdrawId, amount, bankNo, ifsc, name, upi?, bankCode?
   */
  async createPayout(input, meta = {}) {
    const withdrawId = input.withdrawId || input.withdrawalId;
    const {
      amount,
      orderAmount,
      bankNo,
      cardNumber,
      accountNo,
      ifsc,
      name,
      accountName,
      upi,
      bankCode,
      notifyUrl,
      mOrderId,
      mchOrderId,
    } = input;

    const acct = accountNo || bankNo || cardNumber;
    const beneficiary = accountName || name;

    if (!withdrawId || !(amount || orderAmount) || !acct || !ifsc || !beneficiary) {
      throw new ValidationError(
        'Missing required fields: withdrawId, amount, accountNo/bankNo, ifsc, name'
      );
    }

    const resolvedNotify = notifyUrl || config.hzpay.payoutNotifyUrl;
    if (!resolvedNotify) {
      throw new ValidationError('Notify URL is required');
    }

    if (Number(amount || orderAmount) <= 0) {
      throw new ValidationError('Valid amount is required');
    }

    const resolvedBankCode =
      bankCode || (upi ? BANK_CODES.UPI : BANK_CODES.IMPS);

    if (![BANK_CODES.IMPS, BANK_CODES.UPI].includes(String(resolvedBankCode).toUpperCase())) {
      throw new ValidationError('Invalid bank code. Supported: IMPS, UPI', { bankCode: resolvedBankCode });
    }

    const merchantOrderId = mOrderId || mchOrderId || generatePayoutOrderId();
    const payoutAmount = Number(amount || orderAmount);

    const gatewayResult = await hzpayApiService.createPayoutOrder(
      {
        mchOrderId: merchantOrderId,
        amount: payoutAmount,
        bankCode: String(resolvedBankCode).toUpperCase(),
        accountNo: acct,
        name: beneficiary,
        ifsc,
        upi: upi || undefined,
        notifyUrl: resolvedNotify,
      },
      meta
    );

    const gw = gatewayResult.data;
    if (!gw || Number(gw.code) !== 0) {
      throw new GatewayError('HZPay payout create failed', { code: gw?.code });
    }

    const gatewayOrderNo = gw.data?.orderNo || null;

    try {
      const affected = await withdrawlRepository.setMerchantOrderId(withdrawId, merchantOrderId);
      if (affected === 0) {
        logger.warn('PayoutService', 'withdrawl UPDATE matched 0 rows', {
          withdrawId,
          merchantOrderId,
        });
      }
    } catch (dbErr) {
      logger.logError(
        'PayoutService',
        `CRITICAL: Payout created at HZPay but DB update failed | withdrawId=${withdrawId} | mOrderId=${merchantOrderId}`,
        dbErr
      );
    }

    await payoutOrderRepository
      .create({
        merchant_id: String(config.hzpay.merchantId),
        merchant_order_no: merchantOrderId,
        gateway_order_no: gatewayOrderNo,
        withdraw_id: withdrawId,
        order_amount: payoutAmount,
        account_name: beneficiary,
        card_number: acct,
        ifsc,
        bank_name: String(resolvedBankCode).toUpperCase(),
        upi: upi || null,
        status: ORDER_STATUS.PENDING,
        notify_url: resolvedNotify,
        extra: `withdrawId=${withdrawId}`,
        raw_request: input,
        raw_response: gw,
        request_id: meta.requestId || null,
      })
      .catch(() => {});

    return {
      mOrderId: merchantOrderId,
      orderNo: gatewayOrderNo,
      orderAmount: gw.data?.amount != null ? Number(gw.data.amount) : payoutAmount,
      data: gw,
    };
  }

  /**
   * Default payout callback payload (placeholder):
   * { mchNo, mchOrderId, orderNo, amount, status, sign, ... }
   * status: "1" success, "2" failed
   */
  async processPayoutWebhook(payload, meta = {}) {
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
        path: '/api/payout/webhook',
        status: 'RECEIVED',
        webhook_code: payload.status != null ? Number(payload.status) : null,
        signature_valid: signatureValid,
        request_payload: payload,
        raw_payload: payload,
        processed: false,
      })
      .catch(() => {});

    if (!signatureValid) {
      logger.error('PayoutWebhook', 'Invalid signature', { mchOrderId });
      throw new SignatureError('Webhook signature verification failed');
    }

    if (!mchOrderId) {
      return { processed: false, reason: 'missing_order' };
    }

    const status = String(payload.status ?? payload.payStatus ?? '');

    if (status === PAY_STATUS.SUCCESS) {
      const affected = await withdrawlRepository.updateStatusByMorderId(
        mchOrderId,
        WITHDRAW_STATUS.SUCCESS
      );
      if (affected === 0) {
        logger.warn('PayoutWebhook', 'Already processed or not found', { mchOrderId });
        return { processed: false, reason: 'duplicate_or_missing' };
      }

      await payoutOrderRepository
        .updateByMerchantOrderNo(mchOrderId, {
          status: ORDER_STATUS.SUCCESS,
          utr: payload.utr || null,
          gateway_order_no: payload.orderNo || undefined,
          paid_at: payload.orderDate ? new Date(payload.orderDate) : new Date(),
        })
        .catch(() => {});

      logger.info('PayoutWebhook', 'Payout SUCCESS', { mchOrderId, utr: payload.utr });
      return { processed: true, status: 'success' };
    }

    if (status === PAY_STATUS.FAILED) {
      const withdrawl = await withdrawlRepository.findForRefundByMorderId(mchOrderId);

      if (!withdrawl) {
        logger.warn('PayoutWebhook', 'FAILED but withdrawl not found', { mchOrderId });
        return { processed: false, reason: 'withdrawl_not_found' };
      }

      if (Number(withdrawl.status) === WITHDRAW_STATUS.FAILED) {
        logger.info('PayoutWebhook', 'Already failed — skip refund', {
          mchOrderId,
          withdrawId: withdrawl.id,
        });
        return { processed: true, status: 'failed', refunded: false, reason: 'already_failed' };
      }

      try {
        await platformService.refundFailedPayout({
          userId: withdrawl.userId,
          amount: withdrawl.balance,
          cryptoname: withdrawl.cryptoname || 'INR',
          withdrawId: withdrawl.id,
          morderId: mchOrderId,
        });
        logger.info('PayoutWebhook', 'Wallet refunded after FAILED payout', {
          mchOrderId,
          withdrawId: withdrawl.id,
          userId: withdrawl.userId,
          amount: withdrawl.balance,
        });
      } catch (refundErr) {
        logger.logError(
          'PayoutWebhook',
          `CRITICAL: Payout FAILED but wallet refund FAILED | mchOrderId=${mchOrderId} | withdrawId=${withdrawl.id} | userId=${withdrawl.userId} | amount=${withdrawl.balance}`,
          refundErr
        );
        return { processed: false, status: 'failed', refunded: false, error: refundErr.message };
      }

      await withdrawlRepository.markFailedIfNotAlreadyFailed(mchOrderId);
      await payoutOrderRepository
        .updateByMerchantOrderNo(mchOrderId, {
          status: ORDER_STATUS.FAILED,
        })
        .catch(() => {});
      logger.warn('PayoutWebhook', 'Payout FAILED — status updated + refunded', {
        mchOrderId,
        msg: payload.msg || payload.message,
        withdrawId: withdrawl.id,
        userId: withdrawl.userId,
        amount: withdrawl.balance,
      });
      return { processed: true, status: 'failed', refunded: true };
    }

    return { processed: false, reason: 'unknown_status', status };
  }
}

module.exports = {
  PayoutService,
  payoutService: new PayoutService(),
};
