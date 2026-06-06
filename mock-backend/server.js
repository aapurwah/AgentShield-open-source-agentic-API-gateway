const http = require("http");

const PORT = process.env.PORT || 3001;

const clients = new Set();

function sendEvent(obj) {
  const payload = `data: ${JSON.stringify(obj)}\n\n`;
  for (const res of clients) {
    try {
      res.write(payload);
    } catch (e) {
      clients.delete(res);
    }
  }
}

const server = http.createServer((req, res) => {
  // SSE endpoint
  if (req.url === "/events") {
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "Access-Control-Allow-Origin": "*",
    });
    res.write(`data: ${JSON.stringify({ msg: "connected", timestamp: new Date().toISOString() })}\n\n`);
    clients.add(res);

    req.on("close", () => {
      clients.delete(res);
    });
    return;
  }

  // Regular mock response; also emit event to SSE clients
  const body = [];
  req.on("data", (chunk) => body.push(chunk));
  req.on("end", () => {
    const payload = Buffer.concat(body).toString();

    const response = {
      message: "Mock Backend Response",
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.url,
      headers: {
        "x-agent-goal-id": req.headers["x-agent-goal-id"] || null,
        "x-agent-task-id": req.headers["x-agent-task-id"] || null,
        "x-forwarded-for": req.headers["x-forwarded-for"] || null,
      },
      body: payload || null,
    };

    // Emit a compact event for the dashboard
    try {
      sendEvent({
        type: "request",
        timestamp: response.timestamp,
        method: response.method,
        path: response.path,
        status: 200,
        goalId: response.headers["x-agent-goal-id"],
        taskId: response.headers["x-agent-task-id"],
      });
    } catch (e) {
      // ignore
    }

    res.writeHead(200, {
      "Content-Type": "application/json",
      "X-Backend-Processed": "true",
      "Access-Control-Allow-Origin": "*",
    });
    res.end(JSON.stringify(response, null, 2));
  });
});

// Periodic heartbeat events
setInterval(() => {
  sendEvent({ type: "heartbeat", timestamp: new Date().toISOString() });
}, 3000);

server.listen(PORT, () => {
  console.log(`Mock backend listening on port ${PORT}`);
});
