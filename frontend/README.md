# MicroShop frontend

The Phase 7 frontend is a Vite-powered React single-page application using
React Router. Its visual system is adapted from `MicroShop.dc.html`, while its
data and interactions come from the real MicroShop API gateway under `/api`.

## Pages

| Route | Purpose | Protected |
| --- | --- | --- |
| `/` | Catalog, search, and category filters | No |
| `/products/:id` | Product detail and add-to-cart | No |
| `/login` | Login | No |
| `/register` | Registration | No |
| `/cart` | Cart editing | Yes |
| `/checkout` | Review and mock payment | Yes |
| `/orders` | Order history | Yes |
| `/orders/:id` | Confirmation and order detail | Yes |
| `/profile` | Current user profile | Yes |

Authentication uses an in-memory JWT as planned for this development app. A
browser refresh intentionally ends the session.

## Local development

```powershell
npm ci
$env:GATEWAY_URL = "http://localhost:8000"
npm run dev
```

Vite proxies `/api/*` to `GATEWAY_URL`. Production builds use `nginx.conf`,
which serves the SPA and proxies `/api/*` to `api-gateway:8000`.

```powershell
npm run build
npm run preview
```

The original Design Component files (`MicroShop.dc.html`, `support.js`,
`image-slot.js`, and `.thumbnail`) remain in this directory as design-source
references. They are not part of the Vite build.

