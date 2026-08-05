const { verifySignature, generateSignature } = require('../../src/helpers/signature');
const config = require('../../src/config');

describe('HZPay webhook signature verification', () => {
  const secret = 'webhook_test_secret';

  beforeAll(() => {
    config.hzpay.secret = secret;
  });

  test('accepts valid callback signature', () => {
    const payload = {
      mchNo: '1701282757001',
      mchOrderId: 'HZ_CB_1',
      orderNo: 'ON1',
      amount: 50,
      payStatus: '1',
    };
    payload.sign = generateSignature(payload, secret, { forceAmountDecimals: true });
    expect(verifySignature(payload, secret, { forceAmountDecimals: true })).toBe(true);
  });

  test('rejects tampered callback', () => {
    const payload = {
      mchNo: '1701282757001',
      mchOrderId: 'HZ_CB_2',
      amount: 50,
      payStatus: '1',
      sign: 'INVALID',
    };
    expect(verifySignature(payload, secret, { forceAmountDecimals: true })).toBe(false);
  });
});
