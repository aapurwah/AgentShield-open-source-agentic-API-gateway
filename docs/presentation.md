# AgentShield Presentation Deck

## Slide 1 — Title
AgentShield
Agentic API Gateway for safe, goal-aware agent traffic

- Live dashboard with agent behavior visualization
- Real-time SSE stream from backend
- Goal-based bursts + loop detection + coalescing

---

## Slide 2 — Problem
AI agents generate high-volume traffic that looks like DDoS.

- IP-based throttling breaks agent fan-out.
- Identical retries waste backend compute.
- Stuck tasks can cause loop storms.

---

## Slide 3 — Solution
AgentShield protects backends by understanding agent intent.

- Burst allowances per `X-Agent-Goal-ID`
- Per-task loop detection with HTTP 418 on abuse
- Request coalescing for duplicate submissions
- Real-time dashboard monitoring with live events

---

## Slide 4 — Architecture
```
[Agent] -> [AgentShield Proxy] -> [Backend]
                     | 
                     +-> [Redis]
                     +-> [Dashboard]
```

- Proxy handles rate limiting, coalescing, loops
- Redis stores counters and cache state
- Dashboard shows live traffic, goals, and alerts

---

## Slide 5 — Unique feature
Real-time Agent Visualizer

- Recharts sparkline charts for request patterns
- SSE-driven backend events feed the dashboard
- Timeline view for error spikes and goal-based traffic

---

## Slide 6 — Demo
Local demo flow:

1. Start Docker stack with `docker compose up --build`
2. Open dashboard at `http://localhost:3000`
3. Send requests through proxy at `http://localhost:8080`
4. Watch live SSE events appear in the visualizer

---

## Slide 7 — Roadmap
Next enhancements:

- Real backend integration with production proxy SSE
- Predictive anomaly alerting for agent loops
- Exportable incident report snapshots
- Kubernetes-ready multi-tenant deployment
