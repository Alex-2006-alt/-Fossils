import { Queue } from 'bullmq';
import IORedis from 'ioredis';

// Create a reusable Redis connection for the queue
const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
  lazyConnect: true,
});

export const mediaQueue = new Queue('media-processing', {
  connection: redisConnection,
});
