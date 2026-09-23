import { Queue } from "bullmq";
import IORedis from "ioredis";
// Create a reusable Redis connection for the queue
let mediaQueue: Queue | undefined;
// Read-only photo requests and production builds do not need a Redis connection.
export function getMediaQueue() {
  if (!mediaQueue) {
    const redisConnection = new IORedis(
      process.env.REDIS_URL || "redis://localhost:6379",
      {
        maxRetriesPerRequest: null,
        lazyConnect: true,
      },
    );
    mediaQueue = new Queue("media-processing", { connection: redisConnection });
  }
  return mediaQueue;
}
