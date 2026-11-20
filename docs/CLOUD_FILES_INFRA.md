# Orbit Cloud Files Infrastructure Guide

This guide covers local S3 emulation with MinIO, AWS production provisioning with Terraform (`infra/terraform/cloud-files/`), CloudFront Signed URL setup, and 10k-user scale/lifecycle operations.

---

## 1. Local Development with MinIO

Local development uses MinIO (`minio/minio:latest`) alongside PostgreSQL and Redis so presigned PUT and multipart uploads work directly from `http://localhost:5173`.

### Start Local Services

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Services started:
- **MinIO S3 API:** `http://localhost:9000`
- **MinIO Console:** `http://localhost:9001` (default credentials: `orbit_minio` / `orbit_minio_dev`)
- **`minio-init`:** One-shot container that creates the private `orbit-cloud-files` bucket.

MinIO is configured with `MINIO_API_CORS_ALLOW_ORIGIN=http://localhost:5173,http://127.0.0.1:5173`, allowing browser `PUT`, `GET`, and `HEAD` requests with `ETag` exposed for multipart upload completion.

### Backend Local `.env` Settings

When running Spring Boot locally against MinIO, set the following in `.env`:

```env
AWS_S3_ENABLED=true
AWS_CLOUD_FILES_BUCKET=orbit-cloud-files
AWS_S3_ENDPOINT=http://localhost:9000
AWS_S3_PUBLIC_ENDPOINT=http://localhost:9000
AWS_S3_PATH_STYLE_ACCESS=true
AWS_ACCESS_KEY_ID=orbit_minio
AWS_SECRET_ACCESS_KEY=orbit_minio_dev
AWS_CLOUDFRONT_ENABLED=false
```

When using the full Docker stack (`infra/docker/docker-compose.local.yml`), the backend container uses `AWS_S3_ENDPOINT=http://minio:9000` for internal SDK calls and `AWS_S3_PUBLIC_ENDPOINT=http://localhost:9000` for browser-facing presigned URLs.

---

## 2. AWS Production Provisioning (Terraform)

All AWS resources for Cloud Files live in `infra/terraform/cloud-files/`:
- `s3.tf`: Dedicated private S3 bucket, Block Public Access ON, SSE-S3 (`AES256`) with bucket keys, TLS-only bucket policy, OAC read policy, CORS (`PUT`, `GET`, `HEAD`, `ETag` exposed), and lifecycle rules.
- `cloudfront.tf`: CloudFront distribution with Origin Access Control (OAC), RSA Public Key and Key Group for Signed URLs, HTTPS redirect, immutable object cache policy, and security response headers.
- `iam.tf`: Least-privilege IAM policy scoped to `cloud/*` in the Cloud Files bucket (optionally attached to the EC2 IAM role).

### Step 1: Generate CloudFront RSA-2048 Keypair

Generate a dedicated RSA keypair (never commit the private key):

```bash
openssl genrsa -out cloudfront_private_key.pem 2048
openssl rsa -pubout -in cloudfront_private_key.pem -out cloudfront_public_key.pem
```

### Step 2: Configure Variables and Apply

```bash
cd infra/terraform/cloud-files
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your bucket name (e.g. `orbit-cloud-files-815802019553`), `allowed_cors_origins`, optional `ec2_role_name`, and the contents of `cloudfront_public_key.pem`.

```bash
terraform init
terraform plan
terraform apply
```

### Step 3: Configure EC2 `/opt/orbit/.env`

Map the Terraform outputs to `/opt/orbit/.env` on the EC2 host:

| Environment Variable | Source |
| --- | --- |
| `AWS_CLOUD_FILES_BUCKET` | `terraform output -raw s3_bucket_name` |
| `AWS_S3_ENDPOINT` | Leave empty in AWS production |
| `AWS_S3_PUBLIC_ENDPOINT` | Leave empty in AWS production |
| `AWS_S3_PATH_STYLE_ACCESS` | `false` |
| `AWS_CLOUDFRONT_ENABLED` | `true` |
| `AWS_CLOUDFRONT_DOMAIN` | `terraform output -raw cloudfront_domain_name` |
| `AWS_CLOUDFRONT_KEY_PAIR_ID` | `terraform output -raw cloudfront_public_key_id` |
| `AWS_CLOUDFRONT_PRIVATE_KEY_PEM` | Single-line `\n`-escaped content of `cloudfront_private_key.pem` |

Convert `cloudfront_private_key.pem` to a single-line `\n`-escaped string:

```bash
awk 'NF {sub(/\r/, ""); printf "%s\\n", $0}' cloudfront_private_key.pem
```

If `ec2_role_name` was left empty, attach `terraform output -raw iam_policy_arn` to the EC2 Instance Profile role in AWS IAM.

### Step 4: Verify CORS and CloudFront OAC

1. **Direct S3 access must be denied (HTTP 403):**

   ```bash
   curl -I "https://<bucket-name>.s3.ap-southeast-1.amazonaws.com/cloud/users/test"
   ```

2. **Unsigned CloudFront request must be denied (HTTP 403 Missing Key-Pair-Id):**

   ```bash
   curl -I "https://<cloudfront-domain>/cloud/users/test"
   ```

3. **S3 CORS preflight from the frontend origin must allow `PUT` and expose `ETag`:**

   ```bash
   curl -i -X OPTIONS \
     -H "Origin: https://orbit.nhatprx.com" \
     -H "Access-Control-Request-Method: PUT" \
     "https://<bucket-name>.s3.ap-southeast-1.amazonaws.com/"
   ```

---

## 3. Scale, Security, and Lifecycle Notes (10k CCU Target)

- **Zero Backend Byte Proxying:** Browsers upload directly to S3 via Presigned `PUT` (single or multipart) and download via CloudFront Signed URLs. Spring Boot only signs URLs and tracks metadata in PostgreSQL.
- **Immutable UUID Key Layout:** Objects are stored under `cloud/users/{userId}/{nodeId}/{uuid}`, `cloud/workspaces/{wsId}/{nodeId}/{uuid}`, and `cloud/projects/{projId}/{nodeId}/{uuid}`. Because keys never mutate in place, CloudFront caches objects safely for up to 1 year while honoring `response-content-disposition` and `response-content-type` query parameters.
- **Lifecycle Cost Controls:**
  - Incomplete multipart uploads are aborted after **2 days** so abandoned browser uploads do not accumulate hidden S3 part storage charges.
  - Objects larger than **128 KB** transition to **S3 Intelligent-Tiering** after **30 days**, automatically lowering storage costs for infrequently accessed files without retrieval penalties.
- **Least-Privilege IAM:** The EC2 Instance Profile is restricted to object operations under `cloud/*` and prefix-scoped `s3:ListBucket` / `s3:ListBucketMultipartUploads`, with TLS (`aws:SecureTransport`) enforced by the bucket policy.
