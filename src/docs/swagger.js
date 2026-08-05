/**
 * OpenAPI / Swagger specification for HZPay gateway module
 */

const { HZPAY_PATHS } = require('../constants');

const swaggerSpec = {
  openapi: '3.0.3',
  info: {
    title: 'HZPay Gateway API',
    version: '1.0.0',
    description:
      'Production HZPay payment gateway module. Upstream base: https://api.hzpay.968.run',
  },
  servers: [{ url: '/' }],
  paths: {
    '/health': {
      get: {
        summary: 'Health check',
        tags: ['Health'],
        responses: { 200: { description: 'OK' } },
      },
    },
    '/ping': {
      get: {
        summary: 'Ping',
        tags: ['Health'],
        responses: { 200: { description: 'pong' } },
      },
    },
    '/api/payments/user/order': {
      post: {
        summary: 'Create payin order (app)',
        tags: ['PayIn'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['amount', 'userId'],
                properties: {
                  amount: { type: 'number', example: 100.0 },
                  userId: { type: 'integer', example: 12 },
                  user_mobile: { type: 'string', example: '9876543210' },
                },
              },
            },
          },
        },
        responses: {
          200: {
            description: 'Payment URL',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    paymentUrl: { type: 'string' },
                    orderNo: { type: 'string' },
                    merchantOrderNo: { type: 'string' },
                    orderAmount: { type: 'number' },
                    payStatus: { type: 'string' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/payout/create': {
      post: {
        summary: 'Create payout order',
        tags: ['PayOut'],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                required: ['withdrawId', 'amount', 'ifsc', 'name'],
                properties: {
                  withdrawId: { type: 'integer', example: 55 },
                  amount: { type: 'number', example: 100.0 },
                  bankNo: { type: 'string', example: '948101025' },
                  ifsc: { type: 'string', example: 'IDIB000K730' },
                  name: { type: 'string', example: 'G ARASU' },
                  bankCode: { type: 'string', enum: ['IMPS', 'UPI'], example: 'IMPS' },
                  upi: { type: 'string', example: 'user@upi' },
                },
              },
            },
          },
        },
        responses: { 200: { description: 'Payout created' } },
      },
    },
    '/api/payment/webhook': {
      post: {
        summary: 'Payin webhook (JSON ACK)',
        tags: ['Webhooks'],
        responses: {
          200: {
            description: 'ACK',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    code: { type: 'integer', example: 0 },
                    msg: { type: 'string', example: 'success' },
                  },
                },
              },
            },
          },
        },
      },
    },
    '/api/payout/webhook': {
      post: {
        summary: 'Payout webhook (JSON ACK)',
        tags: ['Webhooks'],
        responses: { 200: { description: 'ACK' } },
      },
    },
  },
  components: {
    schemas: {
      UpstreamPaths: {
        type: 'object',
        example: HZPAY_PATHS,
      },
    },
  },
};

module.exports = swaggerSpec;
