# App Phase 4 — cart-service (Python / FastAPI)

**Objective:** Build the shopping cart — a per-user cart stored entirely in Redis. This service teaches working with a key-value store as primary state (no relational DB) and acting on an authenticated user.

**Prerequisite:** App Phase 2 (auth — there must be a `user_id`) and App Phase 3 (products to validate against).

---

## What gets implemented

- A per-user cart kept in Redis (`cart:{user_id}`).
- Add / update / remove item operations.
- Validation that the product exists (calls `product-service`).

---

## Code structure

```
cart-service/
├── app/
│   ├── main.py          # FastAPI routes
│   ├── cache.py         # Redis cart operations
│   ├── product_client.py# calls product-service
│   └── deps.py          # extract user_id from X-User-Id header
├── tests/
└── requirements.txt
```

---

## Endpoints

(`user_id` arrives in the `X-User-Id` header, set by the gateway after JWT validation.)

| Method | Path | Logic |
| --- | --- | --- |
| `GET` | `/cart` | Return the user's cart from Redis |
| `POST` | `/cart/items` | Validate product via product-service, then add/update item quantity |
| `DELETE` | `/cart/items/{product_id}` | Remove item |
| `GET` | `/health` | `{status:"ok"}` |

---

## Key implementation decisions

- **Redis as primary store:** the cart is ephemeral-ish and high-write — a perfect fit for a key-value store rather than a relational DB. Store the cart as a hash or JSON blob under `cart:{user_id}`.
- **Validate products** by calling `product-service` before adding — handle product-not-found (`404`) and product-service-down (`503`) gracefully.
- The user identity comes from the trusted `X-User-Id` header (set by the gateway), not from the client directly.
- `requirements.txt`: `fastapi`, `uvicorn[standard]`, `redis`, `pytest`, `httpx`.

---

## Testing

- Add item for a valid product → cart contains it.
- Add item for an unknown product → `404`.
- Update quantity, remove item, fetch cart — all reflect correctly.
- Carts are isolated per `user_id`.

---

## Run & verify

```bash
cd cart-service && pip install -r requirements.txt
export REDIS_URL=... PRODUCT_SERVICE_URL=http://localhost:8000
uvicorn app.main:app --reload --port 8000

curl -H "X-User-Id: 1" -X POST localhost:8000/cart/items -d '{"product_id":1,"quantity":2}' -H 'Content-Type: application/json'
curl -H "X-User-Id: 1" localhost:8000/cart
```

**Done when:** items can be added/updated/removed, carts are per-user, and invalid products are rejected. Tests pass.

---

## Next

→ **App Phase 5** builds `order-service` + `payment-service` — the checkout flow.
