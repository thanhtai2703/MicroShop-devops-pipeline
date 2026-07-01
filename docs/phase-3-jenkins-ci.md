# Phase 3 — Continuous Integration with Jenkins

**Objective:** Automate the build. A push to GitHub triggers Jenkins to test, build, scan, and push Docker images to ECR — so you stop building and pushing by hand.

**Cost:** Phase 2 infra + a small EC2 instance for Jenkins.

**Prerequisite:** Phase 2 complete — EKS + ECR exist and you can push images manually.

---

## What gets implemented

- A **Jenkins server** on a dedicated Ubuntu EC2 instance (added to `microshop-infra`).
- A **GitHub webhook** that triggers builds on push.
- A **`Jenkinsfile`** (declarative pipeline) in the `microshop` repo.
- **Trivy** image scanning in the pipeline.
- IAM permissions so Jenkins can push to ECR.

---

## Jenkins setup

Add to `microshop-infra` (or a separate module):

- An EC2 instance (`t3.small`, Ubuntu) with a security group allowing 8080 (UI) and 22 (SSH, locked to your IP).
- A user-data script installing: Java, Jenkins, Docker, the AWS CLI, and Trivy.
- An **IAM instance profile** granting ECR push permissions (`ecr:GetAuthorizationToken`, `ecr:BatchCheckLayerAvailability`, `ecr:PutImage`, `ecr:UploadLayerPart`, etc.).

After boot: unlock Jenkins, install suggested plugins + the Docker, Git, and Pipeline plugins, and add credentials (GitHub token).

---

## The Jenkinsfile

Lives at `microshop/Jenkinsfile`. Declarative pipeline with these stages:

| Stage | What it does |
| --- | --- |
| **Checkout** | Pulls the repo at the triggering commit |
| **Detect changes** | (optional) figure out which services changed to build only those |
| **Test** | Runs unit tests per service (`pytest`, `npm test`) |
| **Build** | `docker build` each service, tag with the **git commit SHA** |
| **Scan** | `trivy image` on each built image; fail on HIGH/CRITICAL (configurable) |
| **Login + Push** | Authenticate to ECR, push the SHA-tagged images |

**Key decisions:**

- **Tag = commit SHA**, never `latest`. This makes every deployment traceable to an exact commit and is required for the GitOps flow in Phase 4.
- The `environment` block holds the ECR registry URL and AWS region.
- Use the EC2 instance profile for AWS auth — no static keys in Jenkins.

**Pipeline skeleton:**

```groovy
pipeline {
  agent any
  environment { ECR = "<acct>.dkr.ecr.<region>.amazonaws.com" }
  stages {
    stage('Checkout') { steps { checkout scm } }
    stage('Test')     { steps { /* pytest + npm test */ } }
    stage('Build')    { steps { /* docker build -t $ECR/...:${GIT_COMMIT} */ } }
    stage('Scan')     { steps { /* trivy image ... */ } }
    stage('Push')     { steps { /* ecr login + docker push */ } }
  }
}
```

---

## GitHub integration

- Add a webhook in the `microshop` repo pointing to `http://<jenkins-ec2>:8080/github-webhook/`.
- Create a Jenkins **multibranch pipeline** or pipeline job that reads the `Jenkinsfile` from the repo.

---

## Run & verify

1. Make a trivial change in `microshop`, commit, and push.
2. Watch Jenkins start a build automatically.

**Done when:**

- A `git push` automatically triggers a green Jenkins pipeline.
- New images tagged with the commit SHA appear in the ECR repositories.
- A pushed image with a known vulnerability is caught by the Trivy stage (test this once to confirm scanning works).

---

## Common pitfalls

- Jenkins can't run Docker → the `jenkins` user isn't in the `docker` group (re-login or restart needed).
- ECR push denied → instance profile missing `ecr:GetAuthorizationToken` or wrong region.
- Webhook not firing → Jenkins URL not reachable from GitHub (security group / public IP), or wrong webhook path.
- Building on every push gets slow → add the "detect changes" stage to build only changed services.
