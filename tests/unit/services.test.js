/**
 * Lightweight service contract tests (mocked API)
 */

jest.mock('../../src/services/hzpayApi.service', () => ({
  hzpayApiService: {
    createPayinOrder: jest.fn(),
    createPayoutOrder: jest.fn(),
  },
}));

jest.mock('../../src/repositories', () => ({
  rechargeRepository: {
    createPending: jest.fn(),
    markSuccessIfPending: jest.fn(),
    findByOrderId: jest.fn(),
    markFailed: jest.fn(),
  },
  paymentOrderRepository: {
    create: jest.fn().mockResolvedValue({}),
    updateByMerchantOrderNo: jest.fn().mockResolvedValue([1]),
  },
  payoutOrderRepository: {
    create: jest.fn().mockResolvedValue({}),
    updateByMerchantOrderNo: jest.fn().mockResolvedValue([1]),
  },
  withdrawlRepository: {
    setMerchantOrderId: jest.fn().mockResolvedValue(1),
    updateStatusByMorderId: jest.fn().mockResolvedValue(1),
  },
  userRepository: {
    getStatus: jest.fn(),
  },
  logRepository: {
    createWebhook: jest.fn().mockResolvedValue({}),
    createGateway: jest.fn().mockResolvedValue({}),
  },
}));

jest.mock('../../src/services/platform.service', () => ({
  platformService: {
    processSuccessfulDeposit: jest.fn().mockResolvedValue({}),
  },
}));

const { hzpayApiService } = require('../../src/services/hzpayApi.service');
const {
  userRepository,
  rechargeRepository,
  withdrawlRepository,
} = require('../../src/repositories');
const { paymentService } = require('../../src/services/payment.service');
const { payoutService } = require('../../src/services/payout.service');
const { generateSignature } = require('../../src/helpers/signature');
const { mapGatewayError, DuplicateTransactionError } = require('../../src/utils/errors');
const config = require('../../src/config');

describe('PaymentService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.hzpay.secret = 'svc_secret';
    config.hzpay.notifyUrl = 'https://hzpay.rollix777.com/api/payment/webhook';
    config.hzpay.returnUrl = 'https://r7dream.com/';
    config.hzpay.merchantId = '1701282757001';
    config.hzpay.defaultPayType = 101;
  });

  test('createUserOrder inserts recharge and returns paymentUrl', async () => {
    userRepository.getStatus.mockResolvedValue({ id: 12, status: 1 });
    hzpayApiService.createPayinOrder.mockResolvedValue({
      data: {
        code: 0,
        msg: 'success',
        data: {
          orderNo: 'HZGW001',
          amount: 100.0,
          payUrl: 'https://pay.example/x',
          payStatus: '0',
        },
      },
    });

    const result = await paymentService.createUserOrder({
      amount: 100,
      userId: 12,
      user_mobile: '999',
    });
    expect(result.paymentUrl).toBe('https://pay.example/x');
    expect(rechargeRepository.createPending).toHaveBeenCalled();
    expect(hzpayApiService.createPayinOrder).toHaveBeenCalledWith(
      expect.objectContaining({ payType: 101 }),
      expect.any(Object)
    );
  });
});

describe('PayoutService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.hzpay.payoutNotifyUrl = 'https://hzpay.rollix777.com/api/payout/webhook';
    config.hzpay.merchantId = '1701282757001';
  });

  test('createPayout updates withdrawl morder_id', async () => {
    hzpayApiService.createPayoutOrder.mockResolvedValue({
      data: {
        code: 0,
        msg: 'success',
        data: { orderNo: 'HZPO001', amount: 100, status: '0' },
      },
    });

    const result = await payoutService.createPayout({
      withdrawId: 55,
      amount: 100,
      bankNo: '948101025',
      ifsc: 'IDIB000K730',
      name: 'G ARASU',
      bankCode: 'IMPS',
    });

    expect(result.orderNo).toBe('HZPO001');
    expect(withdrawlRepository.setMerchantOrderId).toHaveBeenCalledWith(55, result.mOrderId);
  });
});

describe('Webhook process', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    config.hzpay.secret = 'svc_secret';
  });

  test('processPayinWebhook credits on payStatus=1', async () => {
    const payload = {
      mchNo: '1701282757001',
      mchOrderId: 'HZ_TEST',
      amount: 50,
      orderNo: 'G1',
      payStatus: '1',
    };
    payload.sign = generateSignature(payload, config.hzpay.secret, { forceAmountDecimals: true });
    rechargeRepository.markSuccessIfPending.mockResolvedValue(1);
    rechargeRepository.findByOrderId.mockResolvedValue({ userId: 12, recharge_amount: 50 });

    const out = await paymentService.processPayinWebhook(payload);
    expect(out.processed).toBe(true);
  });

  test('duplicate payin callback is ignored', async () => {
    const payload = {
      mchNo: '1701282757001',
      mchOrderId: 'HZ_DUP',
      amount: 50,
      payStatus: '1',
    };
    payload.sign = generateSignature(payload, config.hzpay.secret, { forceAmountDecimals: true });
    rechargeRepository.markSuccessIfPending.mockResolvedValue(0);

    const out = await paymentService.processPayinWebhook(payload);
    expect(out.processed).toBe(false);
    expect(out.reason).toBe('duplicate_or_missing');
  });
});

describe('Error mapping', () => {
  test('maps merchant tracking order already exists to DuplicateTransactionError', () => {
    const err = mapGatewayError('Merchant tracking order already exists', { code: 500 });
    expect(err).toBeInstanceOf(DuplicateTransactionError);
    expect(err.message).toBe('Duplicate Transaction Error');
  });
});
