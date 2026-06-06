# AgentShield — Agentic API Gateway (MVP)

![CI](https://github.com/<OWNER>/<REPO>/actions/workflows/ci.yml/badge.svg)

An intent-based API gateway that solves the "AI agent looks like a DDoS" problem. Instead of rate-limiting by IP or API key, AgentShield limits by **Goal ID**, enabling agentic fan-out while protecting backend APIs.

**Project pitch:** AgentShield is a proof-of-concept gateway for AI agents that preserves high-volume request throughput while preventing abuse. It combines goal-aware burst control, task-level loop detection, request coalescing, and a real-time dashboard driven by backend event streaming.

## Architecture

```
                   ┌───────── Ingress ─────────┐
                   │  NGINX (agentshield.local) │
                   └─────────────┬──────────────┘
                                 │
                   ┌─────────────▼──────────────┐     ┌──────────────┐
                   │  AgentShield Go Proxy      │────▶│  Backend API │
                   │  (HPA: 2–10 replicas)       │     │  (upstream)  │
                   │  :8080                     │     └──────────────┘
                   └─────────────┬──────────────┘
                                 │
                   ┌─────────────▼──────────────┐     ┌──────────────┐
                   │     Redis 7                │◀────│  Dashboard   │
                   │     :6379                  │     │  Next.js     │
                   └────────────────────────────┘     │  :3000       │
                                                     └──────────────┘
```

## MVP Features

| Feature | Description |
|---|---|
| **Goal-Based Rate Limiting** | 100 req/min per IP by default. 1000 req/min burst allowance when `X-Agent-Goal-ID` header is present. Returns HTTP 429 on exceed. |
| **Request Coalescing** | Deduplicates identical requests (same URL, headers, body, goal) within a 100ms window. Only 1 forwarded to backend; cached response served to all. |
| **Loop Detection** | Tracks per-task per-endpoint frequency. A task making >20 requests to the same endpoint in 5s triggers HTTP 418 (I'm a Teapot). |
| **Live Dashboard** | Enterprise-grade Next.js dashboard with TailwindCSS, lucide-react icons, and recharts sparklines. Bento-grid layout with live traffic feed, goal burst bars, and loop alerts. Mock mode runs standalone with randomized live data — no Redis required for development. |

## Deployment Options

### Option 1: Docker Compose (local dev / testing)

**Prerequisites:** Docker and Docker Compose

```bash
cd agentshield
docker compose up --build
```

This starts 4 services:

| Service | Port | Description |
|---|---|---|
| `redis` | 6379 | State store for rate limits and loop counters |
| `mock-backend` | 3001 | Simple JSON echo server |
| `proxy` | 8080 | AgentShield reverse proxy (the gateway) |
| `dashboard` | 3000 | Live monitoring dashboard |

### Verify

```bash
# Health check
curl http://localhost:8080/health

# Simple request through proxy to backend
curl http://localhost:8080/api/test

# Dashboard
open http://localhost:3000
```

### Standalone Dashboard (mock mode — no Redis)

The dashboard ships with a `useAgentData` mock hook that generates live randomized traffic, goals, and alerts. To run it without the full stack:

```bash
cd agentshield/dashboard
npm install
npm run dev
# → http://localhost:3000
```

The dashboard polls every 2 seconds, counting up metrics, pushing new traffic rows, and occasionally simulating 429/418 spikes. System status toggles to "Under Attack" when blocked count crosses 3,000.

### Live Events (SSE)

The `mock-backend` exposes a Server-Sent Events (SSE) stream at `http://localhost:3001/events`. When running the full stack with Docker Compose the dashboard will attempt to connect to this stream and display real-time request events in the visualizer.

If you run services separately, ensure the mock-backend is reachable at port `3001` from your browser (CORS is enabled for the SSE endpoint).

Example: open the dashboard at `http://localhost:3000` and the visualizer will receive live request events emitted by the backend.

## Demo assets and slides

- `docs/presentation.md` — short slide deck outline for your pitch.
- `docs/demo-plan.md` — demo recording plan and local execution steps.
- `docs/README.md` — docs index for presentation and demo assets.

### Option 2: Kubernetes via Helm (enterprise deployment)

**Prerequisites:** Kubernetes cluster with NGINX Ingress Controller and Helm 3 installed. Docker images pushed to a container registry (`ghcr.io/agentshield/proxy`, `ghcr.io/agentshield/dashboard`).

```bash
# Install with embedded Redis and default ingress host (agentshield.local)
helm install agentshield ./helm/agentshield \
  --namespace agentshield --create-namespace

# Dry-run first to verify rendered manifests
helm install agentshield ./helm/agentshield \
  --namespace agentshield --create-namespace \
  --dry-run --debug

# Override images / external Redis / ingress host
helm install agentshield ./helm/agentshield \
  --namespace agentshield --create-namespace \
  --set proxy.replicaCount=3 \
  --set proxy.image.repository=registry.example.com/agentshield-proxy \
  --set dashboard.image.repository=registry.example.com/agentshield-dashboard \
  --set mockBackend.image.repository=registry.example.com/agentshield-mock-backend \
  --set redis.enabled=false \
  --set redis.externalHost=redis-ha.internal \
  --set redis.externalPassword=supersecret \
  --set ingress.hosts[0].host=gateway.example.com

# Upgrade
helm upgrade agentshield ./helm/agentshield --namespace agentshield
```

**What gets deployed:**

| Resource | Details |
|---|---|
| Proxy Deployment | Go reverse proxy, 2→10 replicas (HPA at 70% CPU) |
| Proxy Service | ClusterIP on :8080 |
| Proxy HPA | `autoscaling/v2`, CPU utilization target |
| Dashboard Deployment | Next.js dashboard, 1 replica |
| Dashboard Service | ClusterIP on :3000 (internal only) |
| Redis Deployment + Service | Embedded Redis 7 with auth (optional; disable for external Redis) |
| ConfigMap | Non-sensitive proxy env vars |
| Secret | Redis password (stable across Helm upgrades) |
| Ingress | NGINX ingress routing to proxy |

All values configurable in `helm/agentshield/values.yaml` or via `--set`.

## Run Tests

```bash
./test.sh
```

The test script demonstrates all 4 MVP features:

1. **Test A — IP Rate Limiting**: Floods the proxy without agent headers, expects HTTP 429 after exceeding 100 req/min.
2. **Test B — Goal Burst**: Sends 50 requests with an `X-Agent-Goal-ID`, all should succeed under the 1000/min burst limit.
3. **Test C — Request Coalescing**: Fires 5 identical POST requests simultaneously within 100ms. Expects cached responses returned to all.
4. **Test D — Loop Detection**: Sends 25 requests from the same task to the same endpoint. Expects HTTP 418 after request 21.

## Manual Testing with curl

### Standard request (IP rate-limited)

```bash
# Make many requests quickly without agent headers
for i in $(seq 1 110); do
  curl -s -o /dev/null -w "%{http_code}\n" http://localhost:8080/api/test
done
# First ~100 return 200, then 429
```

### Goal-based burst

```bash
for i in $(seq 1 50); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-Agent-Goal-ID:my-goal-1" \
    -H "X-Agent-Task-ID:task-$i" \
    http://localhost:8080/api/burst
done
# All 50 should return 200
```

### Loop detection

```bash
for i in $(seq 1 25); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-Agent-Goal-ID:loop-test" \
    -H "X-Agent-Task-ID:stuck-task" \
    http://localhost:8080/api/loop
done
# First 20 return 200, then 418 (I'm a Teapot)
```

## Required Headers

| Header | Required For | Description |
|---|---|---|
| `X-Agent-Goal-ID` | Burst mode | Groups requests under a goal for burst allowance |
| `X-Agent-Task-ID` | Loop detection | Identifies individual agent tasks for loop tracking |

## Configuration

Proxy environment variables (in `docker-compose.yml`):

| Variable | Default | Description |
|---|---|---|
| `LISTEN_ADDR` | `:8080` | Proxy listen address |
| `BACKEND_URL` | `http://mock-backend:3001` | Upstream backend |
| `REDIS_ADDR` | `redis:6379` | Redis address |
| `REDIS_PASSWORD` | (empty) | Redis password |

## Project Structure

```
agentshield/
├── proxy/                    # Go reverse proxy
│   ├── main.go               # Entry point, middleware chain
│   ├── config/config.go      # Environment config
│   ├── middleware/
│   │   ├── rate_limiter.go   # IP + Goal-based rate limiting
│   │   ├── request_coalescer.go  # Request deduplication
│   │   └── loop_detector.go  # Stuck-task loop detection
│   └── Dockerfile
├── mock-backend/             # Mock API for testing
│   ├── server.js
│   └── Dockerfile
├── dashboard/                # Next.js monitoring dashboard (see below for standalone mock mode)
│   ├── pages/
│   │   ├── _app.js           # Global wrapper (Inter font, globals.css)
│   │   ├── index.js          # Bento-grid dashboard page
│   │   └── api/              # API routes (goals, loops, metrics)
│   ├── components/
│   │   ├── Header.js         # Shield logo, pulsing System Normal/Under Attack status
│   │   ├── MetricCard.js     # Bento card w/ lucide-react icon + recharts sparkline
│   │   ├── TrafficFeed.js    # Scrolling live request feed w/ colored status pills
│   │   ├── GoalList.js       # Goal-ID list w/ progress bars (emerald→amber→red)
│   │   └── LoopDetectorCard.js  # Loop alert card — dim check or amber warning
│   ├── lib/
│   │   ├── redis.js          # ioredis client for production Redis
│   │   └── useAgentData.js   # Mock hook — randomized live data, polling every 2s
│   ├── styles/globals.css    # Tailwind directives + Google Fonts import
│   ├── tailwind.config.js    # Zinc color scale, Inter + JetBrains Mono, animations
│   ├── postcss.config.js
│   └── Dockerfile
├── helm/agentshield/         # Helm chart for Kubernetes
│   ├── Chart.yaml
│   ├── values.yaml
│   └── templates/            # K8s manifests (Deployments, Services, HPA, Ingress, etc.)
├── docker-compose.yml        # Local dev startup
├── test.sh                   # Automated test suite
└── README.md
```
