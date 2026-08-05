# Signature guide

HZPay uses **SHA512** → **lowercase** hex (verified against live API; uppercase is rejected).

## Steps (official)

1. Collect all **non-empty** parameters (exclude `sign`)
2. Sort parameter names by **ASCII / lexicographical** order
3. Join as `key1=value1&key2=value2…` → `stringA`
4. Append `&key=MERCHANT_SECRET` → `stringSignTemp`
5. `SHA512(stringSignTemp)` → `sign` (lowercase hex)

Notes:
- Empty values do not participate
- Parameter names are case-sensitive
- `sign` does not participate
- Amount in create requests matches docs style: `amount=100` (not forced `100.00`)

## Example

```
amount=100&goodsName=Apple&mchNo=1701282757001&version=1.0&key=21884081ff8142338563e82f12351a173
```

Helpers: `src/helpers/signature.js`

- `buildSignPayload`
- `generateSignature`
- `verifySignature` (timing-safe)
- `signParams`
