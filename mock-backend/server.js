const http = require("http");

const PORT = process.env.PORT || 3001;

const server = http.createServer((req, res) => {
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

    res.writeHead(200, {
      "Content-Type": "application/json",
      "X-Backend-Processed": "true",
    });
    res.end(JSON.stringify(response, null, 2));
  });
});

server.listen(PORT, () => {
  console.log(`Mock backend listening on port ${PORT}`);
});
