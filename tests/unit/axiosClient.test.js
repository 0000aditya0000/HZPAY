const { isRetryableError } = require('../../src/utils/axiosClient');

describe('HZPay axios retry condition', () => {
  test('retries network / timeout codes', () => {
    expect(isRetryableError({ code: 'ECONNRESET', message: 'reset' })).toBe(true);
    expect(isRetryableError({ code: 'ETIMEDOUT', message: 'timeout' })).toBe(true);
    expect(isRetryableError({ message: 'timeout of 30000ms exceeded' })).toBe(true);
  });

  test('retries 429 / 502 / 503 / 504', () => {
    expect(isRetryableError({ response: { status: 429, data: {} } })).toBe(true);
    expect(isRetryableError({ response: { status: 502, data: {} } })).toBe(true);
    expect(isRetryableError({ response: { status: 503, data: {} } })).toBe(true);
    expect(isRetryableError({ response: { status: 504, data: {} } })).toBe(true);
  });

  test('never retries validation / duplicate / signature business errors', () => {
    expect(
      isRetryableError({
        response: { status: 500, data: { msg: 'Merchant tracking order already exists' } },
      })
    ).toBe(false);
    expect(
      isRetryableError({
        response: { status: 400, data: { msg: 'Invalid sign' } },
      })
    ).toBe(false);
    expect(
      isRetryableError({
        response: { status: 400, data: { msg: 'validation failed' } },
      })
    ).toBe(false);
  });
});
