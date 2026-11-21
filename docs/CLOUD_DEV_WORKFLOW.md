# Orbit Cloud Development Workflow (Local BE/FE -> Remote Dev Server)

This guide covers Orbit's primary development workflow: running Spring Boot and Vite locally on your workstation while connecting to shared Dev Server infrastructure (AWS RDS PostgreSQL, Dev Server Redis, and AWS S3).

---

## 1. Architecture Overview

| Component | Location | Notes |
| --- | --- | --- |
| Frontend (Vite) | Local (`http://localhost:5173`) | Fast HMR; inline CodeMirror 6 and Orbit Native Office editors |
| Backend (Spring Boot) | Local (`http://localhost:8080`) | Connects to remote RDS, Redis, and AWS S3; Apache POI OOXML codecs |
| PostgreSQL | Remote Dev Server (AWS RDS) | Shared dev database (`sslmode=require`) |
| Redis | Remote Dev Server (`docker-compose.dev-server.yml`) | Password-protected via `REDIS_PASSWORD` |
| Object Storage | AWS S3 (`orbit-cloud-files-dev`) | Direct browser PUT/GET + backend Apache POI read/write for `.docx`, `.xlsx`, `.pptx` |

---

## 2. Deploy Shared Dev Server Third-Party Stack

On the Dev Server EC2 host, copy the template and start Redis:

```bash
cp infra/docker/.env.dev-server.example infra/docker/.env
# Edit infra/docker/.env with strong REDIS_PASSWORD
docker compose -f infra/docker/docker-compose.dev-server.yml --env-file infra/docker/.env up -d
```

Security requirements on the Dev Server host:
- Restrict inbound TCP `6379` (Redis) to trusted developer IPs or VPN CIDR blocks in the AWS Security Group.

---

## 3. Configure Local Workstation `.env`

1. Copy the root environment template:

   ```bash
   cp .env.example .env
   ```

2. Fill in the Dev Server RDS endpoint/credentials, Redis host/password, and AWS credentials (or configure `~/.aws/credentials`).
3. Ensure real AWS S3 mode is active:

   ```env
   AWS_S3_ENABLED=true
   AWS_CLOUD_FILES_BUCKET=orbit-cloud-files-dev
   AWS_S3_ENDPOINT=
   AWS_S3_PUBLIC_ENDPOINT=
   AWS_S3_PATH_STYLE_ACCESS=false
   ```

---

## 4. Offline / Outage Local Fallback

If the Dev Server or AWS is unreachable, switch to the self-contained local Docker stack (`postgres`, `redis`, `minio`, `minio-init`):

```bash
docker compose -f infra/docker/docker-compose.yml up -d
```

Then uncomment the **OFFLINE / OUTAGE LOCAL FALLBACK** block at the bottom of `.env` (which switches `AWS_S3_ENDPOINT` to `http://localhost:9000` and `AWS_S3_PATH_STYLE_ACCESS=true`).
