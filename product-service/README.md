# product-service

The MicroShop catalog service provides product listing, search, category
filtering, and product detail. PostgreSQL owns the catalog and Redis provides a
short-lived cache for repeated reads.

Redis is treated as an optimization: if `REDIS_URL` is absent or Redis is
temporarily unavailable, requests continue against PostgreSQL.

## Environment

| Variable | Required | Default |
| --- | --- | --- |
| `DATABASE_URL` | Yes | None |
| `REDIS_URL` | No | Cache disabled |

The service creates the `products` table and inserts a small catalog when the
table is empty.

## Commands

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
.\.venv\Scripts\python.exe -m pytest

$env:DATABASE_URL = "postgresql://microshop:microshop@localhost:5432/product_db"
$env:REDIS_URL = "redis://localhost:6379/0"
.\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000
```

Routes:

- `GET /products?search=&category=`
- `GET /products/{id}`
- `GET /health`

See the shared [application contracts](../docs/app_docs/app-contracts.md) for
response shapes.
