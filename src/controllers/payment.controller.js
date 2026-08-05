const { paymentService } = require('../services/payment.service');
const { success } = require('../helpers/response');
const logger = require('../utils/logger');

const metaFromReq = (req) => ({
  requestId: req.requestId,
  correlationId: req.correlationId,
});

/**
 * App payin — SkillPay compatible
 * POST /api/payments/user/order
 */
const createUserOrder = async (req, res, next) => {
  try {
    const result = await paymentService.createUserOrder(req.body, metaFromReq(req));
    return res.json({
      paymentUrl: result.paymentUrl,
      orderNo: result.orderNo,
      merchantOrderNo: result.merchantOrderNo,
      orderAmount: result.orderAmount,
      payStatus: result.payStatus,
    });
  } catch (err) {
    return next(err);
  }
};

/** Direct HZPay payin create proxy */
const createPayin = async (req, res, next) => {
  try {
    const data = await paymentService.createPayin(req.body, metaFromReq(req));
    return success(res, 'Payment Created Successfully', data);
  } catch (err) {
    return next(err);
  }
};

/**
 * Payin webhook — return JSON ACK immediately, process async.
 */
const payinWebhook = async (req, res) => {
  logger.webhookLogger.info('Payin webhook received', { body: req.body, requestId: req.requestId });

  res.status(200).json(paymentService.acknowledgeWebhook());

  setImmediate(async () => {
    try {
      await paymentService.processPayinWebhook(req.body, metaFromReq(req));
    } catch (err) {
      logger.logError('PayinWebhook', 'Async processing failed', err);
    }
  });
};

module.exports = {
  createUserOrder,
  createPayin,
  payinWebhook,
};
