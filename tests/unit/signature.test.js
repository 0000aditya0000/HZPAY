const {
  generateSignature,
  verifySignature,
  buildSignPayload,
  formatAmountTwoDecimals,
  isEmptyValue,
} = require('../../src/helpers/signature');

describe('HZPay signature', () => {
  const secret = '21884081ff8142338563e82f12351a173';

  test('ignores empty fields and sign, sorts keys, appends key=', () => {
    const params = {
      mchNo: '1701282757001',
      mchOrderId: 'ORD1',
      amount: 100,
      goodsName: 'Apple',
      version: '1.0',
      returnUrl: '',
      extra: null,
      sign: 'should-be-ignored',
    };

    const payload = buildSignPayload(params, secret);
    expect(payload).toBe(
      'amount=100&goodsName=Apple&mchNo=1701282757001&mchOrderId=ORD1&version=1.0&key=21884081ff8142338563e82f12351a173'
    );
    expect(payload.includes('sign=')).toBe(false);
    expect(payload.includes('returnUrl')).toBe(false);
    expect(payload.includes('extra')).toBe(false);
  });

  test('keeps numeric zero', () => {
    expect(isEmptyValue(0)).toBe(false);
    const payload = buildSignPayload({ payStatus: 0, mchNo: '1' }, secret);
    expect(payload).toContain('payStatus=0');
  });

  test('generateSignature is UPPERCASE sha512', () => {
    const sign = generateSignature({ mchNo: '1701282757001', version: '1.0' }, secret);
    expect(sign).toMatch(/^[A-F0-9]{128}$/);
  });

  test('verifySignature round-trip', () => {
    const body = { mchNo: '1701282757001', mchOrderId: 'A', amount: 10.5 };
    const sign = generateSignature(body, secret);
    expect(verifySignature({ ...body, sign }, secret)).toBe(true);
    expect(verifySignature({ ...body, sign: 'DEADBEEF' }, secret)).toBe(false);
  });

  test('webhook amount forced to 2 decimals', () => {
    const body = {
      mchNo: '1701282757001',
      mchOrderId: 'HZ_TEST',
      amount: 100,
      orderNo: 'G1',
      payStatus: '1',
    };
    const payload = buildSignPayload(body, secret, { forceAmountDecimals: true });
    expect(payload).toContain('amount=100.00');
    expect(formatAmountTwoDecimals(88.8)).toBe('88.80');
  });

  test('matches documented example shape', () => {
    const payload = buildSignPayload(
      {
        amount: 100,
        goodsName: 'Apple',
        mchNo: '1701282757001',
        version: '1.0',
      },
      secret
    );
    expect(payload).toBe(
      'amount=100&goodsName=Apple&mchNo=1701282757001&version=1.0&key=21884081ff8142338563e82f12351a173'
    );
  });
});
