import { getRedis } from "../../lib/redis";

export default async function handler(req, res) {
  const redis = getRedis();
  try {
    const keys = await redis.keys("rl:goal:*");
    const goals = [];

    for (const key of keys) {
      const goalID = key.replace("rl:goal:", "");
      const count = parseInt(await redis.get(key)) || 0;
      const ttl = await redis.ttl(key);
      goals.push({ goalID, requests: count, ttlSeconds: ttl });
    }

    goals.sort((a, b) => b.requests - a.requests);
    res.status(200).json({ goals });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
}
