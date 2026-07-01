# Phase 1 — Local Kubernetes (kind / minikube)

**Objective:** Run the same app on a local Kubernetes cluster, deploying everything manually with `kubectl`. Learn the K8s object model before adding cloud and automation.

**Cost:** Free (local cluster).

**Prerequisite:** Phase 0 complete — working images for every service.

---

## What gets implemented

- A local cluster (`kind`).
- Kubernetes manifests for every service + PostgreSQL + Redis + config + Ingress.
- `ingress-nginx` for external routing.
- Manual deploy with `kubectl apply`.

---

## Manifest structure

```
microshop/k8s/
├── namespace.yaml
├── configmap.yaml          # service URLs, non-secret config
├── secret.yaml             # DB creds + JWT_SECRET (plaintext for now — fixed in Phase 6)
├── postgres.yaml           # Deployment + Service + PVC (3 databases)
├── redis.yaml              # Deployment + Service
├── api-gateway.yaml        # Deployment + Service
├── auth-service.yaml       # Deployment + Service
├── product-service.yaml    # Deployment + Service
├── cart-service.yaml       # Deployment + Service
├── order-service.yaml      # Deployment + Service
├── payment-service.yaml    # Deployment + Service
├── frontend.yaml           # Deployment + Service
└── ingress.yaml            # routes / → frontend, /api → api-gateway
```

---

## What each manifest contains

- **namespace.yaml** — a `microshop` namespace.
- **configmap.yaml / secret.yaml** — env config (`*_SERVICE_URL`) and secrets (`DATABASE_URL`s, `REDIS_URL`, `JWT_SECRET`), mounted via `envFrom`.
- **postgres.yaml** — Deployment + PVC + ClusterIP Service; init creates `auth_db`, `product_db`, `order_db`.
- **redis.yaml** — Deployment + ClusterIP Service.
- **each service** — a Deployment (with `readiness`/`liveness` probes on `/health`) + a ClusterIP Service on port 8000.
- **frontend.yaml** — Nginx Deployment + Service.
- **ingress.yaml** — `/` → frontend, `/api` → api-gateway (the gateway handles internal routing).

Note: in Kubernetes the **gateway** is the single backend entry behind the Ingress, mirroring the Compose setup.

---

## Concepts introduced

| Phase 0 (Compose) | Phase 1 (Kubernetes) |
| --- | --- |
| `docker compose up` | `kubectl apply -f k8s/` |
| service name DNS | Service ClusterIP DNS |
| `depends_on` | readiness probes |
| named volume | PersistentVolumeClaim |
| published port | Ingress |
| `.env` | ConfigMap + Secret |

---

## Run & verify

```bash
kind create cluster --name microshop

# load every local image into kind
for s in api-gateway auth-service product-service cart-service order-service payment-service frontend; do
  kind load docker-image microshop/$s:dev --name microshop
done

kubectl apply -f https://raw.githubusercontent.com/kubernetes/ingress-nginx/main/deploy/static/provider/kind/deploy.yaml
kubectl apply -f k8s/

kubectl get pods -n microshop      # all Running
```

**Done when:**

- Every pod is `Running` and `Ready`.
- The full shopping flow works through the ingress, same as Phase 0.
- Deleting a service pod and watching Kubernetes recreate it confirms self-healing.

---

## Common pitfalls

- Forgetting `kind load docker-image` → `ErrImagePull` (kind can't see local images). Use `imagePullPolicy: IfNotPresent` for local images.
- Probes on the wrong port/path → pods never become `Ready` and Services have no endpoints.
- Missing `REDIS_URL`/`DATABASE_URL` in config → cart/product/auth/order crash-loop.
- PVC not bound → check kind's default StorageClass.
