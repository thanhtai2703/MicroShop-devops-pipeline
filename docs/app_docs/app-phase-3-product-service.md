# App Phase 3 — product-service (Python / FastAPI)

**Objective:** Build the catalog service — list, search, and detail — backed by PostgreSQL with a Redis cache. This is a read-heavy service, so it's where caching is introduced.

**Prerequisite:** App Phase 1 (contracts). Independent of auth — catalog browsing is public.

---

## What gets implemented

- Product listing with **search** and **category filter**.
- Product detail.
- A **Redis cache** in front of the database for hot reads.
- Seed data on startup.

---

## Code structure

```
product-service/
├── app/
│   ├── main.py        # FastAPI routes
│   ├── db.py          # SQLAlchemy engine/session
│   ├── models.py      # Product model
│   ├── schemas.py     # Pydantic response models
│   ├── cache.py       # Redis get/set helpers
│   └── seed.py        # demo products
├── tests/
└── requirements.txt
```

---

## Endpoints

| Method | Path | Logic |
| --- | --- | --- |
| `GET` | `/products?search=&category=` | List products, filtered; cache the common queries in Redis |
| `GET` | `/products/{id}` | Product detail; cache by id |
| `GET` | `/health` | `{status:"ok"}` |

---

## Key implementation decisions

- **Cache-aside pattern:** on read, check Redis first; on miss, query Postgres and populate the cache with a TTL. This is the core caching lesson.
- **Search** is a simple `ILIKE` on name/description for the learning scope (note: a real system might use a search engine — out of scope here).
- Separate Pydantic schemas from ORM models.
- `requirements.txt`: `fastapi`, `uvicorn[standard]`, `sqlalchemy`, `psycopg2-binary`, `redis`, `pytest`, `httpx`.

---

## Testing

- `GET /products` returns seeded data; `?search=` filters correctly.
- `GET /products/{id}` returns a product; unknown id → `404`.
- A second identical read is served from cache (assert the DB isn't hit twice — mock or count).

---

## Run & verify

```bash
cd product-service && pip install -r requirements.txt
export DATABASE_URL=... REDIS_URL=redis://localhost:6379
uvicorn app.main:app --reload --port 8000

curl "localhost:8000/products?search=shirt"
```

**Done when:** listing, search, and detail work, and repeated reads are served from Redis. Tests pass.

---

## Next

→ **App Phase 4** builds `cart-service` (Redis-backed, requires a logged-in user).
