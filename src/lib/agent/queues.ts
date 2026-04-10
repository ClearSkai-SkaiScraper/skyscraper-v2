import { JobsOptions,Queue, Worker } from "bullmq";
import IORedis from "ioredis";

const QUEUE_NAME = "skai_agents"; // ✅ no colon

type QBundle = {
  queue: Queue;
  connection: IORedis;
};

declare global {
  var __skai_agents__: QBundle | undefined;
}

// Create lazily, only at runtime (not at build)
export function getAgentQueue(): QBundle {
  if (global.__skai_agents__) return global.__skai_agents__!;

  // eslint-disable-next-line no-restricted-syntax
  const url = process.env.REDIS_URL;
  if (!url) {
    throw new Error("REDIS_URL is not set. Configure it in .env.local and Vercel env.");
  }

  const connection = new IORedis(url, { maxRetriesPerRequest: null });
  const queue = new Queue(QUEUE_NAME, {
    connection,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: "exponential", delay: 5000 },
      removeOnComplete: 200,
      removeOnFail: 100,
    } as JobsOptions,
  });

  global.__skai_agents__ = { queue, connection };
  return global.__skai_agents__;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createAgentWorker(processor: (job: any) => Promise<any>, concurrency = 5) {
  const { connection } = getAgentQueue();
  return new Worker(QUEUE_NAME, processor, { connection, concurrency });
}
