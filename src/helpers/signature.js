/**
 * HZPay SHA512 signature helpers
 *
 * Rules (from HZPay docs):
 * 1. Remove `sign`
 * 2. Ignore empty / null / undefined fields — BUT keep numeric 0
 * 3. Sort keys alphabetically (ASCII / A-Z)
 * 4. Join as key=value&key=value
 * 5. Append &key=MERCHANT_SECRET
 * 6. SHA512 → UPPERCASE hex
 *
 * Webhook note: amount SHOULD be signed with exactly 2 decimal places (e.g. 100.00)
 */

const crypto = require('crypto');

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value.trim() === '') return true;
  return false;
};

/**
 * Normalize amount for signature (2 decimal places).
 * @param {any} amount
 * @returns {string}
 */
const formatAmountTwoDecimals = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return n.toFixed(2);
};

const AMOUNT_KEYS = new Set(['amount', 'orderAmount']);

/**
 * Build canonical sign string (without hash).
 * @param {Object} params
 * @param {string} secret
 * @param {Object} [options]
 * @param {boolean} [options.forceAmountDecimals] - force amount fields to 2 decimals
 * @returns {string}
 */
const buildSignPayload = (params = {}, secret, options = {}) => {
  if (!secret) {
    throw new Error('HZPay secret is required for signature generation');
  }

  const filtered = {};
  Object.keys(params).forEach((key) => {
    if (key === 'sign') return;
    let value = params[key];
    if (isEmptyValue(value)) return;

    if (
      options.forceAmountDecimals &&
      AMOUNT_KEYS.has(key) &&
      value !== undefined &&
      value !== null &&
      value !== ''
    ) {
      value = formatAmountTwoDecimals(value);
    }

    filtered[key] = value;
  });

  const sortedKeys = Object.keys(filtered).sort();
  const pairs = sortedKeys.map((key) => `${key}=${filtered[key]}`);
  return `${pairs.join('&')}&key=${secret}`;
};

/**
 * Generate SHA512 signature (UPPERCASE hex).
 * @param {Object} params
 * @param {string} secret
 * @param {Object} [options]
 * @returns {string}
 */
const generateSignature = (params, secret, options = {}) => {
  const payload = buildSignPayload(params, secret, options);
  return crypto.createHash('sha512').update(payload, 'utf8').digest('hex').toUpperCase();
};

/**
 * Verify signature using timing-safe compare when lengths match.
 * @param {Object} params - full body including sign
 * @param {string} secret
 * @param {Object} [options]
 * @returns {boolean}
 */
const verifySignature = (params, secret, options = {}) => {
  const incoming = String(params?.sign || '').toUpperCase();
  if (!incoming) return false;

  const expected = generateSignature(params, secret, options);
  const a = Buffer.from(incoming);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Attach sign to a copy of params.
 */
const signParams = (params, secret, options = {}) => {
  const signed = { ...params };
  signed.sign = generateSignature(signed, secret, options);
  return signed;
};

module.exports = {
  isEmptyValue,
  formatAmountTwoDecimals,
  buildSignPayload,
  generateSignature,
  verifySignature,
  signParams,
};
