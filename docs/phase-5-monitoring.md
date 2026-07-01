# Phase 5 — Monitoring with Prometheus + Grafana

**Objective:** Add observability. Instrument the services to expose metrics, install Prometheus to scrape them, and use Grafana to visualize both cluster health and application behavior.

**Cost:** Same as Phase 2 (runs in the existing cluster; monitoring pods add some resource usage).

**Prerequisite:** Phase 4 complete — GitOps deploys are working, so you'll add monitoring through the GitOps repo too.

---

## What gets implemented

- A **`/metrics`** endpoint on every service (gateway, auth, product, cart, order, payment).
- The **kube-prometheus-stack** Helm chart (Prometheus + Grafana + node-exporter + kube-state-metrics + Alertmanager).
- **ServiceMonitor** resources so Prometheus discovers and scrapes the app.
- A custom **Grafana dashboard** for application metrics.

---

## Instrumenting the services

Add a metrics library to each service and expose `GET /metrics`:

- **Python services** (`product-service`, `cart-service`) → `prometheus-client`.
- **Node services** (`api-gateway`, `auth-service`, `order-service`) → `prom-client`.
- **payment-service** (Go or Node) → the matching client.

Every service exposes default process metrics plus HTTP request-rate and request-latency histograms. Then add a few **business metrics** where they're meaningful:

- `auth-service`: `logins_total{result}`
- `cart-service`: `cart_items_added_total`
- `order-service`: `orders_created_total`, `checkout_total{result}`
- `payment-service`: `payments_total{status}`

These fill in the `/metrics` endpoints that were stubbed during the app-development track — now they return real data.

---

## Installing the monitoring stack

Add to `microshop-gitops` so ArgoCD manages it:

```
microshop-gitops/monitoring/
├── kube-prometheus-stack.yaml      # Helm release (via ArgoCD) or values file
└── servicemonitors.yaml            # one ServiceMonitor per instrumented service
```

- Install **kube-prometheus-stack** (Helm). You can let ArgoCD manage the Helm release, or apply it directly first and bring it under GitOps later.
- A values file configures retention, resource limits, and Grafana admin access.

**ServiceMonitor** tells Prometheus what to scrape:

```yaml
apiVersion: monitoring.coreos.com/v1
kind: ServiceMonitor
metadata:
  name: product-service
  labels: { release: kube-prometheus-stack }
spec:
  selector:
    matchLabels: { app: product-service }
  endpoints:
    - port: http
      path: /metrics
```

The `release` label must match what the Helm chart's Prometheus selects on, or it won't pick up your monitor.

---

## What you'll see in Grafana

| Source | Dashboard content |
| --- | --- |
| Built-in (kube-state-metrics, node-exporter) | Node CPU/memory, pod status, restarts, cluster capacity |
| Your ServiceMonitors | Per-service request rate, latency (p50/p95/p99), error rate |
| Custom panels | `orders_created_total` over time, product API throughput |

Build one custom dashboard with: request rate per service, p95 latency, error ratio, and a business metric (orders created). These are the "golden signals" plus one domain metric.

---

## Run & verify

```bash
# Access Grafana (or expose via Ingress)
kubectl port-forward -n monitoring svc/kube-prometheus-stack-grafana 3000:80

# In Prometheus, confirm targets are UP:
#   Status → Targets → every instrumented service = UP
```

Generate some traffic (place orders, hit the product API) and watch the metrics move.

**Done when:**

- Prometheus shows your service targets as `UP`.
- Grafana displays both cluster dashboards and your custom application dashboard.
- Placing orders visibly increments the `orders_created_total` panel.

---

## Common pitfalls

- ServiceMonitor `release` label doesn't match the Helm install → Prometheus ignores it (most common issue).
- The `port` name in the ServiceMonitor must match the **named port** in the Service, not the number.
- `/metrics` not exposed on the same port the Service targets → scrape fails.
- Grafana admin password defaulting/unknown → set it explicitly in the Helm values.
