# MicroShop data model

MicroShop uses database-per-service ownership. A service may refer to an ID
owned by another service, but it never reads or writes another service's
database tables.

## Ownership

| Owner | Store | Data |
| --- | --- | --- |
| `auth-service` | PostgreSQL `auth_db` | Users |
| `product-service` | PostgreSQL `product_db` | Products |
| `product-service` | Redis cache | Cached product reads |
| `cart-service` | Redis | Per-user carts |
| `order-service` | PostgreSQL `order_db` | Orders and order items |
| `payment-service` | None | Stateless mock responses |
| `api-gateway` | None | Stateless routing and JWT validation |

## `auth_db`

### `users`

| Column | Suggested type | Rules |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Primary key |
| `email` | `VARCHAR(320)` | Required, normalized to lowercase, unique |
| `password_hash` | `TEXT` | Required; never returned by the API |
| `name` | `VARCHAR(120)` | Required, may be empty |
| `created_at` | `TIMESTAMPTZ` | Required, defaults to current time |

## `product_db`

### `products`

| Column | Suggested type | Rules |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Primary key |
| `name` | `VARCHAR(200)` | Required |
| `description` | `TEXT` | Required, may be empty |
| `price` | `NUMERIC(12,2)` | Required, zero or greater |
| `stock` | `INTEGER` | Required, zero or greater |
| `category` | `VARCHAR(100)` | Required |

The first implementation seeds a small catalog on startup. Redis entries are
derived cache data and may be discarded at any time.

Suggested cache keys:

- `product:{id}` for product detail.
- `products:{query-hash}` for list and filter results.

Cache entries should have a finite TTL.

## Redis cart data

Each user has one key:

```text
cart:{user_id}
```

The value is a JSON list:

```json
[
  {
    "product_id": 1,
    "quantity": 2
  }
]
```

Product names and prices are not stored in the cart. They remain owned by the
product service and are fetched again during checkout.

## `order_db`

### `orders`

| Column | Suggested type | Rules |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Primary key |
| `user_id` | `BIGINT` | Required; logical reference to `auth-service` |
| `total` | `NUMERIC(12,2)` | Required, zero or greater |
| `status` | `VARCHAR(30)` | Required; first version writes `paid` |
| `created_at` | `TIMESTAMPTZ` | Required, defaults to current time |

### `order_items`

| Column | Suggested type | Rules |
| --- | --- | --- |
| `id` | `BIGSERIAL` | Primary key |
| `order_id` | `BIGINT` | Required; foreign key to local `orders.id` |
| `product_id` | `BIGINT` | Required; logical reference to `product-service` |
| `quantity` | `INTEGER` | Required, greater than zero |
| `price` | `NUMERIC(12,2)` | Required; product price captured at checkout |

`user_id` and `product_id` are intentionally not cross-database foreign keys.
Services validate those values through APIs where the flow requires it.

## Checkout consistency

The development flow stays synchronous:

1. Read the cart.
2. Fetch current product data and calculate the total.
3. Ask the payment service to approve the charge.
4. Insert the paid order and its items in one local database transaction.
5. Clear the cart after the database transaction succeeds.

This is not a distributed transaction. A rare cart-clear failure can be handled
with a retry or manual cleanup in this learning project; a production system
would need stronger idempotency and recovery guarantees.

