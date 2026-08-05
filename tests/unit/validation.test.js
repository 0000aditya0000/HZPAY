const {
  createUserOrderSchema,
  payinCreateSchema,
  payoutCreateSchema,
} = require('../../src/validators/hzpay.validator');

describe('HZPay validation', () => {
  test('createUserOrder accepts valid body and defaults payType', () => {
    const { error, value } = createUserOrderSchema.validate({
      amount: 100.5,
      userId: 12,
    });
    expect(error).toBeUndefined();
    expect(value.payType).toBe(101);
  });

  test('createUserOrder rejects non-positive amount', () => {
    const { error } = createUserOrderSchema.validate({ amount: 0, userId: 1 });
    expect(error).toBeTruthy();
  });

  test('createUserOrder rejects unsupported payType', () => {
    const { error } = createUserOrderSchema.validate({
      amount: 10,
      userId: 1,
      payType: 9999,
    });
    expect(error).toBeTruthy();
  });

  test('payinCreate requires amount', () => {
    const { error } = payinCreateSchema.validate({ payType: 101 });
    expect(error).toBeTruthy();
  });

  test('payoutCreate requires withdrawId, amount, account, ifsc, name', () => {
    const ok = payoutCreateSchema.validate({
      withdrawId: 1,
      amount: 50.25,
      bankNo: '1234567890',
      ifsc: 'IDIB000K730',
      name: 'Test User',
      bankCode: 'IMPS',
    });
    expect(ok.error).toBeUndefined();

    const bad = payoutCreateSchema.validate({ withdrawId: 1, amount: 10 });
    expect(bad.error).toBeTruthy();
  });
});
