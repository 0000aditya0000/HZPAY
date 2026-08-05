const { payoutService } = require('../services/payout.service');
const logger = require('../utils/logger');

const metaFromReq = (req) => ({
  requestId: req.requestId,
  correlationId: req.correlationId,
});

const createPayout = async (req, res, next) => {
  try {
    const result = await payoutService.createPayout(req.body, metaFromReq(req));
    return res.json({
      success: true,
      message: 'Payout Created Successfully',
      mOrderId: result.mOrderId,
      orderNo: result.orderNo,
      data: result.data,
    });
  } catch (err) {
    return next(err);
  }
};

/**
 * Payout webhook — return JSON ACK immediately, process async.
 */
const payoutWebhook = async (req, res) => {
  logger.webhookLogger.info('Payout webhook received', { body: req.body, requestId: req.requestId });
  res.status(200).json({ code: 0, msg: 'success' });

  setImmediate(async () => {
    try {
      await payoutService.processPayoutWebhook(req.body, metaFromReq(req));
    } catch (err) {
      logger.logError('PayoutWebhook', 'Async processing failed', err);
    }
  });
};

module.exports = {
  createPayout,
  payoutWebhook,
};
