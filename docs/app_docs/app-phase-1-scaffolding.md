# App Phase 1 — Scaffolding & Contracts

**Objective:** Set up the `microshop` monorepo and define the **shared contracts** (API shapes, data model, auth approach, conventions) before writing any service. Agreeing on contracts first lets each service be built independently and still interoperate.

---

## What gets implemented

- The monorepo structure (one directory per service + gateway + frontend).
- API contracts for every service.
- The data model (database-per-service).
- The **JWT auth approach** shared across services.
- Shared conventions + housekeeping files.

---

## Repo skeleton

```
microshop/
├── api-gateway/
├── auth-service/
├── product-service/
├── cart-service/
├── order-service/
├── payment-service/
├── frontend/
├── .env.example
├── .gitignore
└── README.md
```

---

## Data model (database-per-service)

Each service owns its own database — services never share tables.

**auth_db → users:** `id`, `email`, `password_hash`, `name`, `created_at`
**product_db → products:** `id`, `name`, `description`, `price`, `stock`, `category`
**order_db → orders:** `id`, `user_id`, `total`, `status`, `created_at`
**order_db → order_items:** `id`, `order_id`, `product_id`, `quantity`, `price`
**cart:** Redis only — key `cart:{user_id}` → list of `{product_id, quantity}`
**payment:** stateless (mock) — no persistent store

---

## Auth approach (JWT)

1. `auth-service` issues a signed JWT on login (contains `user_id`, `email`, expiry).
2. The **API gateway** validates the JWT on protected routes and forwards the verified `user_id` to downstream services in a trusted header (e.g. `X-User-Id`).
3. Downstream services trust the gateway-supplied identity (simplest model for learning). The signing secret lives in config/secrets.

---

## API contract (summary)

Public routes go through the gateway at `/api/...`:

| Route | Service | Auth | Purpose |
| --- | --- | --- | --- |
| `POST /api/auth/register` | auth | no | Create account |
| `POST /api/auth/login` | auth | no | Return JWT |
| `GET /api/auth/me` | auth | yes | Current user profile |
| `GET /api/products` | product | no | List/search products |
| `GET /api/products/{id}` | product | no | Product detail |
| `GET /api/cart` | cart | yes | Current user's cart |
| `POST /api/cart/items` | cart | yes | Add/update item |
| `DELETE /api/cart/items/{id}` | cart | yes | Remove item |
| `POST /api/orders/checkout` | order | yes | Create order + pay |
| `GET /api/orders` | order | yes | Order history |
| `GET /api/orders/{id}` | order | yes | Order detail |

Every service also exposes `GET /health` and (later, DevOps Phase 5) `GET /metrics`.

---

## Shared conventions

- Every service listens on internal port **8000**.
- Config from environment variables only: `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, plus service URLs.
- Inter-service hostnames use the **service name** (`product-service`, `auth-service`) so the same code works under Compose and Kubernetes.
- Standard error shape: `{ "error": "message" }` with the correct HTTP status.

---

## Done when

- The repo structure exists and is committed.
- Contracts, data model, and auth flow are written down (in `README.md` or `docs/`).
- `.env.example` lists every variable across all services.

---

## Next

→ **App Phase 2** builds `auth-service` — the foundation everything else depends on.
