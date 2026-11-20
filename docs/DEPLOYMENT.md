# Orbit Production Deployment Guide

This document describes the AWS production architecture, domain routing, S3 object layout, EC2 runtime configuration, and GitHub Actions CI/CD pipelines for Orbit.

---

## 1. AWS Production Architecture

- **AWS Region:** `ap-southeast-1` (Singapore)
- **AWS Account ID:** `815802019553`
- **Container Registry (ECR):**
  - `815802019553.dkr.ecr.ap-southeast-1.amazonaws.com/orbit-backend`
  - `815802019553.dkr.ecr.ap-southeast-1.amazonaws.com/orbit-frontend`
- **Compute (EC2):** Ubuntu 24.04 LTS running Docker Engine and Docker Compose in `/opt/orbit`.
- **Reverse Proxy & TLS:** Caddy (`caddy:2-alpine`) terminates HTTPS on ports 80 and 443 with automatic Let's Encrypt certificates and proxies traffic over the internal Docker network (`orbit_internal`):
  - `orbit.nhatprx.com` -> `frontend:80` (Nginx serving the React SPA)
  - `api.orbit.nhatprx.com` -> `backend:8080` (Spring Boot API, `SPRING_PROFILES_ACTIVE=prod`)
- **Primary Database:** AWS RDS for PostgreSQL (connected over TLS from the backend container).
- **Cache & Session Store:** Redis (`redis:7-alpine`) running on the internal Docker network with AOF persistence (`--appendonly yes`) and no public port exposure.
- **Object Storage:** Amazon S3 bucket `orbit-storage-815802019553` accessed by the backend via the EC2 IAM Instance Profile (`DefaultCredentialsProvider`), requiring no static AWS keys in `.env`.

---

## 2. Production URLs and Health Endpoints

| Service | URL |
| --- | --- |
| Frontend Application | `https://orbit.nhatprx.com` |
| Frontend Health Check | `https://orbit.nhatprx.com/healthz` |
| Backend API Base URL | `https://api.orbit.nhatprx.com` |
| Backend Health Check | `https://api.orbit.nhatprx.com/api/v1/health` |
| OpenAPI / Swagger UI | `https://api.orbit.nhatprx.com/swagger-ui.html` |

---

## 3. S3 Bucket Prefix Layout

Bucket: `orbit-storage-815802019553` (`ap-southeast-1`)

Presigned upload and download URLs are restricted to the following key prefixes:

| Prefix | Purpose |
| --- | --- |
| `uploads/` | General user and workspace file uploads |
| `avatars/` | User profile avatars |
| `artifacts/` | Build outputs, exports, and generated artifacts |

---

## 4. Required GitHub Repository Secrets

Configure the following secrets under **GitHub Repository Settings -> Secrets and variables -> Actions**:

| Secret Name | Required | Description |
| --- | --- | --- |
| `AWS_ACCESS_KEY_ID` | Yes | IAM access key with permissions to push images to ECR (`orbit-backend`, `orbit-frontend`) |
| `AWS_SECRET_ACCESS_KEY` | Yes | IAM secret access key paired with `AWS_ACCESS_KEY_ID` |
| `EC2_HOST` | Yes | Public IPv4 address or DNS hostname of the EC2 server |
| `EC2_USER` | Optional | SSH username for the EC2 host (defaults to `ubuntu` if omitted) |
| `EC2_SSH_KEY` | Yes | Private SSH key (PEM/OpenSSH format) authorized for `EC2_USER` on the EC2 host |

---

## 5. EC2 Host Setup (`/opt/orbit`)

The EC2 host expects the following files inside `/opt/orbit`:

1. `docker-compose.prod.yml` (synced automatically from `infra/docker/docker-compose.prod.yml`)
2. `Caddyfile` (synced automatically from `infra/docker/Caddyfile`)
3. `.env` (created manually on the server from `infra/docker/.env.prod.example`; never committed to Git)

