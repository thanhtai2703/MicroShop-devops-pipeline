# cart-service

The cart service stores one JSON cart per user in Redis and validates products
against `product-service` before adding them.

## Environment

| Variable | Required | Default |
| --- | --- | --- |
| `REDIS_URL` | Yes | None |
| `PRODUCT_SERVICE_URL` | Yes | None |
| `UPSTREAM_TIMEOUT_MS` | No | `5000` |

## Run

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt

$env:REDIS_URL = "redis://localhost:6379/0"
$env:PRODUCT_SERVICE_URL = "http://localhost:8001"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --port 8000
```

Routes:

- `GET /cart`
- `POST /cart/items`
- `DELETE /cart/items/{product_id}`
- `GET /health`

Cart routes trust the `X-User-Id` header supplied by the API gateway.

