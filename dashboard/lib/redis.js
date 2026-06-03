import Redis from "ioredis";

const REDIS_URL = process.env.REDIS_URL || "redis://redis:6379";

let redis = null;

export function getRedis() {
  if (!redis) {
    redis = new Redis(REDIS_URL, {
      maxRetriesPerRequest: 2,
    });
  }
  return redis;
}
