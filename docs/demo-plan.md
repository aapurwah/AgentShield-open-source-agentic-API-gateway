# AgentShield Demo Plan

## Goal
Create a short, polished demo that highlights the new realtime dashboard and agent behavior visualization.

## Demo steps

1. Start the full stack:
   ```bash
   cd agentshield
   docker compose up --build
   ```
2. Open the dashboard at `http://localhost:3000`.
3. Open a terminal and send traffic through the proxy:
   ```bash
   curl -H "X-Agent-Goal-ID:build-feature-101" -H "X-Agent-Task-ID:task-1" http://localhost:8080/api/test
   curl -H "X-Agent-Goal-ID:build-feature-101" -H "X-Agent-Task-ID:task-1" http://localhost:8080/api/test
   curl -H "X-Agent-Goal-ID:loop-test" -H "X-Agent-Task-ID:stuck-task" http://localhost:8080/api/test
   ```
4. Watch the dashboard receive live SSE events and update the visualizer.
5. Point out:
   - AgentVisualizer sparkline charts
   - live event timeline bars
   - burst allowance and loop detection cards

## Recording

- Use a screen recorder such as OBS or ShareX.
- Capture a 30–45 second clip of the dashboard plus terminal traffic.
- Highlight the moment the dashboard updates from backend events.

## Demo script

Use this command sequence in a terminal while the dashboard is open:

```bash
cd agentshield
# Start the stack
docker compose up --build -d

# Send goal-based traffic
curl -H "X-Agent-Goal-ID:build-feature-101" -H "X-Agent-Task-ID:task-1" http://localhost:8080/api/test
curl -H "X-Agent-Goal-ID:build-feature-101" -H "X-Agent-Task-ID:task-1" http://localhost:8080/api/test

# Trigger loop detection
for i in $(seq 1 25); do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -H "X-Agent-Goal-ID:loop-test" \
    -H "X-Agent-Task-ID:stuck-task" \
    http://localhost:8080/api/test
done
```

This will show live spikes in the visualizer and demonstrate loop protection after request 20.

## GIF guidance

- A GIF should be short: 8–12 seconds focused on dashboard updates.
- Record the dashboard browser window plus a quick terminal snippet.
- Use ShareX (Windows) or Peek (Linux) and export a compact GIF.
- Save the file as `docs/demo.gif` or attach it to your repo presentation.
