# MicroShop

MicroShop is a small e-commerce application used to learn local development,
containers, Kubernetes, CI/CD, and observability. It is intentionally a
development application: the contracts are clear enough for the services to
work together, but they can evolve as the later phases teach us more.

## Application status

App Phase 1 is complete:

- One directory for each service, the gateway, and the frontend.
- [API and authentication contracts](docs/app_docs/app-contracts.md).
- [Data ownership and storage model](docs/app_docs/app-data-model.md).
- A root `.env.example` containing the shared configuration names.
- Polyglot housekeeping in `.gitignore`.

App Phase 2 is complete:

- [`auth-service`](auth-service/) provides registration, login, JWT issuing,
  current-user lookup, and health endpoints.
- Users are persisted in PostgreSQL with bcrypt password hashes.
- Its isolated API test suite covers the successful and failure paths.

App Phase 3 is complete:

- [`product-service`](product-service/) provides catalog listing, search,
  category filtering, product detail, and health endpoints.
- Products are persisted in PostgreSQL, seeded on first startup, and cached in
  Redis with cache-aside reads.
- Catalog reads continue through PostgreSQL if Redis is unavailable.

App Phase 4 is complete:

- [`cart-service`](cart-service/) keeps isolated per-user carts in Redis.
- Product IDs are validated through `product-service` before cart updates.

App Phase 5 is complete:

- [`order-service`](order-service/) coordinates cart reads, current product
  prices, mock payment, transactional order storage, and cart cleanup.
- [`payment-service`](payment-service/) provides deterministic approved or
  declined mock charges without persistent state.

App Phase 6 is complete:

- [`api-gateway`](api-gateway/) exposes the public `/api/*` routes, verifies
  JWTs, strips untrusted identity headers, and injects verified user IDs.

App Phase 7 is complete:

- [`frontend`](frontend/) is a Vite/React Router application covering catalog,
  product detail, authentication, cart, checkout, orders, and profile.
- It talks only to relative `/api/*` routes and includes protected routing,
  loading/empty/error states, an Nginx SPA configuration, and the visual
  language of the original frontend prototype.

The application-development track is complete. The next step is DevOps Phase 0:
containerize the services and run the full application with Docker Compose.

## Repository layout

```text
.
|-- api-gateway/
|-- auth-service/
|-- cart-service/
|-- frontend/
|-- order-service/
|-- payment-service/
|-- product-service/
|-- docs/
|   `-- app_docs/
|-- .env.example
`-- .gitignore
```

Each backend service listens on port `8000` inside its own runtime. The browser
will eventually call only the API gateway through `/api/*`.

## Shared conventions

- Configuration comes from environment variables.
- Services use their directory name as their network hostname.
- Each backend exposes `GET /health`.
- Errors use `{ "error": "message" }` with an appropriate HTTP status.
- Dates are UTC ISO 8601 strings.
- IDs are positive integers.
- Monetary values are JSON numbers with two-decimal precision and are stored as
  fixed-precision decimals in PostgreSQL.

## Configuration

Copy `.env.example` to `.env` when a later phase needs local configuration.
Each service reads only the variables relevant to it. A database-backed service
receives its own `DATABASE_URL`; the sample value documents the required format
and must use that service's database name.

Never commit real credentials or production secrets. The checked-in JWT value
is only a placeholder for local development.
