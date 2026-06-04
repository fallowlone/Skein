# Expand the `aws` track to full depth

Branch: `expand-aws`. First read `PROTOCOL.md` in this folder and follow it exactly.
Track `aws` already has units 00-start-here, 01-core-model, 02-compute-and-deploy (orders 0-2). Add the units below (orders 3+), author every lesson EN+RU to `ready`. Keep the cert-tag convention: put a CLF-C02 and/or SAA-C03 objective in each lesson's `concepts`.

## Units to add

### 03-storage  (crux: pick the right AWS storage for the job)
- `01-s3-object-storage` (middle) — buckets, keys, storage classes, lifecycle, presigned URLs, durability vs availability.
- `02-block-and-file` (middle) — EBS vs EFS vs instance store; when each.
- `03-databases` (middle) — RDS (managed relational, Multi-AZ, read replicas) vs DynamoDB (NoSQL, partition keys, capacity) — TradeoffMatrix.

### 04-networking  (crux: the VPC and how traffic flows)
- `01-vpc-and-subnets` (middle) — VPC, public/private subnets, route tables, IGW, NAT Gateway, the egress-cost trap.
- `02-security-groups-and-nacls` (middle) — SG (stateful) vs NACL (stateless), least-privilege networking.
- `03-dns-and-cdn` (middle) — Route 53, CloudFront, edge, TLS/ACM.

### 05-observability  (crux: see what your AWS workload is doing)
- `01-cloudwatch` (middle) — metrics, logs, alarms, dashboards, log retention/cost.
- `02-tracing-and-events` (senior) — X-Ray tracing, EventBridge, structured logs, the cost of observability.

### 06-iac  (crux: define infrastructure as code)
- `01-cloudformation-and-cdk` (senior) — CloudFormation templates, stacks/drift, CDK (typed IaC).
- `02-terraform-on-aws` (senior) — providers, state, plan/apply, modules; CDK vs Terraform (TradeoffMatrix).

### 07-cost-and-security  (crux: cheap and hardened)
- `01-cost-optimization` (middle) — the cost levers (compute purchase options recap, egress, idle, NAT), Budgets/Cost Explorer/tagging.
- `02-iam-deep-and-kms` (senior) — IAM policies/conditions/boundaries deep, roles for cross-account, KMS, Secrets Manager.

### 08-putting-it-together
- `01-capstone-three-tier` (senior) — design a secure, observable, cost-aware 3-tier AWS architecture end to end (VPC + ALB + Fargate + RDS + S3 + CloudWatch + IaC).

Author at middle/senior depth. Prices are illustrative/region-dependent — say so and cite the pricing page. Sources from docs.aws.amazon.com. Build green on `expand-aws`, commit, do NOT merge.
