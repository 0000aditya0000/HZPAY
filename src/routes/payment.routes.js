const express = require('express');
const paymentController = require('../controllers/payment.controller');
const { validate } = require('../middlewares/validation');
const { validateUserStatus } = require('../middlewares/userStatusValidator');
const { payinRateLimiter } = require('../middlewares/rateLimiter');
const { createUserOrderSchema, payinCreateSchema } = require('../validators/hzpay.validator');

const router = express.Router();

/** App payin (SkillPay-compatible) */
router.post(
  '/user/order',
  payinRateLimiter,
  validate(createUserOrderSchema),
  validateUserStatus,
  paymentController.createUserOrder
);

router.post('/create', validate(payinCreateSchema), paymentController.createPayin);
router.post('/webhook', paymentController.payinWebhook);

module.exports = router;
