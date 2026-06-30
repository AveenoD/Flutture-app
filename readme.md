## CrownCo CRM – Monorepo

This repository contains the **complete CrownCo CRM system** – backend services, frontend applications, and infrastructure/deployment configuration – organized as a single monorepo.

### 🔍 High‑Level Overview

- **Backend (`Backend/`)**:  
  19+ microservices (core APIs, integrations, lead routing, negotiation, booking, communication, etc.) plus PostgreSQL schema and migrations.
- **Frontend (`Frontend/`)**:  
  Multiple **Next.js 16 + React 19 + TypeScript** apps for Manager, Presales, Sales, and unified Pre‑to‑Sales workflows.
- **Infra (`Infra/`)**:  
  Kubernetes manifests for **Azure AKS** and **K3S**, plus **Docker Compose** for local PostgreSQL + Redis.

### 📁 Top‑Level Structure

- `Backend/` – Backend services, API docs, and database schema  
- `Frontend/` – All Next.js frontends (manager, presales, sales, pre‑to‑sales)  
- `Infra/` – Kubernetes manifests, kubeconfigs, domain mapping, Docker Compose setup  
- `Todo` – High‑level task list / notes

For details, see:

- Backend: `Backend/readme.md`  
- Frontend: `Frontend/readme.md`  
- Infra: `Infra/readme.md`  
- Core API docs & E2E: `Backend/APIs/core-api/readme.md`  
- Database schema: `Backend/Database/README.md`  
- Local infra (DB + Redis): `Infra/Compose/README.md`

### ⚙️ Local Development – Quick Start

#### 1. Start PostgreSQL + Redis (Docker Compose)

From `Infra/Compose`:

```bash
cd Infra/Compose
docker-compose up -d
```

This brings up:
- PostgreSQL (`crownco-db` with schema auto‑loaded from `Backend/Database`)  
- Redis (matching `core-api` defaults)

#### 2. Run Backend (Core API example)

Backend services are documented in `Backend/readme.md` and `Backend/APIs/core-api/readme.md`. Typical flow:

1. Make sure DB is up (via Docker Compose above).  
2. Apply any additional migrations / seed scripts as needed (see `Backend/APIs/core-api/scripts/*`).  
3. Run the core API service (see service‑specific README or Go entrypoint).

> Use the API Services Summary and core‑api README for the exact commands, ports, and E2E test scripts.

#### 3. Run a Frontend App

Example (Pre‑to‑Sales app):

```bash
cd Frontend/crownco-pre-to-sales-frontend/my-app
npm install
npm run dev
```

Then open `http://localhost:3000` in your browser.  
Other apps follow the same pattern under `Frontend/`:
- `crownco-manager-frontend/my-app`
- `crownco-presales-frontend/my-app`
- `crownco-sales-frontend/my-app`

### 🚀 Deployment & Images (Infra)

Kubernetes manifests and kubeconfigs live under `Infra/`:

- Azure AKS: `Infra/Azure/Production`, `Infra/Azure/Stage`  
- K3S: `Infra/K3S/Production`, `Infra/K3S/Stage`  
- Domain mapping: `Infra/DomainMapping.config`  
- Local DB/Redis: `Infra/Compose`

When building Docker images (for Azure or K3S):

- **Always tag with explicit versions** (e.g. `1.0.1`, `1.0.2`) – **never** `latest`.  
- **Always build multi‑platform images** to support both **Mac** and **Linux/AMD64**:

```bash
docker buildx build \
  --platform linux/amd64,linux/arm64 \
  -t <registry>/crownco-backend:<version> \
  .
docker push <registry>/crownco-backend:<version>
```

See `Infra/readme.md` for full deployment workflow (kubectl context, apply manifests, verification, monitoring, and security notes).

### 🧭 Where To Look Next

- **Understand business/domain**: `Backend/readme.md` and `Backend/API_SERVICES_SUMMARY.md`  
- **Work on UI/UX**: `Frontend/readme.md` and app‑specific READMEs / docs  
- **Set up or change environments**: `Infra/readme.md` and `Infra/Compose/README.md`

This root README is meant as an entry point; always defer to the module‑specific READMEs for the most detailed and up‑to‑date instructions.
