# payment-service

A stateless mock processor used by `order-service`. Valid charges are approved
and receive a generated transaction ID.

Set `PAYMENT_FORCE_DECLINE=true` to exercise the checkout failure path
deterministically.

```powershell
npm ci
$env:PAYMENT_FORCE_DECLINE = "false"
npm start
```

Routes:

- `POST /charge`
- `GET /health`

