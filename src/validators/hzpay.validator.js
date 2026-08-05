const Joi = require('joi');
const { ALL_PAY_TYPES, BANK_CODES, DEFAULT_PAY_TYPE } = require('../constants');

const amountSchema = Joi.number().positive().precision(2).required();

const createUserOrderSchema = Joi.object({
  amount: amountSchema,
  userId: Joi.alternatives().try(Joi.number().integer(), Joi.string()).required(),
  user_mobile: Joi.string().allow('', null).optional(),
  recharge_type: Joi.string().optional(),
  payment_mode: Joi.string().optional(),
  payType: Joi.number()
    .integer()
    .valid(...ALL_PAY_TYPES)
    .default(DEFAULT_PAY_TYPE)
    .optional(),
  goodsName: Joi.string().max(120).optional(),
});

const payinCreateSchema = Joi.object({
  mchOrderId: Joi.string().max(64).optional(),
  merchantOrderNo: Joi.string().max(64).optional(),
  amount: amountSchema.optional(),
  orderAmount: amountSchema.optional(),
  payType: Joi.number()
    .integer()
    .valid(...ALL_PAY_TYPES)
    .optional(),
  notifyUrl: Joi.string().uri().optional(),
  returnUrl: Joi.string().uri().allow('', null).optional(),
  goodsName: Joi.string().max(120).optional(),
  extra: Joi.string().max(500).allow('', null).optional(),
  userId: Joi.alternatives().try(Joi.number().integer(), Joi.string()).optional(),
}).or('amount', 'orderAmount');

const payoutCreateSchema = Joi.object({
  withdrawId: Joi.alternatives().try(Joi.number().integer(), Joi.string()).optional(),
  withdrawalId: Joi.alternatives().try(Joi.number().integer(), Joi.string()).optional(),
  amount: amountSchema.optional(),
  orderAmount: amountSchema.optional(),
  bankNo: Joi.string().min(5).max(40).optional(),
  cardNumber: Joi.string().min(5).max(40).optional(),
  accountNo: Joi.string().min(5).max(40).optional(),
  ifsc: Joi.string().pattern(/^[A-Za-z]{4}0[A-Za-z0-9]{6}$/).required(),
  name: Joi.string().min(2).max(120).optional(),
  accountName: Joi.string().min(2).max(120).optional(),
  bankCode: Joi.string()
    .valid(BANK_CODES.IMPS, BANK_CODES.UPI, 'imps', 'upi')
    .optional(),
  upi: Joi.string().pattern(/^[\w.\-]{2,}@[a-zA-Z]{2,}$/).allow('', null).optional(),
  phone: Joi.string().pattern(/^[0-9]{10}$/).optional(),
  email: Joi.string().email().optional(),
  notifyUrl: Joi.string().uri().optional(),
  mOrderId: Joi.string().max(64).optional(),
  mchOrderId: Joi.string().max(64).optional(),
  merchantOrderNo: Joi.string().max(64).optional(),
  extra: Joi.string().max(500).allow('', null).optional(),
})
  .or('withdrawId', 'withdrawalId')
  .or('amount', 'orderAmount')
  .or('bankNo', 'cardNumber', 'accountNo')
  .or('name', 'accountName');

module.exports = {
  createUserOrderSchema,
  payinCreateSchema,
  payoutCreateSchema,
};
