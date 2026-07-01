# api-gateway

The gateway is MicroShop's only public backend. It exposes `/api/*`, verifies
JWTs on protected routes, discards client-supplied `X-User-Id`, and forwards
the verified identity to internal services.

## Environment

| Variable | Required | Default |
| --- | --- | --- |
| `JWT_SECRET` | Yes | None |
| `AUTH_SERVICE_URL` | Yes | None |
| `PRODUCT_SERVICE_URL` | Yes | None |
| `CART_SERVICE_URL` | Yes | None |
| `ORDER_SERVICE_URL` | Yes | None |
| `UPSTREAM_TIMEOUT_MS` | No | `5000` |
| `PORT` | No | `8000` |

```powershell
npm ci
$env:JWT_SECRET = "local-development-secret"
$env:AUTH_SERVICE_URL = "http://localhost:8001"
$env:PRODUCT_SERVICE_URL = "http://localhost:8002"
$env:CART_SERVICE_URL = "http://localhost:8003"
$env:ORDER_SERVICE_URL = "http://localhost:8004"
npm start
```

See the shared [application contracts](../docs/app_docs/app-contracts.md) for
the public routing table.

