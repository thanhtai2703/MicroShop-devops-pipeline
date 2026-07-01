# Phase 0 — Local Development with Docker Compose

**Objective:** Containerize all the MicroShop services and run the whole app — plus PostgreSQL and Redis — together locally with Docker Compose. This is the bridge: the application from the app-development track now runs as containers, exactly as it will in Kubernetes.

**Cost:** Free (local only).

**Prerequisite:** App-development track complete (App Phases 1–7) — all services exist and work.

---

## What gets implemented

- A `Dockerfile` for every service.
- A `docker-compose.yml` wiring all services + PostgreSQL + Redis on one network.

| Component | Tech | Notes |
| --- | --- | --- |
| `api-gateway` | Node | Public entry, validates JWT |
| `auth-service` | Node | Postgres-backed |
| `product-service` | Python | Postgres + Redis cache |
| `cart-service` | Python | Redis-backed |
| `order-service` | Node | Postgres-backed, calls payment |
| `payment-service` | Go/Node | Stateless mock |
| `frontend` | React + Nginx | Multi-stage build, proxies `/api/*` to the gateway |
| `postgres` | PostgreSQL 16 | Multiple databases (auth, product, order) |
| `redis` | Redis 7 | Cart + product cache |

---

## Dockerfiles

- **Node services** (`node:20-slim`): `npm ci`, run `node src/index.js` on port 8000.
- **Python services** (`python:3.12-slim`): `pip install -r requirements.txt`, run `uvicorn app.main:app` on port 8000.
- **payment-service** (Go): multi-stage build → small static binary, or Node like the others.
- **frontend**: multi-stage — `node` builds the Vite app, `nginx:alpine` serves `dist/` and reverse-proxies `/api/*` to `api-gateway`.

---

## docker-compose.yml

Wires everything on one network. Key points:

- `postgres` creates the three databases on init (an init SQL script), with a `pg_isready` healthcheck and a named volume.
- `redis` with a simple healthcheck.
- Each service gets its env (`DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, and the URLs of services it calls), and `depends_on` the stores (healthy) and any services it calls.
- `api-gateway` knows the URLs of auth/product/cart/order; `frontend` is published on host port `8080`.
- Use **service names as hostnames** (`product-service`, `redis`, `postgres`) — identical to Kubernetes DNS later.

**Environment variables:**

| Variable | Used by | Example |
| --- | --- | --- |
| `DATABASE_URL` | auth, product, order | `postgresql://app:pass@postgres:5432/auth_db` |
| `REDIS_URL` | product, cart | `redis://redis:6379` |
| `JWT_SECRET` | auth, api-gateway | shared signing secret |
| `*_SERVICE_URL` | gateway, order, cart | `http://product-service:8000` |

---

## Run & verify

```bash
docker compose up --build
# then exercise the full flow through the frontend:
open http://localhost:8080      # register → login → browse → cart → checkout
```

**Done when:**

- Every container is healthy.
- The complete shopping journey works through `http://localhost:8080`: register, log in, browse/search, add to cart, check out (payment approved), and see the order in history.
- Data persists across an app-container restart (Postgres + Redis volumes).
- A declined/unreachable payment doesn't create a paid order (the failure path from App Phase 5 still holds in containers).

---

## Common pitfalls

- Services starting before Postgres/Redis are ready → use `depends_on` with healthchecks.
- Forgetting to create all three databases → a service fails to connect; handle in the init script.
- The frontend calling services directly instead of through the gateway via the Nginx `/api/*` proxy → CORS errors.
- Hardcoding `localhost` instead of Compose service names for inter-service URLs.
