# order-service

The order service orchestrates checkout across cart, product, and payment
services. It computes prices server-side, records paid orders in PostgreSQL,
then clears the purchased cart items.

## Environment

| Variable | Required | Default |
| --- | --- | --- |
| `DATABASE_URL` | Yes | None |
| `CART_SERVICE_URL` | Yes | None |
| `PRODUCT_SERVICE_URL` | Yes | None |
| `PAYMENT_SERVICE_URL` | Yes | None |
| `UPSTREAM_TIMEOUT_MS` | No | `5000` |
| `PORT` | No | `8000` |

```powershell
npm ci
$env:DATABASE_URL = "postgresql://microshop:microshop@localhost:5432/order_db"
$env:CART_SERVICE_URL = "http://localhost:8002"
$env:PRODUCT_SERVICE_URL = "http://localhost:8001"
$env:PAYMENT_SERVICE_URL = "http://localhost:8003"
npm start
```

Routes:

- `POST /checkout`
- `GET /orders`
- `GET /orders/{id}`
- `GET /health`

Order routes trust the `X-User-Id` header supplied by the API gateway.

