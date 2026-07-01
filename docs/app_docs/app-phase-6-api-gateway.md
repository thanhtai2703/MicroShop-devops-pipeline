# App Phase 6 — api-gateway (Node.js / Express)

**Objective:** Build the single public entry point. The gateway routes requests to the right service, validates JWTs once at the edge, and passes a trusted user identity downstream. The frontend talks only to the gateway.

**Prerequisite:** App Phases 2–5 (all backend services exist).

---

## What gets implemented

- Path-based routing to each backend service.
- **JWT validation** at the edge for protected routes.
- Forwarding the verified `user_id` downstream via `X-User-Id`.
- A single, clean public API surface for the frontend.

---

## Code structure

```
api-gateway/
├── src/
│   ├── index.js        # Express app
│   ├── routes.js       # route table → target services
│   ├── jwt.js          # verify JWT (shared JWT_SECRET)
│   └── proxy.js        # forward requests, inject X-User-Id
├── tests/
└── package.json
```

---

## Routing table

| Public path | Auth required | Forwards to |
| --- | --- | --- |
| `/api/auth/register`, `/api/auth/login` | no | auth-service |
| `/api/auth/me` | **yes** | auth-service |
| `/api/products/*` | no | product-service |
| `/api/cart/*` | **yes** | cart-service |
| `/api/orders/*` | **yes** | order-service |

For protected routes the gateway verifies the JWT, rejects with `401` if invalid, and otherwise injects `X-User-Id` before forwarding.

---

## Key implementation decisions

- **Validate auth once, at the edge** — downstream services trust the gateway's `X-User-Id` rather than each re-parsing the token. (Simplest model; a real system might still verify per-service.)
- **Strip/never trust client-supplied `X-User-Id`** — the gateway must overwrite it so a client can't impersonate a user.
- Use `http-proxy-middleware` (or hand-rolled `fetch` forwarding) for the proxying.
- Add sensible timeouts so one slow service doesn't hang the gateway.
- deps: `express`, `http-proxy-middleware`, `jsonwebtoken`.

---

## Testing

- Public route (`/api/products`) works without a token.
- Protected route without a token → `401`.
- Protected route with a valid token → forwarded, and downstream receives the correct `X-User-Id`.
- A client-supplied `X-User-Id` header is overwritten, not trusted.

---

## Run & verify

```bash
cd api-gateway && npm ci
export JWT_SECRET=devsecret AUTH_SERVICE_URL=... PRODUCT_SERVICE_URL=... CART_SERVICE_URL=... ORDER_SERVICE_URL=...
node src/index.js

curl localhost:8000/api/products                      # ok, no auth
curl localhost:8000/api/cart                           # 401
curl -H "Authorization: Bearer <token>" localhost:8000/api/cart   # ok
```

**Done when:** every public path routes to the right service, protected routes enforce JWT, and the verified user id reaches downstream services. Tests pass.

---

## Next

→ **App Phase 7** builds the multi-page `frontend` against this single gateway API.
