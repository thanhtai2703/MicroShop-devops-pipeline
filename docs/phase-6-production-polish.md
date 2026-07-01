# Phase 6 — Production Polish

**Objective:** Harden the setup toward production-grade. Add HTTPS, autoscaling, proper secret management, and reliability settings. This phase turns a working demo into something that resembles a real deployment.

**Cost:** Same as Phase 2 (a few extra small components).

**Prerequisite:** Phase 5 complete — full GitOps pipeline with monitoring is working.

---

## What gets implemented

1. **TLS / HTTPS** on the Ingress.
2. **Horizontal Pod Autoscaling** for the stateless services.
3. **Secret management** — remove plaintext secrets from Git.
4. **Reliability** — resource requests/limits and proper probes everywhere.
5. *(Optional)* **ArgoCD notifications** to Slack/email.

All changes flow through `microshop-gitops` so ArgoCD applies them.

---

## 1. TLS / HTTPS

Two common options — pick one:

| Option | How |
| --- | --- |
| **cert-manager + Let's Encrypt** | Install cert-manager, create a `ClusterIssuer`, annotate the Ingress; certs auto-issue and auto-renew |
| **ACM on the ALB** | Request/validate a cert in AWS Certificate Manager, reference it via Ingress annotations on the ALB |

Result: the app is served over `https://` and HTTP redirects to HTTPS. (cert-manager is the more portable, cloud-agnostic skill to learn.)

---

## 2. Horizontal Pod Autoscaling

Add an `HorizontalPodAutoscaler` for the stateless services (`api-gateway`, `auth-service`, `product-service`, `cart-service`, `order-service`, `payment-service`) — `product-service` shown as the example:

```yaml
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata: { name: product-service }
spec:
  scaleTargetRef: { apiVersion: apps/v1, kind: Deployment, name: product-service }
  minReplicas: 2
  maxReplicas: 6
  metrics:
    - type: Resource
      resource: { name: cpu, target: { type: Utilization, averageUtilization: 70 } }
```

Requires the **metrics-server** to be installed. Test by generating load and watching replicas scale up, then back down.

> Don't autoscale PostgreSQL or Redis — they're stateful. Autoscaling applies to the stateless services only.

---

## 3. Secret management

Stop committing base64 "secrets" to Git. Replace the Phase 1 `secret.yaml` with one of:

| Tool | Idea |
| --- | --- |
| **Sealed Secrets** | Encrypt secrets into `SealedSecret` objects that are safe to commit; the controller decrypts them in-cluster |
| **External Secrets Operator** | Keep secrets in **AWS Secrets Manager**; the operator syncs them into K8s Secrets |

Either way, the GitOps repo no longer contains readable credentials.

---

## 4. Reliability hardening

Apply across all Deployments:

- **Resource `requests` and `limits`** on every container (so the scheduler can place pods and HPA has a baseline).
- **`readinessProbe`** (don't send traffic until ready) and **`livenessProbe`** (restart if hung) on `/health`.
- **`PodDisruptionBudget`** for the stateless services so rolling updates don't take everything down at once.
- A sensible **rolling update strategy** (`maxUnavailable`, `maxSurge`).

---

## 5. (Optional) ArgoCD notifications

Configure ArgoCD Notifications to post to Slack or email on sync success/failure, so you find out about deploy problems without watching the UI.

---

## Run & verify

**Done when:**

- The app is reachable over **HTTPS** with a valid certificate; HTTP redirects.
- Under load, `kubectl get hpa` shows replicas scaling up, then scaling back down when load drops.
- No plaintext secret exists anywhere in the `microshop-gitops` repo.
- Every service has resource limits and working probes (`kubectl describe` confirms).
- A rolling deploy completes with zero downtime (the app stays reachable throughout).

---

## Common pitfalls

- HPA shows `<unknown>` for metrics → metrics-server not installed or not reporting.
- Setting `limits` too low → pods OOM-killed or CPU-throttled; tune against real Grafana data from Phase 5.
- cert-manager `ClusterIssuer` misconfigured (wrong ACME email/solver) → certs stay pending.
- Migrating secrets but leaving the old plaintext `secret.yaml` in Git history → rotate the credentials, not just the file.

---

## Where to go next

Once Phase 6 is done you have a complete, hardened DevOps pipeline. Natural extensions for further learning:

- Multiple environments (`dev` / `staging` / `prod` overlays) with ArgoCD ApplicationSets.
- Progressive delivery (canary/blue-green) with Argo Rollouts.
- Centralized logging (Loki + Grafana, or the EFK stack).
- Policy and security scanning in CI (OPA/Conftest, kube-bench).
