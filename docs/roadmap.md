# MicroShop — Roadmap & Index

The build plan for MicroShop, a **core complete** microservices e-commerce app (browse → account → cart → checkout → pay → order history) wrapped in a full DevOps pipeline.

Start with `overview.md` for the architecture and tech stack. Then work the two tracks below in order — each phase produces something that **runs and is verifiable** before you move on.

> **Working with Claude Code:** tackle one phase per session. Point Claude Code at `overview.md` plus the specific phase file, and ask it to scaffold only that phase. Verify the "Done when" checkpoint before continuing.

---

## Track 1 — Application development (build the software)

Build the services first. Auth comes first because everything depends on it; the gateway and frontend come last because they sit in front of the others.

| # | File | Builds |
| --- | --- | --- |
| 1 | `app-development/app-phase-1-scaffolding.md` | Repo, API contracts, data model, JWT plan |
| 2 | `app-development/app-phase-2-auth-service.md` | `auth-service` |
| 3 | `app-development/app-phase-3-product-service.md` | `product-service` (+ Redis cache, search) |
| 4 | `app-development/app-phase-4-cart-service.md` | `cart-service` |
| 5 | `app-development/app-phase-5-order-and-payment.md` | `order-service` + `payment-service` (checkout) |
| 6 | `app-development/app-phase-6-api-gateway.md` | `api-gateway` |
| 7 | `app-development/app-phase-7-frontend.md` | `frontend` (multi-page) |

**Cost:** free (local development only).

---

## Track 2 — DevOps (wrap the pipeline around it)

| # | File | Goal | New tools |
| --- | --- | --- | --- |
| 0 | `phases/phase-0-local-development.md` | App runs locally | Docker, Docker Compose |
| 1 | `phases/phase-1-local-kubernetes.md` | App runs on local K8s | kind/minikube, kubectl |
| 2 | `phases/phase-2-aws-infrastructure.md` | App runs on AWS | Terraform, EKS, ECR |
| 3 | `phases/phase-3-jenkins-ci.md` | Automated image builds | Jenkins, Trivy |
| 4 | `phases/phase-4-argocd-cd.md` | Automated GitOps deploys | ArgoCD, Kustomize |
| 5 | `phases/phase-5-monitoring.md` | Observability | Prometheus, Grafana, Helm |
| 6 | `phases/phase-6-production-polish.md` | Hardened setup | cert-manager, HPA, secret tooling |

**Cost:** free through Phase 1; AWS billing starts at Phase 2 — run `terraform destroy` when you stop for the day.

---

## How the tracks connect

```
App 1 → 2 → 3 → 4 → 5 → 6 → 7      (build the app)
                            │
                            ▼
DevOps 0 → 1 → 2 → 3 → 4 → 5 → 6    (Compose → K8s → AWS → CI → CD → monitor → polish)
```

The two tracks meet at **DevOps Phase 0**: once all services are built, Docker Compose runs them together locally, and the pipeline takes over from there.

---

## File map

```
overview.md                     # architecture, tech stack, scope
roadmap.md                      # this file
app-development/                # Track 1 — 7 phase specs
phases/                         # Track 2 — 7 phase specs (0–6)
```
