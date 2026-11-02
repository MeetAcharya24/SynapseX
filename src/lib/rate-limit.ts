import { Ratelimit } from "@upstash/ratelimit";
import { redis } from "@/lib/redis";

/**
 * Per-user cap on how often a project graph can be executed. Sliding window
 * so a burst right at a minute boundary can't double the effective rate.
 */
export const executeRateLimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(10, "60 s"),
  prefix: "ratelimit:execute",
});
