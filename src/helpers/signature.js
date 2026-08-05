/**
 * HZPay SHA512 signature helpers
 *
 * Official rules:
 * 1. Take all non-empty parameters in set M
 * 2. Sort by parameter name ASCII (lexicographical / dictionary order)
 * 3. Join as key1=value1&key2=value2…
 * 4. Append &key=MERCHANT_SECRET → stringSignTemp
 * 5. SHA512(stringSignTemp) → sign (lowercase hex — live API verified)
 * - Values are stringified exactly as sent (no forced amount decimals on create)
 */

const crypto = require('crypto');

const isEmptyValue = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string' && value === '') return true;
  return false;
};

/**
 * Normalize amount for display / optional webhook verify.
 * Does NOT alter create-order signing by default.
 * @param {any} amount
 * @returns {string}
 */
const formatAmountTwoDecimals = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return n.toFixed(2);
};

/**
 * Amount as signed/sent value — match gateway JSON number style.
 * 100 → "100", 100.5 → "100.5", 100.50 → "100.5"
 * @param {any} amount
 * @returns {string}
 */
const formatAmountForGateway = (amount) => {
  const n = Number(amount);
  if (!Number.isFinite(n)) return String(amount);
  return String(n);
};

const AMOUNT_KEYS = new Set(['amount', 'orderAmount']);

/**
 * Build canonical sign string (without hash).
 * Formula: param1=value1&param2=value2&…&key=商户密钥
 *
 * @param {Object} params
 * @param {string} secret
 * @param {Object} [options]
 * @param {boolean} [options.forceAmountDecimals]
 * @returns {string}
 */
const buildSignPayload = (params = {}, secret, options = {}) => {
  if (!secret) {
    throw new Error('HZPay secret is required for signature generation');
  }

  const filtered = {};
  Object.keys(params).forEach((key) => {
    // sign does not participate; names are case-sensitive (do not rewrite keys)
    if (key === 'sign') return;

    let value = params[key];
    if (isEmptyValue(value)) return;

    if (options.forceAmountDecimals && AMOUNT_KEYS.has(key)) {
      value = formatAmountTwoDecimals(value);
    }

    // URL key-value pair uses the literal string form of the value
    filtered[key] = String(value);
  });

  // Sort parameter names by ASCII / lexicographical order (smallest → largest)
  const sortedKeys = Object.keys(filtered).sort();
  const stringA = sortedKeys.map((key) => `${key}=${filtered[key]}`).join('&');
  // Splice merchant key at the end
  return `${stringA}&key=${secret}`;
};

/**
 * Generate SHA512 signature (lowercase hex — confirmed against live HZPay API).
 * @param {Object} params
 * @param {string} secret
 * @param {Object} [options]
 * @returns {string}
 */
const generateSignature = (params, secret, options = {}) => {
  const stringSignTemp = buildSignPayload(params, secret, options);
  return crypto.createHash('sha512').update(stringSignTemp, 'utf8').digest('hex').toLowerCase();
};

/**
 * Verify signature using timing-safe compare (case-insensitive on incoming).
 * @param {Object} params - full body including sign
 * @param {string} secret
 * @param {Object} [options]
 * @returns {boolean}
 */
const verifySignature = (params, secret, options = {}) => {
  const incoming = String(params?.sign || '').toLowerCase();
  if (!incoming) return false;

  const expected = generateSignature(params, secret, options);
  const a = Buffer.from(incoming);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return crypto.timingSafeEqual(a, b);
};

/**
 * Attach sign to a copy of params (values left as provided for the HTTP body).
 */
const signParams = (params, secret, options = {}) => {
  const signed = { ...params };
  signed.sign = generateSignature(signed, secret, options);
  return signed;
};

module.exports = {
  isEmptyValue,
  formatAmountTwoDecimals,
  formatAmountForGateway,
  buildSignPayload,
  generateSignature,
  verifySignature,
  signParams,
};
