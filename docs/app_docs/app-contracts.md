# MicroShop application contracts

These are living contracts for the development application. They define enough
for the services to be implemented independently without pretending that the
first version is a production API.

## Common rules

- All backend services listen on internal port `8000`.
- JSON is used for request and response bodies.
- A normal error is `{ "error": "human-readable message" }`.
- Unknown resources return `404`, invalid input returns `400`, authentication
  failures return `401`, and unavailable dependencies return `503`.
- Every backend service exposes `GET /health` and returns
  `{ "status": "ok" }`.
- IDs are positive integers. Timestamps are UTC ISO 8601 strings.
- Prices and totals are JSON numbers rounded to two decimal places.

## Gateway routing

The frontend uses only the public route. The gateway removes the public prefix
and forwards to the internal route.

| Public route | Auth | Internal target |
| --- | --- | --- |
| `POST /api/auth/register` | No | `auth-service:8000/register` |
| `POST /api/auth/login` | No | `auth-service:8000/login` |
| `GET /api/auth/me` | Yes | `auth-service:8000/me` |
| `GET /api/products` | No | `product-service:8000/products` |
| `GET /api/products/{id}` | No | `product-service:8000/products/{id}` |
| `GET /api/cart` | Yes | `cart-service:8000/cart` |
| `POST /api/cart/items` | Yes | `cart-service:8000/cart/items` |
| `DELETE /api/cart/items/{product_id}` | Yes | `cart-service:8000/cart/items/{product_id}` |
| `POST /api/orders/checkout` | Yes | `order-service:8000/checkout` |
| `GET /api/orders` | Yes | `order-service:8000/orders` |
| `GET /api/orders/{id}` | Yes | `order-service:8000/orders/{id}` |

The gateway itself exposes `GET /health`. The payment endpoint is internal and
is never routed to the browser.

## Shared response objects

### User

```json
{
  "id": 1,
  "email": "alex@example.com",
  "name": "Alex",
  "created_at": "2026-07-01T10:00:00Z"
}
```

### Product

```json
{
  "id": 1,
  "name": "DevOps T-shirt",
  "description": "A comfortable learning-project shirt.",
  "price": 24.99,
  "stock": 20,
  "category": "clothing"
}
```

### Cart

```json
{
  "items": [
    {
      "product_id": 1,
      "quantity": 2
    }
  ],
  "total_items": 2
}
```

### Order

```json
{
  "id": 101,
  "user_id": 1,
  "total": 49.98,
  "status": "paid",
  "created_at": "2026-07-01T10:05:00Z",
  "items": [
    {
      "product_id": 1,
      "quantity": 2,
      "price": 24.99
    }
  ]
}
```

The order item price is the price captured at checkout, not a live product
price.

## Auth service

### `POST /register`

Request:

```json
{
  "email": "alex@example.com",
  "password": "development-password",
  "name": "Alex"
}
```

Returns `201` with a `User`. Email and password are required; name may be an
empty string. A duplicate normalized email returns `409`.

### `POST /login`

Request:

```json
{
  "email": "alex@example.com",
  "password": "development-password"
}
```

Returns `200`:

```json
{
  "token": "<signed-jwt>"
}
```

Bad credentials return `401` without revealing which field was wrong.

### `GET /me`

Returns `200` with the authenticated `User`. It accepts either the gateway's
trusted `X-User-Id` header or a bearer token when the auth service is exercised
directly during development.

## Product service

### `GET /products`

Optional query parameters:

- `search`: case-insensitive match against name and description.
- `category`: exact, case-insensitive category match.

Returns `200`:

```json
{
  "items": [],
  "total": 0
}
```

### `GET /products/{id}`

Returns `200` with a `Product`, or `404` if it does not exist.

## Cart service

All cart routes require `X-User-Id` from the gateway.

### `GET /cart`

Returns `200` with a `Cart`. A missing cart is an empty cart, not `404`.

### `POST /cart/items`

Request:

```json
{
  "product_id": 1,
  "quantity": 2
}
```

Quantity must be a positive integer. This operation sets the item's quantity,
so calling it again updates rather than increments the existing value. Returns
`200` with the updated `Cart`. An unknown product returns `404`.

### `DELETE /cart/items/{product_id}`

Removes the item if present and returns `204`. Repeating the request is safe and
also returns `204`.

## Order service

All order routes require `X-User-Id` from the gateway.

### `POST /checkout`

The service reads the current user's cart, fetches current product prices,
computes the total, and requests payment. It accepts no client-supplied total.

Returns `201` with the created `Order`. An empty cart returns `400`. A declined
payment returns `402`; an unreachable dependency returns `503`. In either
failure case, no paid order is created and the cart is left unchanged.

### `GET /orders`

Returns the current user's newest orders first:

```json
{
  "items": [],
  "total": 0
}
```

### `GET /orders/{id}`

Returns `200` with an `Order`. An absent order or an order owned by another user
returns `404`, avoiding disclosure that another user's order exists.

## Payment service

### `POST /charge`

Internal request:

```json
{
  "amount": 49.98,
  "reference": "checkout-user-1"
}
```

Approved response:

```json
{
  "status": "approved",
  "txn_id": "mock_abc123"
}
```

For deliberate failure testing, the mock may return `402` with the standard
error shape. It stores no payment data.

## Authentication flow

1. `auth-service` hashes passwords and signs JWTs with `JWT_SECRET`.
2. A token contains `user_id`, `email`, `iat`, and `exp` claims and uses HS256
   for this development app.
3. The browser sends `Authorization: Bearer <token>` to protected gateway
   routes.
4. The gateway verifies the signature and expiry, removes any client-supplied
   `X-User-Id`, then injects the verified `user_id`.
5. Downstream services trust `X-User-Id` because they are intended to be
   reachable only through the internal network.

This trusted-header design is deliberately simple. Exposing downstream services
directly to untrusted clients would make it insecure.