The EC2 instance should have:
- Docker Engine + Docker Compose plugin installed
- AWS CLI v2 installed (for `aws ecr get-login-password`)
- An attached IAM Instance Profile granting read/write access to `arn:aws:s3:::orbit-storage-815802019553/*` and ECR pull permissions
- Security group rules allowing inbound TCP `80`, `443`, and `22` (restricted as appropriate)

---

## 6. CI/CD Workflows

All workflows live in `.github/workflows/`:

- **`ci.yml`**: Runs on every push and pull request to `main`. Executes `node ponytail/check.mjs`, frontend `npm ci && npm run typecheck && npm run build`, and backend `mvn -B test`.
- **`deploy-backend.yml`**: Runs on pushes to `main` touching `backend/**`, `infra/docker/**`, or the workflow file (plus manual `workflow_dispatch`). Runs Maven tests, builds and pushes `orbit-backend` (`:<sha>` and `:latest`) to ECR, syncs compose/Caddy config to `/opt/orbit`, restarts `redis`, `backend`, and `caddy`, and verifies `https://api.orbit.nhatprx.com/api/v1/health`.
- **`deploy-frontend.yml`**: Runs on pushes to `main` touching `frontend/**`, `infra/docker/**`, or the workflow file (plus manual `workflow_dispatch`). Runs frontend typecheck and build with `VITE_API_BASE_URL=https://api.orbit.nhatprx.com`, builds and pushes `orbit-frontend` (`:<sha>` and `:latest`) to ECR, syncs compose/Caddy config to `/opt/orbit`, restarts `frontend` and `caddy`, and verifies `https://orbit.nhatprx.com/healthz`.

---

## 7. Admin Seeding (EC2 Terminal)

The initial administrator account is seeded on-demand using `infra/scripts/seed-admin.sh`, which runs the backend container in one-shot non-web CLI mode (`--spring.main.web-application-type=none`) against the configured RDS database. Never commit real admin passwords or credentials to Git.

1. Place `infra/scripts/seed-admin.sh` at `/opt/orbit/seed-admin.sh` on the EC2 host and mark it executable:

   ```bash
   chmod +x /opt/orbit/seed-admin.sh
   ```

2. Run the single-command seeding procedure from the EC2 terminal (replace the placeholder password with a strong secret):

   ```bash
   /opt/orbit/seed-admin.sh admin@orbit.nhatprx.com 'replace-with-strong-admin-password' "Orbit Admin"
   ```

   Alternatively, pass credentials via environment variables (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional `ADMIN_NAME`) to avoid exposing the password in process arguments:

   ```bash
   ADMIN_EMAIL="admin@orbit.nhatprx.com" \
   ADMIN_PASSWORD="replace-with-strong-admin-password" \
   ADMIN_NAME="Orbit Admin" \
   /opt/orbit/seed-admin.sh
   ```

---

## 8. OAuth2 Provider Configuration (Google & GitHub)

Configure OAuth2 applications in Google Cloud Console and GitHub Developer Settings, then set `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GITHUB_CLIENT_ID`, `GITHUB_CLIENT_SECRET`, and `FRONTEND_URL` in `/opt/orbit/.env` (production) or your local environment.

### Production (`orbit.nhatprx.com`)

| Provider | Setting | Value |
| --- | --- | --- |
| Google | Authorized JavaScript Origin / Homepage URL | `https://orbit.nhatprx.com` |
| Google | Authorized Redirect URI | `https://api.orbit.nhatprx.com/login/oauth2/code/google` |
| GitHub | Homepage URL | `https://orbit.nhatprx.com` |
| GitHub | Authorization Callback URL | `https://api.orbit.nhatprx.com/login/oauth2/code/github` |

### Local Development (`localhost`)

| Provider | Setting | Value |
| --- | --- | --- |
| Google | Authorized JavaScript Origin / Homepage URL | `http://localhost:5173` |
| Google | Authorized Redirect URI | `http://localhost:8080/login/oauth2/code/google` |
| GitHub | Homepage URL | `http://localhost:5173` |
| GitHub | Authorization Callback URL | `http://localhost:8080/login/oauth2/code/github` |
