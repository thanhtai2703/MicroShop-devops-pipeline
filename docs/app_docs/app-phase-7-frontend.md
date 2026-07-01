# App Phase 7 — frontend (React + React Router)

**Objective:** Build the multi-page web app that ties everything together — browsing, accounts, cart, checkout, and order history — talking only to the API gateway.

**Prerequisite:** App Phase 6 — the gateway exposes the full public API.

---

## What gets implemented

- A React (Vite) single-page app with **client-side routing** (React Router).
- Auth state (store the JWT, attach it to requests, protect routes).
- All shopping pages.
- An Nginx config to serve the build and proxy `/api/*` to the gateway.

---

## Pages / routes

| Route | Page | Auth |
| --- | --- | --- |
| `/` | Catalog / home (list + search + category) | no |
| `/products/:id` | Product detail | no |
| `/cart` | Cart | yes |
| `/login`, `/register` | Auth forms | no |
| `/checkout` | Checkout (review + pay) | yes |
| `/orders` | Order history | yes |
| `/orders/:id` | Order detail | yes |
| `/profile` | User profile | yes |

---

## Code structure

```
frontend/
├── src/
│   ├── main.jsx           # router setup
│   ├── api.js             # fetch wrapper, attaches JWT
│   ├── auth.jsx           # auth context (login state, token)
│   ├── components/        # Nav, ProductCard, ProtectedRoute, ...
│   └── pages/             # one file per route above
├── nginx.conf
└── package.json
```

---

## Key implementation decisions

- **All calls go to `/api/*`** (relative) → Nginx proxies to the gateway. Single origin, no CORS, mirrors the Kubernetes Ingress.
- **Auth context** holds the JWT (in memory; note for the learning scope — production would use httpOnly cookies). `api.js` attaches `Authorization: Bearer <token>` automatically.
- **Protected routes** redirect to `/login` when there's no valid session.
- **Surface backend errors** — out-of-stock, payment declined, service unavailable — as clear UI messages, never blank screens.
- **Loading and empty states** on every data-driven page.

---

## Nginx

Serves the production build with SPA fallback (all routes → `index.html`) and reverse-proxies `location /api/` → the api-gateway. The multi-stage Docker build (DevOps Phase 0) produces the static build, then serves it via Nginx.

---

## Run & verify

```bash
cd frontend && npm ci
npm run dev      # Vite dev server, proxy /api → gateway
```

Walk the full flow: register → log in → browse → add to cart → checkout → see the order in history.

**Done when:** the complete shopping journey works end to end through the gateway, protected pages require login, and backend errors show as friendly messages.

---

## Next

The application is complete. Move to the **DevOps track → Phase 0 (Docker Compose)**, which runs all services + PostgreSQL + Redis together locally — the bridge into containerization, Kubernetes, and the full pipeline.
