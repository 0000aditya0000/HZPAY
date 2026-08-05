/**
 * @typedef {Object} HzpayPayinRequest
 * @property {string} mchNo
 * @property {string} mchOrderId
 * @property {number} payType
 * @property {string} notifyUrl
 * @property {string} [returnUrl]
 * @property {string|number} amount
 * @property {string} goodsName
 * @property {string} signType
 * @property {string} version
 * @property {string} sign
 */

/**
 * @typedef {Object} HzpayPayoutRequest
 * @property {string} mchNo
 * @property {string} mchOrderId
 * @property {string} notifyUrl
 * @property {string|number} amount
 * @property {string} bankCode
 * @property {string} signType
 * @property {string} version
 * @property {string} accountNo
 * @property {string} name
 * @property {string} ifsc
 * @property {string} sign
 */

module.exports = {};
