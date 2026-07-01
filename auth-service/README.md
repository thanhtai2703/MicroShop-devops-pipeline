# auth-service

The MicroShop authentication service provides registration, login, and current
user lookup. Passwords are stored as bcrypt hashes and successful login returns
an HS256 JWT.

## Environment

| Variable | Required | Default |
| --- | --- | --- |
| `DATABASE_URL` | Yes | None |
| `JWT_SECRET` | Yes | None |
| `JWT_EXPIRES_IN` | No | `1h` |
| `PORT` | No | `8000` |

The service creates the `users` table on startup if it does not already exist.

## Commands

```powershell
npm ci
npm test

$env:DATABASE_URL = "postgresql://microshop:microshop@localhost:5432/auth_db"
$env:JWT_SECRET = "local-development-secret"
npm start
```

Routes:

- `POST /register`
- `POST /login`
- `GET /me`
- `GET /health`

See the shared [application contracts](../docs/app_docs/app-contracts.md) for
request and response shapes.
