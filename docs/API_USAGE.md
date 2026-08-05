# API usage

## Create payin (app)

`POST /api/payments/user/order`

```json
{
  "amount": 100.00,
  "userId": 12,
  "user_mobile": "9876543210",
  "payType": 101
}
```

`payType` defaults to **101** when omitted.

Response:

```json
{
  "paymentUrl": "https://...",
  "orderNo": "...",
  "merchantOrderNo": "HZ_...",
  "orderAmount": 100,
  "payStatus": "0"
}
```

## Create payout

`POST /api/payout/create`

```json
{
  "withdrawId": 55,
  "amount": 100.00,
  "bankNo": "948101025",
  "ifsc": "IDIB000K730",
  "name": "G ARASU",
  "bankCode": "IMPS"
}
```

Supported `bankCode`: `IMPS`, `UPI`. If `upi` is provided and `bankCode` omitted, `UPI` is used.

## Direct payin proxy

`POST /api/payments/create`

Accepts `amount` / `orderAmount`, optional `mchOrderId`, `payType`, `notifyUrl`, `returnUrl`, `goodsName`.
