import { useState, useEffect, useRef, useCallback } from "react";

const ENDPOINTS = [
  "/api/v1/chat/completions",
  "/api/v1/embeddings",
  "/api/v1/search",
  "/api/v1/query",
  "/api/v1/agents/execute",
  "/api/v1/tools/search",
  "/api/v1/tools/code-interpreter",
  "/api/v1/models/list",
];

const GOAL_PREFIXES = [
  "build-feature-",
  "debug-issue-",
  "analyze-repo-",
  "generate-report-",
  "refactor-module-",
  "deploy-service-",
  "investigate-bug-",
  "optimize-query-",
  "write-tests-",
  "review-pr-",
];

const GOAL_IDS = Array.from({ length: 6 }, (_, i) => ({
  id: `${GOAL_PREFIXES[i % GOAL_PREFIXES.length]}${100 + i}`,
  rpm: 200 + i * 40,
}));

const INITIAL_SPARKLINE = Array.from({ length: 10 }, () => 0);

function rng(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function generateTrafficEntry(seed, overrides = {}) {
  const status = overrides.status || (Math.random() > 0.85
    ? pick([429, 418, 403])
    : 200);
  return {
    id: `seed-${seed}-${rng(0, 99999)}`,
    timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
    status,
    goalId: overrides.goalId || (Math.random() > 0.3 ? GOAL_IDS[seed % GOAL_IDS.length].id : null),
    taskId: `task-${1000 + seed}`,
    method: pick(["GET", "POST", "PUT"]),
    endpoint: ENDPOINTS[seed % ENDPOINTS.length],
    source: Math.random() > 0.3 ? "agent" : `ip-${rng(1, 255)}.${rng(1, 255)}.${rng(1, 255)}.${rng(1, 255)}`,
  };
}

const EMPTY_METRICS = {
  totalRequests: 0,
  burstsAllowed: 0,
  ddosBlocked: 0,
  computeSaved: 0,
  sparklineData: {
    requests: INITIAL_SPARKLINE,
    bursts: INITIAL_SPARKLINE,
    ddos: INITIAL_SPARKLINE,
    compute: INITIAL_SPARKLINE,
  },
};

export default function useAgentData() {
  const [metrics, setMetrics] = useState(EMPTY_METRICS);
  const [traffic, setTraffic] = useState([]);
  const [goals, setGoals] = useState([]);
  const [loops, setLoops] = useState([]);
  const [systemStatus, setSystemStatus] = useState("normal");
  const [hydrated, setHydrated] = useState(false);
  const tickRef = useRef(0);

  const updateTick = useCallback(() => {
    const seed = tickRef.current++;

    const newRequests = rng(30, 80);
    const newBursts = rng(20, 60);
    const newDdos = rng(5, 30);
    const newCompute = rng(10, 40);

    setMetrics((prev) => {
      const pushSparkline = (arr, val) => [...arr.slice(1), val];

      const updatedDdos = prev.ddosBlocked + newDdos;
      setSystemStatus(updatedDdos > 3000 ? "under_attack" : "normal");

      return {
        totalRequests: prev.totalRequests + newRequests,
        burstsAllowed: prev.burstsAllowed + newBursts,
        ddosBlocked: updatedDdos,
        computeSaved: prev.computeSaved + newCompute,
        sparklineData: {
          requests: pushSparkline(prev.sparklineData.requests, newRequests * 8 + rng(-50, 50)),
          bursts: pushSparkline(prev.sparklineData.bursts, newBursts * 12 + rng(-30, 30)),
          ddos: pushSparkline(prev.sparklineData.ddos, newDdos * 15 + rng(-20, 20)),
          compute: pushSparkline(prev.sparklineData.compute, newCompute * 10 + rng(-15, 15)),
        },
      };
    });

    const newEntries = Array.from({ length: rng(2, 5) }, (_, i) =>
      generateTrafficEntry(seed * 10 + i)
    );
    if (Math.random() > 0.75) {
      newEntries.push(
        generateTrafficEntry(seed * 10 + 99, { status: 429 }),
        generateTrafficEntry(seed * 10 + 98, { status: 418 })
      );
    }

    setTraffic((prev) => {
      const merged = [...newEntries, ...prev];
      return merged.slice(0, 50);
    });

    setGoals(
      GOAL_IDS.map((g) => ({
        ...g,
        rpm: Math.max(0, g.rpm + rng(-40, 80)),
      }))
    );

    if (Math.random() > 0.7) {
      const stuckTask = `stuck-task-${rng(100, 999)}`;
      setLoops([
        {
          taskId: stuckTask,
          endpoint: pick(ENDPOINTS),
          hits: 21,
          timestamp: new Date().toISOString().replace("T", " ").slice(0, 19),
        },
      ]);
    }
  }, []);

  useEffect(() => {
    if (!hydrated) {
      setGoals(GOAL_IDS.map((g) => ({ ...g })));
      setTraffic(
        Array.from({ length: 20 }, (_, i) => generateTrafficEntry(i))
      );
      setHydrated(true);
    }
    updateTick();
    const interval = setInterval(updateTick, 2000);

    // Try to connect to mock-backend SSE stream for real events
    let es;
    try {
      if (typeof window !== "undefined") {
        const proto = window.location.protocol;
        const host = window.location.hostname;
        const url = `${proto}//${host}:3001/events`;
        es = new EventSource(url);
        es.onmessage = (ev) => {
          try {
            const msg = JSON.parse(ev.data);
            if (msg.type === "request") {
              const entry = {
                id: `sse-${msg.timestamp}-${Math.floor(Math.random()*10000)}`,
                timestamp: msg.timestamp.replace("T", " ").slice(0, 19),
                status: msg.status || 200,
                goalId: msg.goalId || null,
                taskId: msg.taskId || null,
                method: msg.method || "GET",
                endpoint: msg.path || msg.endpoint || "/",
                source: "sse",
              };

              setTraffic((prev) => [entry, ...prev].slice(0, 50));

              setMetrics((prev) => {
                const pushSparkline = (arr, val) => [...arr.slice(1), val];
                const newReq = 1;
                const newBurst = msg.goalId ? 1 : 0;
                const newDdos = entry.status >= 400 ? 1 : 0;
                const newCompute = 0;
                const updatedDdos = prev.ddosBlocked + newDdos;
                setSystemStatus(updatedDdos > 3000 ? "under_attack" : "normal");

                return {
                  totalRequests: prev.totalRequests + newReq,
                  burstsAllowed: prev.burstsAllowed + newBurst,
                  ddosBlocked: updatedDdos,
                  computeSaved: prev.computeSaved + newCompute,
                  sparklineData: {
                    requests: pushSparkline(prev.sparklineData.requests, newReq * 8),
                    bursts: pushSparkline(prev.sparklineData.bursts, newBurst * 12),
                    ddos: pushSparkline(prev.sparklineData.ddos, newDdos * 15),
                    compute: pushSparkline(prev.sparklineData.compute, newCompute * 10),
                  },
                };
              });
            }
          } catch (e) {
            // ignore parse errors
          }
        };
      }
    } catch (e) {
      // ignore EventSource failures
    }

    return () => {
      clearInterval(interval);
      if (es) es.close();
    };
  }, [hydrated, updateTick]);

  return { metrics, traffic, goals, loops, systemStatus };
}
