# Signature guide

HZPay uses **SHA512** → **UPPERCASE** hex.

## Steps

1. Remove `sign`
2. Ignore empty / null / blank string values (keep numeric `0`)
3. Sort keys ASCII ascending
4. Join as `key=value&key=value`
5. Append `&key=MERCHANT_SECRET`
6. SHA512 hash → uppercase hex

## Example

Input (secret `21884081ff8142338563e82f12351a173`):

```
amount=100&goodsName=Apple&mchNo=1701282757001&version=1.0&key=21884081ff8142338563e82f12351a173
```

Amounts for signing should use **2 decimal places** (`100.00`) when verifying callbacks.

Helpers: `src/helpers/signature.js`

- `buildSignPayload`
- `generateSignature`
- `verifySignature` (timing-safe)
- `signParams`
