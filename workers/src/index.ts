import { Worker } from 'bullmq';
import IORedis from 'ioredis';
import dotenv from 'dotenv';
import { processMediaJob } from './jobs/processMedia';

// Load environment variables from frontend (or root)
dotenv.config({ path: '../frontend/.env' });

const redisConnection = new IORedis(process.env.REDIS_URL || 'redis://localhost:6379', {
  maxRetriesPerRequest: null,
});

console.log('🚀 Starting FamVault Worker on queue: media-processing');
console.log(`📡 Connecting to Redis: ${process.env.REDIS_URL || 'redis://localhost:6379'}`);

const worker = new Worker(
  'media-processing',
  async (job) => {
    console.log(`[Job ${job.id}] ⏳ Started processing media: ${job.data.mediaId}`);
    try {
      await processMediaJob(job.data);
      console.log(`[Job ${job.id}] ✅ Completed processing media: ${job.data.mediaId}`);
    } catch (error) {
      console.error(`[Job ${job.id}] ❌ Failed to process media:`, error);
      throw error;
    }
  },
  {
    connection: redisConnection,
    concurrency: 2, // Process up to 2 images concurrently
  }
);

worker.on('failed', (job, err) => {
  console.error(`[Job ${job?.id}] Failed with error: ${err.message}`);
});

process.on('SIGINT', async () => {
  console.log('Shutting down worker...');
  await worker.close();
  process.exit(0);
});
