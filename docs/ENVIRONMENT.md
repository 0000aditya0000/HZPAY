# Environment variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `NODE_ENV` | `development` | Environment |
| `PORT` | `3011` | Listen port |
| `ALLOWED_ORIGINS` | `*` | CORS |
| `BODY_LIMIT` | `1mb` | Body parser limit |
| `RATE_LIMIT_WINDOW_MS` | `900000` | Global RL window |
| `RATE_LIMIT_MAX` | `100` | Global RL max |
| `HZPAY_BASE_URL` | `https://api.hzpay.968.run` | Upstream |
| `HZPAY_MERCHANT_ID` | — | Merchant `mchNo` |
| `HZPAY_SECRET_KEY` | — | SHA512 signing secret |
| `HZPAY_VERSION` | `1.0` | API version |
| `HZPAY_SIGN_TYPE` | `SHA512` | Sign algorithm |
| `HZPAY_TIMEOUT_MS` / `HZPAY_TIMEOUT` | `30000` | Axios timeout |
| `HZPAY_RETRY_COUNT` | `3` | Max retries |
| `HZPAY_DEFAULT_PAY_TYPE` | `101` | Default India pay type |
| `NOTIFY_URL` / `HZPAY_NOTIFY_URL` | — | Payin webhook URL |
| `PAYOUT_NOTIFY_URL` / `HZPAY_PAYOUT_NOTIFY_URL` | — | Payout webhook URL |
| `RETURN_URL` | — | Cashier return |
| `DB_HOST` | `localhost` | MySQL host |
| `DB_PORT` | `3306` | MySQL port |
| `DB_USER` | `root` | MySQL user |
| `DB_PASSWORD` | — | MySQL password |
| `DB_NAME` | `skillpay` | Database |
| `DB_LOGGING` | `false` | Sequelize SQL logs |
| `DB_SYNC_LOG_TABLES` | `true` | Sync `hzpay_*` on boot |
| `PLATFORM_BASE_URL` | `https://api.rollix777.com` | Rollix API |
| `WALLET_BONUS_MULTIPLIER` | `1.10` | Wallet credit multiplier |
| `LOG_LEVEL` | `info` | Winston level |

Production notify URLs should point at `https://hzpay.rollix777.com/...`.
