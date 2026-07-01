# Phase 4 — Continuous Delivery with ArgoCD (GitOps)

**Objective:** Close the loop. Jenkins commits the new image tag to a dedicated GitOps repo; ArgoCD detects the change and deploys it to EKS automatically. After this phase, nobody runs `kubectl apply` by hand.

**Cost:** Same as Phase 2/3 (ArgoCD runs inside the existing cluster).

**Prerequisite:** Phase 3 complete — Jenkins builds and pushes SHA-tagged images to ECR.

---

## What gets implemented

- A new **`microshop-gitops`** repo holding all Kubernetes manifests, structured with **Kustomize**.
- **ArgoCD** installed in the cluster.
- An ArgoCD **`Application`** that watches `microshop-gitops`.
- A new Jenkins stage that **updates the image tag** in the GitOps repo and commits it.
- **Auto-sync** enabled so ArgoCD applies changes without manual intervention.

---

## The GitOps repo

Manifests move out of `microshop` (app code) into `microshop-gitops` (deployment config). This separation is the heart of GitOps — Git becomes the single source of truth for cluster state.

```
microshop-gitops/
├── base/
│   ├── api-gateway.yaml
│   ├── auth-service.yaml
│   ├── product-service.yaml
│   ├── cart-service.yaml
│   ├── order-service.yaml
│   ├── payment-service.yaml
│   ├── frontend.yaml
│   ├── postgres.yaml
│   ├── redis.yaml
│   ├── ingress.yaml
│   └── kustomization.yaml
└── overlays/
    └── prod/
        ├── kustomization.yaml     # sets image tags + replica counts
        └── patches/               # env-specific patches
```

The `prod` overlay's `kustomization.yaml` holds the **image tags** — this is the single line Jenkins will update on every build:

```yaml
images:
  - name: <acct>.dkr.ecr.<region>.amazonaws.com/microshop/product-service
    newTag: a1b2c3d        # ← Jenkins overwrites this
```

---

## ArgoCD installation + Application

1. Install ArgoCD into an `argocd` namespace (official manifests or Helm).
2. Expose the ArgoCD UI (port-forward for now; ALB Ingress later).
3. Create an `Application` pointing at the GitOps repo:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: microshop
  namespace: argocd
spec:
  source:
    repoURL: https://github.com/<you>/microshop-gitops
    path: overlays/prod
    targetRevision: main
  destination:
    server: https://kubernetes.default.svc
    namespace: microshop
  syncPolicy:
    automated: { prune: true, selfHeal: true }
```

`selfHeal: true` means if someone manually changes the cluster, ArgoCD reverts it back to match Git. `prune: true` deletes resources removed from Git.

---

## The CI → CD handoff (new Jenkins stage)

Add a final stage to the `Jenkinsfile`:

| Step | Action |
| --- | --- |
| 1 | Clone `microshop-gitops` |
| 2 | Update `newTag` in `overlays/prod/kustomization.yaml` to the new commit SHA (e.g. with `kustomize edit set image` or `yq`) |
| 3 | `git commit` + `git push` to `microshop-gitops` |

That push is what ArgoCD reacts to. Jenkins needs a GitHub credential with write access to the GitOps repo.

---

## The full flow after this phase

```
push to microshop
  → Jenkins: test, build, scan, push image to ECR
  → Jenkins: update tag in microshop-gitops, commit
  → ArgoCD: detects change, syncs
  → new version live on EKS
```

All automatic. To **roll back**, you `git revert` in `microshop-gitops` — ArgoCD redeploys the previous version.

---

## Run & verify

1. Push a visible change to `microshop` (e.g. change a product name).
2. Watch Jenkins build and commit to `microshop-gitops`.
3. Watch ArgoCD detect the commit and sync.
4. Confirm the change is live — without touching `kubectl`.

**Done when:**

- A single push to the app repo flows end to end to a live deployment with no manual steps.
- The ArgoCD UI shows the app as `Synced` / `Healthy`.
- A `git revert` in the GitOps repo rolls the app back automatically.

---

## Common pitfalls

- Jenkins lacks write access to the GitOps repo → the commit stage fails.
- An infinite loop risk: keep app code and GitOps repos separate so Jenkins committing to GitOps doesn't re-trigger the app pipeline.
- ArgoCD not auto-syncing → `syncPolicy.automated` not set, or it's only polling (default ~3 min; add a webhook for instant sync).
- Image tag in the overlay doesn't match what was pushed to ECR → pods `ErrImagePull`.
