/**
 * HZPay constants & enums
 */

const GATEWAY_NAME = 'HZPay';
const PAYMENT_MODE = 'hzpay';

/** Upstream create response success */
const GATEWAY_SUCCESS_CODE = 0;

/**
 * Create-order / query payStatus (deposit) and status (payout).
 * Create responses return "0" (pending). Callback defaults use 1=success, 2=failed
 * until official callback docs are provided.
 */
const PAY_STATUS = Object.freeze({
  PENDING: '0',
  SUCCESS: '1',
  FAILED: '2',
});

/** Platform withdrawl.status mapping */
const WITHDRAW_STATUS = Object.freeze({
  PENDING: 0,
  SUCCESS: 1,
  FAILED: 2,
});

/** Internal order status for hzpay_* tables */
const ORDER_STATUS = Object.freeze({
  PENDING: 0,
  PROCESSING: 1,
  SUCCESS: 2,
  FAILED: 3,
  CLOSED: 4,
});

/** Bank codes supported by payout */
const BANK_CODES = Object.freeze({
  IMPS: 'IMPS',
  UPI: 'UPI',
});

/**
 * Supported payType values by country / channel.
 * Default India payin: 101
 */
const PAY_TYPES = Object.freeze({
  INDIA: Object.freeze({
    UPI: 101,
    TYPE_102: 102,
    TYPE_108: 108,
  }),
  NIGERIA: Object.freeze({ TYPE_320: 320 }),
  BRAZIL: Object.freeze({ TYPE_400: 400, TYPE_401: 401, TYPE_402: 402 }),
  PHILIPPINES: Object.freeze({
    TYPE_710: 710,
    TYPE_711: 711,
    TYPE_712: 712,
    TYPE_713: 713,
    TYPE_714: 714,
    TYPE_720: 720,
    TYPE_721: 721,
    TYPE_722: 722,
    TYPE_723: 723,
    TYPE_724: 724,
  }),
  INDONESIA: Object.freeze({
    TYPE_810: 810,
    TYPE_811: 811,
    TYPE_812: 812,
    TYPE_813: 813,
    TYPE_820: 820,
    TYPE_821: 821,
    TYPE_822: 822,
    TYPE_823: 823,
  }),
  MEXICO: Object.freeze({
    TYPE_910: 910,
    TYPE_920: 920,
    TYPE_1910: 1910,
    TYPE_1920: 1920,
  }),
  SOUTH_AFRICA: Object.freeze({
    TYPE_1010: 1010,
    TYPE_1020: 1020,
    TYPE_1021: 1021,
    TYPE_1030: 1030,
  }),
  THAILAND: Object.freeze({ TYPE_1100: 1100, TYPE_1101: 1101, TYPE_1102: 1102 }),
  VIETNAM: Object.freeze({
    TYPE_1510: 1510,
    TYPE_1511: 1511,
    TYPE_1512: 1512,
    TYPE_1513: 1513,
    TYPE_1514: 1514,
    TYPE_1520: 1520,
    TYPE_1521: 1521,
    TYPE_1522: 1522,
    TYPE_1523: 1523,
    TYPE_1524: 1524,
  }),
  EGYPT: Object.freeze({ TYPE_1610: 1610, TYPE_1620: 1620 }),
  MALAYSIA: Object.freeze({
    TYPE_1710: 1710,
    TYPE_1711: 1711,
    TYPE_1720: 1720,
    TYPE_1721: 1721,
  }),
  ZAMBIA: Object.freeze({
    TYPE_1810: 1810,
    TYPE_1811: 1811,
    TYPE_1812: 1812,
    TYPE_1813: 1813,
    TYPE_1820: 1820,
    TYPE_1821: 1821,
    TYPE_1822: 1822,
    TYPE_1823: 1823,
    TYPE_1830: 1830,
    TYPE_1831: 1831,
    TYPE_1832: 1832,
    TYPE_1833: 1833,
  }),
  KOREA: Object.freeze({ TYPE_2010: 2010, TYPE_2020: 2020 }),
  BENIN: Object.freeze({ TYPE_2110: 2110, TYPE_2120: 2120 }),
  BANGLADESH: Object.freeze({
    TYPE_2210: 2210,
    TYPE_2211: 2211,
    TYPE_2212: 2212,
    TYPE_2220: 2220,
    TYPE_2221: 2221,
    TYPE_2222: 2222,
  }),
  PERU: Object.freeze({ TYPE_2310: 2310, TYPE_2320: 2320 }),
  PAKISTAN: Object.freeze({
    TYPE_2410: 2410,
    TYPE_2411: 2411,
    TYPE_2420: 2420,
    TYPE_2421: 2421,
  }),
});

const ALL_PAY_TYPES = Object.freeze(
  Object.values(PAY_TYPES).flatMap((country) => Object.values(country))
);

const DEFAULT_PAY_TYPE = PAY_TYPES.INDIA.UPI;

/** HZPay upstream paths */
const HZPAY_PATHS = Object.freeze({
  CREATE_ORDER: '/gateway/order/create',
  CREATE_PAYOUT: '/gateway/payout/create',
});

const HTTP = Object.freeze({
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY: 429,
  ERROR: 500,
  BAD_GATEWAY: 502,
  SERVICE_UNAVAILABLE: 503,
  GATEWAY_TIMEOUT: 504,
});

/** HTTP statuses eligible for outbound retry */
const RETRYABLE_HTTP_STATUSES = Object.freeze([429, 502, 503, 504]);

const RETRYABLE_CODES = Object.freeze([
  'ECONNABORTED',
  'ECONNRESET',
  'ECONNREFUSED',
  'ETIMEDOUT',
  'ENOTFOUND',
  'EAI_AGAIN',
]);

module.exports = {
  GATEWAY_NAME,
  PAYMENT_MODE,
  GATEWAY_SUCCESS_CODE,
  PAY_STATUS,
  WITHDRAW_STATUS,
  ORDER_STATUS,
  BANK_CODES,
  PAY_TYPES,
  ALL_PAY_TYPES,
  DEFAULT_PAY_TYPE,
  HZPAY_PATHS,
  HTTP,
  RETRYABLE_HTTP_STATUSES,
  RETRYABLE_CODES,
};
