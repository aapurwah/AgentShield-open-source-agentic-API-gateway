import { getRedis } from "../../lib/redis";

export default async function handler(req, res) {
  const redis = getRedis();
  try {
    const loopKeys = await redis.keys("loop:*:*");
    const loops = [];

    for (const key of loopKeys) {
      const parts = key.replace("loop:", "").split(":");
      const taskID = parts[0];
      const endpoint = parts.slice(1).join(" ");
      const count = parseInt(await redis.get(key)) || 0;
      const ttl = await redis.ttl(key);
      loops.push({ taskID, endpoint, requests: count, ttlSeconds: ttl });
    }

    loops.sort((a, b) => b.requests - a.requests);
    res.status(200).json({ loops });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
