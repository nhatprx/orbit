# Orbit Cloud Files Infrastructure Guide

This guide covers Orbit's primary Dev Server workflow, offline/outage local Docker fallback (MinIO), AWS production provisioning with Terraform (`infra/terraform/cloud-files/`), CloudFront Signed URL setup, and Orbit Native Office document processing.

---

## 1. Primary Dev Workflow & Offline Fallback

### Primary Dev Workflow (Local BE/FE -> Remote Dev Server)

Orbit's default development workflow runs Spring Boot (`localhost:8080`) and Vite (`localhost:5173`) locally against remote Dev Server services (AWS RDS PostgreSQL, Dev Server Redis, and AWS S3 `orbit-cloud-files-dev`). See [CLOUD_DEV_WORKFLOW.md](CLOUD_DEV_WORKFLOW.md) for the complete setup guide.

- **Deploy Dev Server third-party stack (Redis):**
  ```bash
  docker compose -f infra/docker/docker-compose.dev-server.yml up -d
  ```

### Offline / Outage Local Fallback (MinIO)

When AWS or the Dev Server is unreachable, start the local Docker stack (`postgres`, `redis`, `minio`, `minio-init`):

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Local fallback endpoints:
- **MinIO S3 API / Console:** `http://localhost:9000` / `http://localhost:9001` (`orbit_minio` / `orbit_minio_dev`, bucket `orbit-cloud-files`, CORS enabled for `http://localhost:5173`).
- Uncomment the **OFFLINE / OUTAGE LOCAL FALLBACK** section in `.env` (sets `AWS_S3_ENDPOINT=http://localhost:9000` and `AWS_S3_PATH_STYLE_ACCESS=true`). For the full containerized stack, `infra/docker/docker-compose.local.yml` wires internal `http://minio:9000` automatically.

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

- **Zero Backend Byte Proxying for Bulk Transfers:** Browsers upload directly to S3 via Presigned `PUT` (single or multipart) and download via CloudFront Signed URLs. Spring Boot only signs URLs and tracks metadata in PostgreSQL.
- **Immutable UUID Key Layout:** Objects are stored under `cloud/users/{userId}/{nodeId}/{uuid}`, `cloud/workspaces/{wsId}/{nodeId}/{uuid}`, and `cloud/projects/{projId}/{nodeId}/{uuid}`. Because keys never mutate in place, CloudFront caches objects safely for up to 1 year while honoring `response-content-disposition` and `response-content-type` query parameters.
- **Lifecycle Cost Controls:**
  - Incomplete multipart uploads are aborted after **2 days** so abandoned browser uploads do not accumulate hidden S3 part storage charges.
  - Objects larger than **128 KB** transition to **S3 Intelligent-Tiering** after **30 days**, automatically lowering storage costs for infrequently accessed files without retrieval penalties.
- **Least-Privilege IAM:** The EC2 Instance Profile is restricted to object operations under `cloud/*` and prefix-scoped `s3:ListBucket` / `s3:ListBucketMultipartUploads`, with TLS (`aws:SecureTransport`) enforced by the bucket policy.

---

## 4. Orbit Native Office (Inline Document, Spreadsheet, Slide, and PDF Editing)

Orbit uses an integrated inline editing architecture with zero external document server containers:
- **CodeMirror 6** edits plain text, Markdown, CSV, JSON, YAML, and source code directly in the browser.
- **Orbit Native Office (`DocxOfficeCodec`, `XlsxOfficeCodec`, `PptxOfficeCodec`)** parses and serializes `.docx`, `.xlsx`, and `.pptx` OOXML archives using Apache POI in Spring Boot, exposing `GET` and `PUT` `/nodes/{nodeId}/office-content` across User, Workspace, and Project scopes with optimistic concurrency control (`expectedUpdatedAt`) and automatic RAG re-indexing (`CloudFileReadyEvent`).
- **Inline PDF Viewer** renders `.pdf` documents directly inside the Orbit workspace via signed download URLs.
