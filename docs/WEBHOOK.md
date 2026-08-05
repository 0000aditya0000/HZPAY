# Webhook Guide

HZPay calls your `notifyUrl` with **POST JSON** when an order completes or fails.

## Endpoint

- Payin: `POST /api/payment/webhook` (also `/api/payments/webhook`)
- Payout: `POST /api/payout/webhook`

Configure:

```
NOTIFY_URL=https://hzpay.rollix777.com/api/payment/webhook
PAYOUT_NOTIFY_URL=https://hzpay.rollix777.com/api/payout/webhook
```

## Payin payload (live)

```json
{
  "amount": "100.00",
  "mchNo": "1701282757001",
  "mchOrderId": "HZ_20260806_031531_004",
  "orderDate": "2026-08-06 05:45:32",
  "orderNo": "S2085120040381980672",
  "payStatus": "1",
  "sign": "..."
}
```

| Field | Notes |
|-------|-------|
| `payStatus` | **1** success · **2** failed · **0** pending |
| `amount` | String with 2 decimals (`100.00`) — signed as received |
| `mchOrderId` | Our merchant order id |

## Response (critical)

Return JSON:

```json
{ "code": 0, "msg": "success" }
```

HTTP 200. This module ACKs immediately, then processes asynchronously.

## Processing

**Payin `payStatus=1`:**

1. Verify SHA512 signature
2. `UPDATE recharge SET recharge_status='success', isDepAdded=1 WHERE order_id=? AND isDepAdded=0`
3. If affected → platform deposit + wallet ×1.10

**Payout `status=1`:** `withdrawl.status = 1` only if currently pending  
**Payout `status=2`:** `withdrawl.status = 2` only if currently pending

Every webhook is stored in `hzpay_webhook_logs`.
