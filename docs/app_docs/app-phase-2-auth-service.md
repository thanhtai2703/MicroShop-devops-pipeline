# App Phase 2 — auth-service (Node.js / Express)

**Objective:** Build the authentication service — registration, login, JWT issuing, and the current-user endpoint. Build this first because every protected feature depends on it.

**Prerequisite:** App Phase 1 — contracts and the JWT approach defined.

---

## What gets implemented

- User registration with hashed passwords.
- Login that returns a signed JWT.
- A `/me` endpoint returning the current user.
- PostgreSQL-backed user storage.

---

## Code structure

```
auth-service/
├── src/
│   ├── index.js        # Express app + bootstrap
│   ├── routes.js       # /register, /login, /me, /health
│   ├── db.js           # pg pool + users table
│   ├── auth.js         # hashing + JWT sign/verify
│   └── middleware.js   # JWT verification (for /me)
├── tests/
└── package.json
```

---

## Endpoints

| Method | Path | Logic |
| --- | --- | --- |
| `POST` | `/register` | Validate email/password, **hash password** (bcrypt), insert user, return `201` |
| `POST` | `/login` | Verify password, issue JWT (`user_id`, `email`, expiry), return `{ token }` |
| `GET` | `/me` | Verify JWT, return the user (no password hash) |
| `GET` | `/health` | `{ status: "ok" }` |

---

## Key implementation decisions

- **Never store plaintext passwords** — hash with `bcrypt` and a salt.
- **JWT signed with `JWT_SECRET`** from env; short-ish expiry (e.g. 1h). The same secret is used by the gateway to verify.
- Return clear errors: `409` for duplicate email, `401` for bad credentials — both in the standard error shape.
- `package.json` deps: `express`, `pg`, `bcrypt`, `jsonwebtoken`. Dev: `jest`, `supertest`.

---

## Testing

- Register → `201`; duplicate email → `409`.
- Login with correct password → returns a token; wrong password → `401`.
- `/me` with a valid token → returns the user; missing/invalid token → `401`.

---

## Run & verify

```bash
cd auth-service && npm ci
export DATABASE_URL=... JWT_SECRET=devsecret
node src/index.js

curl -X POST localhost:8000/register -d '{"email":"a@b.com","password":"pw","name":"A"}' -H 'Content-Type: application/json'
curl -X POST localhost:8000/login    -d '{"email":"a@b.com","password":"pw"}' -H 'Content-Type: application/json'
```

**Done when:** you can register, log in to get a JWT, and call `/me` with that token. Tests pass.

---

## Next

→ **App Phase 3** builds `product-service` (catalog + search + Redis cache).
