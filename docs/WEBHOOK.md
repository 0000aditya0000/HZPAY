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

## Default payload (placeholder — replace when official docs arrive)

### Payin

```json
{
  "mchNo": "1701282757001",
  "mchOrderId": "HZ_...",
  "orderNo": "...",
  "amount": 100.00,
  "payStatus": "1",
  "orderDate": "2026-08-06 12:00:00",
  "sign": "..."
}
```

| Field | Notes |
|-------|-------|
| `payStatus` | **1** success · **2** failed · **0** pending |
| `amount` | Signed with **2 decimal places** (`100.00`) |

### Payout

Same shape; status field is `status` (`1` / `2`).

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
