const { payinRateLimiter } = require('../../src/middlewares/rateLimiter');
const { HTTP } = require('../../src/constants');

const mockRes = () => {
  const res = {
    statusCode: 200,
    headers: {},
    body: null,
    set(k, v) {
      this.headers[k] = v;
      return this;
    },
    status(code) {
      this.statusCode = code;
      return this;
    },
    json(payload) {
      this.body = payload;
      return this;
    },
  };
  return res;
};

describe('payinRateLimiter', () => {
  test('allows first 3 requests then blocks with PAYIN_RATE_LIMIT', () => {
    const keyUser = { body: { userId: `rl_${Date.now()}` }, ip: '1.2.3.4' };
    const next = jest.fn();

    for (let i = 0; i < 3; i += 1) {
      const res = mockRes();
      payinRateLimiter(keyUser, res, next);
    }
    expect(next).toHaveBeenCalledTimes(3);

    const blocked = mockRes();
    const nextBlocked = jest.fn();
    payinRateLimiter(keyUser, blocked, nextBlocked);
    expect(nextBlocked).not.toHaveBeenCalled();
    expect(blocked.statusCode).toBe(HTTP.TOO_MANY);
    expect(blocked.body.error.code).toBe('PAYIN_RATE_LIMIT');
  });
});
