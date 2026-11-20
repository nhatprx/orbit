# Orbit Cloud Development Workflow (Local BE/FE -> Remote Dev Server)

This guide covers Orbit's primary development workflow: running Spring Boot and Vite locally on your workstation while connecting to shared Dev Server infrastructure (AWS RDS PostgreSQL, Dev Server Redis, AWS S3, and Dev Server ONLYOFFICE over HTTPS).

---

## 1. Architecture Overview

| Component | Location | Notes |
| --- | --- | --- |
| Frontend (Vite) | Local (`http://localhost:5173`) | Fast HMR; loads ONLYOFFICE `api.js` from HTTPS Dev Server |
| Backend (Spring Boot) | Local (`http://localhost:8080`) | Connects to remote RDS, Redis, and AWS S3 |
| PostgreSQL | Remote Dev Server (AWS RDS) | Shared dev database (`sslmode=require`) |
| Redis | Remote Dev Server (`docker-compose.dev-server.yml`) | Password-protected via `REDIS_PASSWORD` |
| Object Storage | AWS S3 (`orbit-cloud-files-dev`) | Direct browser PUT/GET + direct S3 presigned GET for ONLYOFFICE |
| ONLYOFFICE Document Server | Remote Dev Server (`https://office-dev.orbit.nhatprx.com`) | Proxied by Caddy with automatic TLS and JWT verification |

With `ONLYOFFICE_FILE_SOURCE_MODE=auto` and a blank `AWS_S3_ENDPOINT`, Spring Boot automatically generates short-lived S3 Presigned GET URLs so remote ONLYOFFICE downloads files directly from AWS S3 without calling `localhost:8080`.

---

## 2. Deploy Shared Dev Server Third-Party Stack

On the Dev Server EC2 host, copy the template and start Redis, ONLYOFFICE, and Caddy:

```bash
cp infra/docker/.env.dev-server.example infra/docker/.env
# Edit infra/docker/.env with strong REDIS_PASSWORD, ONLYOFFICE_JWT_SECRET, and ONLYOFFICE_DOMAIN
docker compose -f infra/docker/docker-compose.dev-server.yml --env-file infra/docker/.env up -d
```

Verify readiness:

```bash
curl -sf https://office-dev.orbit.nhatprx.com/healthcheck
```

Security requirements on the Dev Server host:
- Point DNS A record for `ONLYOFFICE_DOMAIN` (e.g., `office-dev.orbit.nhatprx.com`) to the Dev Server public IP.
- Allow inbound TCP `80` and `443` for Caddy TLS issuance and ONLYOFFICE HTTPS traffic.
- Restrict inbound TCP `6379` (Redis) to trusted developer IPs or VPN CIDR blocks in the AWS Security Group.

---

## 3. Configure Local Workstation `.env`

1. Copy the root environment template:

   ```bash
   cp .env.example .env
   ```

2. Fill in the Dev Server RDS endpoint/credentials, Redis host/password, AWS credentials (or configure `~/.aws/credentials`), and `ONLYOFFICE_JWT_SECRET`.
3. Ensure real AWS S3 mode is active:

   ```env
   AWS_S3_ENABLED=true
   AWS_CLOUD_FILES_BUCKET=orbit-cloud-files-dev
   AWS_S3_ENDPOINT=
   AWS_S3_PUBLIC_ENDPOINT=
   AWS_S3_PATH_STYLE_ACCESS=false
   ONLYOFFICE_ENABLED=true
   ONLYOFFICE_PUBLIC_URL=https://office-dev.orbit.nhatprx.com
   ONLYOFFICE_FILE_SOURCE_MODE=auto
   ```

---

## 4. One-Command Tunnel for ONLYOFFICE Save Callbacks

Reading and viewing Office documents works immediately via direct S3 Presigned GET URLs. To persist edits from remote ONLYOFFICE back to your local Spring Boot backend (`http://localhost:8080`), expose port `8080` with one of the following tunnels:

### Option A: Cloudflare Quick Tunnel (Recommended)

```bash
cloudflared tunnel --url http://localhost:8080
```

Copy the generated `https://<random-subdomain>.trycloudflare.com` URL into `.env`:

```env
ONLYOFFICE_CALLBACK_BASE_URL=https://<your-tunnel>.trycloudflare.com
```

### Option B: SSH Reverse Tunnel to Dev Server

```bash
ssh -N -R 8080:localhost:8080 ubuntu@<dev-server-ip>
```

Route the callback URL through the Dev Server address (and set `ONLYOFFICE_ALLOW_PRIVATE_IP=true` on the Dev Server if callbacks target an internal/private interface).

Restart your local Spring Boot process after updating `ONLYOFFICE_CALLBACK_BASE_URL`.

---

## 5. Offline / Outage Local Fallback

If the Dev Server or AWS is unreachable, switch to the self-contained local Docker stack (`postgres`, `redis`, `minio`, `onlyoffice`):

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Then uncomment the **OFFLINE / OUTAGE LOCAL FALLBACK** block at the bottom of `.env` (which switches `AWS_S3_ENDPOINT` to `http://localhost:9000`, `AWS_S3_PATH_STYLE_ACCESS=true`, and `ONLYOFFICE_FILE_SOURCE_MODE=proxy` with `http://localhost:8082`).
