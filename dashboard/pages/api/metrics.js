import { getRedis } from "../../lib/redis";

export default async function handler(req, res) {
  const redis = getRedis();
  try {
    const goalKeys = await redis.keys("rl:goal:*");
    const ipKeys = await redis.keys("rl:ip:*");
    const loopKeys = await redis.keys("loop:*:*");

    res.status(200).json({
      activeGoals: goalKeys.length,
      activeIPs: ipKeys.length,
      activeLoopCounts: loopKeys.length,
      redisConnected: true,
    });
  } catch (err) {
    res.status(200).json({ activeGoals: 0, activeIPs: 0, activeLoopCounts: 0, redisConnected: false });
  }
}
