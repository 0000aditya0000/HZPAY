const express = require('express');
const payoutController = require('../controllers/payout.controller');
const { validate } = require('../middlewares/validation');
const { payoutCreateSchema } = require('../validators/hzpay.validator');
const { requirePayoutSecret } = require('../middlewares/requirePayoutSecret');

const router = express.Router();

router.post('/create', requirePayoutSecret, validate(payoutCreateSchema), payoutController.createPayout);
router.post('/webhook', payoutController.payoutWebhook);

module.exports = router;
