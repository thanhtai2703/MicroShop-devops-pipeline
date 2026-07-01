# Phase 2 — AWS Infrastructure with Terraform

**Objective:** Provision the AWS infrastructure (EKS cluster + ECR registries + networking) entirely with Terraform, then deploy the app to EKS manually. This is the first phase that costs money.

**Cost:** EKS control plane ~$0.10/hr + node EC2 cost. **Run `terraform destroy` when you stop for the day.**

**Prerequisite:** Phase 1 complete — you have working manifests and understand the K8s objects.

---

## What gets implemented

A new repo, `microshop-infra`, containing modular Terraform that creates:

- A **VPC** with public + private subnets across 2 AZs, NAT gateway, Internet gateway.
- An **EKS** cluster with a managed node group.
- **ECR** repositories (one per service).
- **IAM/IRSA** roles for the AWS Load Balancer Controller and service accounts.
- Remote **state backend** (S3 + DynamoDB lock).

---

## Repository structure

```
microshop-infra/
├── backend.tf              # S3 + DynamoDB state config
├── providers.tf            # aws provider, region
├── main.tf                 # wires modules together
├── variables.tf
├── outputs.tf              # cluster name, ECR URLs, etc.
└── modules/
    ├── vpc/
    ├── eks/
    ├── ecr/
    └── iam/
```

> Tip: for EKS and VPC you can wrap the well-maintained community modules (`terraform-aws-modules/eks/aws`, `.../vpc/aws`) inside your own thin modules rather than writing every resource by hand.

---

## What each module creates

**backend.tf** — configures Terraform to store state in an S3 bucket with a DynamoDB table for state locking. (Create the bucket + table once, manually or via a small bootstrap, before `init`.)

**modules/vpc** — VPC, 2 public + 2 private subnets, NAT gateway, route tables. Subnets tagged for EKS/ELB discovery (`kubernetes.io/role/elb` etc.).

**modules/eks** — the EKS control plane + one managed node group (start with 2× `t3.medium`). Enables the OIDC provider needed for IRSA.

**modules/ecr** — one ECR repository per service (`microshop/api-gateway`, `microshop/auth-service`, `microshop/product-service`, `microshop/cart-service`, `microshop/order-service`, `microshop/payment-service`, `microshop/frontend`), with image scanning enabled and a lifecycle policy to expire old untagged images.

**modules/iam** — IRSA roles, primarily for the AWS Load Balancer Controller so the Ingress can provision an ALB.

**outputs.tf** — exports cluster name, region, and the per-service ECR repository URLs (you'll need these to tag/push images and in manifests).

---

## Deploy workflow for this phase

1. Provision infra:
   ```bash
   terraform init
   terraform plan
   terraform apply
   ```
2. Connect kubectl:
   ```bash
   aws eks update-kubeconfig --name microshop --region <region>
   ```
3. Install the AWS Load Balancer Controller (Helm) using the IRSA role from the `iam` module.
4. Build, tag, and push **every service's** image to ECR (the example shows one; repeat per service, or script the loop):
   ```bash
   aws ecr get-login-password | docker login --username AWS --password-stdin <acct>.dkr.ecr.<region>.amazonaws.com
   docker tag microshop/product-service:dev <acct>.dkr.ecr.<region>.amazonaws.com/microshop/product-service:v0
   docker push <acct>.dkr.ecr.<region>.amazonaws.com/microshop/product-service:v0
   ```
5. Update image references in your Phase 1 manifests to the ECR URLs and `kubectl apply`.
6. Change the Ingress class so it provisions an **ALB** (via the Load Balancer Controller) instead of nginx.

> **Stateful pieces:** for the learning scope, PostgreSQL (the three databases) and Redis run **in-cluster** (the manifests from Phase 1), so Terraform only needs to provision EKS + ECR + networking. A more production-like setup would move PostgreSQL to **RDS** and Redis to **ElastiCache** — both also provisioned with Terraform — which you can do later as an extension.

---

## Run & verify

```bash
kubectl get nodes                       # EKS nodes Ready
kubectl get pods -n microshop           # app pods Running
kubectl get ingress -n microshop        # ALB address populated
```

**Done when:**

- `kubectl get nodes` shows your EKS nodes.
- The app is reachable on the public ALB DNS name.
- `terraform destroy` cleanly removes everything (verify in the AWS console afterward — leftover ELBs/EBS volumes cost money).

---

## Common pitfalls

- Running `terraform apply` before creating the S3 state bucket → backend init fails.
- Forgetting to tag subnets correctly → the ALB controller can't find subnets to place the load balancer.
- Leaving the cluster running overnight → unexpected bill. Destroy or scale node group to 0.
- Image push fails with auth error → re-run `aws ecr get-login-password` (token expires).
