# MicroShop — DevOps Learning Project

A hands-on project for learning a full, industry-standard DevOps pipeline end to end — built around a **complete** (not demo) microservices e-commerce application: browse products, create an account, add to cart, check out, pay, and view order history.

The goal is to learn the workflow and the tools, with an application real enough to exercise the patterns that matter, while staying buildable solo.

---

## Tech stack

| Layer | Tool |
| --- | --- |
| Cloud | AWS |
| OS | Linux / Ubuntu |
| Infrastructure as Code | Terraform |
| Containerization | Docker |
| Orchestration | Kubernetes (Amazon EKS) |
| Source control | GitHub |
| Continuous Integration | Jenkins |
| Continuous Delivery (GitOps) | ArgoCD |
| Monitoring | Prometheus |
| Visualization | Grafana |

---

## The application: MicroShop (core complete)

A full shopping flow built as synchronous microservices behind an API gateway. Scope is deliberately the **core** of a real shop — no async messaging, no admin panel — which keeps it complete but achievable.

| Service | Suggested stack | Responsibility | Data store |
| --- | --- | --- | --- |
| `api-gateway` | Node/Express | Single public entry; routes to services, validates JWT | – (stateless) |
| `auth-service` | Node/Express | Register, login, issue/verify JWT, user profile | PostgreSQL (`auth_db`) |
| `product-service` | Python/FastAPI | Catalog, categories, search, product detail | PostgreSQL (`product_db`) + Redis cache |
| `cart-service` | Python/FastAPI | Per-user cart (add/remove/update) | Redis |
| `order-service` | Node/Express | Checkout, order history; calls payment | PostgreSQL (`order_db`) |
| `payment-service` | Go (or Node) | Mock payment processing | – (stateless) |
| `frontend` | React + React Router | Multi-page UI | – (served by Nginx) |

Using Python + Node (and optionally one Go service) keeps it polyglot but manageable.

### Frontend pages

Catalog / home · product detail · cart · login · register · checkout · order confirmation · order history · order detail · user profile.

### Request flow

The browser talks only to the **API gateway**. The gateway validates the JWT and routes to the right service. Checkout is fully synchronous: `order-service` calls `payment-service`, and on success records the order. `product-service` caches the catalog in Redis; `cart-service` keeps each user's cart in Redis.

### Patterns this teaches

API gateway / backend-for-frontend, JWT authentication across services, database-per-service, caching with Redis, service-to-service calls, and graceful degradation when a dependency is down.

---

## Repository strategy

Application code and deployment configuration stay in separate repositories — the core principle of GitOps.

```
microshop          # Source for all services + Dockerfiles + Jenkinsfile (monorepo)
microshop-gitops   # Kubernetes manifests (Kustomize/Helm) — ArgoCD watches ONLY this repo
microshop-infra    # Terraform code that provisions AWS infrastructure
```

After a successful build, Jenkins commits the new image tag into `microshop-gitops`; ArgoCD detects the change and syncs it to the cluster. Nobody runs `kubectl apply` by hand.

---

## CI/CD pipeline (GitOps flow)

```
Developer → push → GitHub: microshop
   → Jenkins (CI): test, build, scan → push images to ECR
   → Jenkins: update image tags in microshop-gitops, commit
   → ArgoCD (CD): detects change, syncs to EKS
   → app live on EKS  → Prometheus scrapes  → Grafana dashboards
```

CI builds one image per service (parallel stages). ArgoCD can manage all services, and an `ApplicationSet` keeps that tidy as the service count grows.

---

## How the work is organized: two tracks

The project has an **application-development track** (write the software) and a **DevOps track** (wrap the pipeline around it). Build the app first, then containerize and automate.

### Application-development track

| Phase | Builds |
| --- | --- |
| App 1 | Scaffolding & contracts (repo, APIs, data model, JWT plan) |
| App 2 | `auth-service` |
| App 3 | `product-service` (+ Redis cache, search) |
| App 4 | `cart-service` |
| App 5 | `order-service` + `payment-service` (the checkout flow) |
| App 6 | `api-gateway` |
| App 7 | `frontend` (multi-page) |

### DevOps track

| Phase | Goal | Tools |
| --- | --- | --- |
| 0 | App runs locally | Docker Compose |
| 1 | App runs on local Kubernetes | kind / minikube |
| 2 | Provision AWS infra, deploy manually | Terraform, EKS, ECR |
| 3 | Automated builds | Jenkins → ECR |
| 4 | GitOps deployment | ArgoCD |
| 5 | Observability | Prometheus + Grafana |
| 6 | Polish | Ingress + TLS, HPA, secret management |

The two tracks meet at **DevOps Phase 0**: once the services are built, Docker Compose runs them together locally, and the pipeline takes over from there.

---

## Cost notes

EKS charges for the control plane (~$0.10/hour) plus the EC2 nodes. Application-development track and DevOps Phases 0–1 are free (local only). Costs start at DevOps Phase 2 — run `terraform destroy` when you stop for the day.

---

## Prerequisites

- An AWS account (with billing alerts configured).
- Local tools: `docker`, `kubectl`, `terraform`, `aws` CLI, `helm`, `git`, plus Node and Python.
- A GitHub account with the three repositories created.
- Basic familiarity with Linux/Ubuntu and the command line.
