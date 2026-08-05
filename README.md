# HZPay Gateway

Production-ready **HZPay** payment gateway module for Node.js (Express + Sequelize + MySQL).

Upstream API base: `https://api.hzpay.968.run`  
Public host: `https://hzpay.rollix777.com`

Designed as a drop-in sibling to AeroPay / SkillPay — same platform tables (`recharge`, `withdrawl`, `users`) and Rollix777 deposit/wallet flow.

## Features

- Pay In (`/gateway/order/create`) / Pay Out (`/gateway/payout/create`)
- SHA512 signature (UPPERCASE) with `&key=SECRET`
- Webhook receiver (signature verify, async processing, JSON ACK)
- Joi validation, Winston logging, Axios retries (429/502/503/504 + network)
- Helmet, compression, CORS, rate limit (3/min then 5-min cooldown)

## Quick start

```bash
cp .env.example .env
# fill HZPAY_MERCHANT_ID, HZPAY_SECRET_KEY, DB_*, NOTIFY_URL
npm install
npm start
```

- Health: `GET /health`
- Docs: `GET /api/docs`
- App payin: `POST /api/payments/user/order`
- Payout: `POST /api/payout/create`

## Architecture

```
Controller → Service → Repository → MySQL / HZPay Axios Client
```

Business DB writes follow SkillPay:

| Flow | Table | Action |
|------|-------|--------|
| Payin create | `recharge` | INSERT pending, `payment_mode='hzpay'`, `isDepAdded=0` |
| Payin webhook success | `recharge` | UPDATE success + `isDepAdded=1` where `isDepAdded=0` |
| Then | Platform | `POST /api/user/deposit` + `PUT /api/user/wallet/balance` (×1.10) |
| Payout create | `withdrawl` | UPDATE `morder_id` |
| Payout webhook | `withdrawl` | status `1` success / `2` failed (only from pending) |

Gateway-owned Sequelize tables (`hzpay_*`) store orders + request/response/webhook/retry logs.

## Documentation

- [Environment variables](docs/ENVIRONMENT.md)
- [API usage](docs/API_USAGE.md)
- [Webhook guide](docs/WEBHOOK.md)
- [Signature guide](docs/SIGNATURE.md)

## Tests

```bash
npm test
```

## Upstream endpoints

| API | Method | Path | Success |
|-----|--------|------|---------|
| Create deposit | POST | `/gateway/order/create` | `code == 0` |
| Create payout | POST | `/gateway/payout/create` | `code == 0` |

Default India `payType`: **101**. Amounts use **2 decimal places**.

Webhook ACK body (JSON):

```json
{ "code": 0, "msg": "success" }
```
