# App Phase 5 — order-service + payment-service (Checkout)

**Objective:** Build the checkout flow: `order-service` turns a cart into an order and calls `payment-service` (mock) to charge it. This is where the most service-to-service coordination happens.

**Prerequisite:** App Phases 2–4 (auth, products, cart).

---

## What gets implemented

- `payment-service` — a small, stateless mock payment processor.
- `order-service` — checkout (create order + pay), order history, order detail, backed by PostgreSQL.
- The synchronous **order → payment** call.

---

## payment-service (Go or Node)

A deliberately tiny, isolated service.

| Method | Path | Logic |
| --- | --- | --- |
| `POST` | `/charge` | Accept `{amount, reference}`, return `{status:"approved", txn_id}` (optionally fail randomly to test the failure path) |
| `GET` | `/health` | `{status:"ok"}` |

Stateless, no database — it's a stand-in for a real payment provider. Building it in Go (or any third language) is optional, to practice polyglot containers.

---

## order-service (Node.js / Express)

```
order-service/
├── src/
│   ├── index.js
│   ├── routes.js
│   ├── db.js              # orders + order_items tables
│   ├── cart_client.js     # reads the user's cart
│   ├── product_client.js  # gets current prices
│   └── payment_client.js  # calls payment-service
├── tests/
└── package.json
```

| Method | Path | Logic |
| --- | --- | --- |
| `POST` | `/checkout` | Read cart → fetch current prices → compute total → call payment → on approval, save order + items (status `paid`) and clear the cart → return the order |
| `GET` | `/orders` | List the user's orders |
| `GET` | `/orders/{id}` | Order detail (must belong to the user) |
| `GET` | `/health` | `{status:"ok"}` |

---

## Key implementation decisions

- **Checkout is an orchestration:** order-service coordinates cart, product, and payment services in one request. This is the heart of the microservices lesson.
- **Compute totals server-side** from current product prices — never trust a client-supplied total.
- **Handle payment failure:** if `payment-service` declines or is unreachable, do **not** create a paid order — return an error and leave the cart intact.
- **Authorization:** `/orders/{id}` must check the order belongs to the requesting `user_id`.
- order-service deps: `express`, `pg`. Dev: `jest`, `supertest`, `nock` (mock the other services).

---

## Testing

- Successful checkout → order created, cart cleared, status `paid`.
- Payment declined → no order created, cart untouched.
- A downstream service down → checkout returns `503`, no partial order.
- A user cannot fetch another user's order (`403/404`).

---

## Run & verify

```bash
# payment-service running on one port, order-service on another
curl -H "X-User-Id: 1" -X POST localhost:8000/checkout
curl -H "X-User-Id: 1" localhost:8000/orders
```

**Done when:** a cart can be checked out into a paid order, failures don't create partial orders, and order history works. Tests pass.

---

## Next

→ **App Phase 6** builds the `api-gateway` that fronts all these services.
