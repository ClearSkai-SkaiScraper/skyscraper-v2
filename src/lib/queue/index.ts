/**
 * Queue Adapter using pg-boss
 *
 * Simple PostgreSQL-based job queue for worker processes.
 * No Redis required - stores jobs in PostgreSQL.
 *
 * @see https://github.com/timgit/pg-boss
 */

import { type Job, PgBoss } from "pg-boss";

import { logger } from "@/lib/logger";

export type { Job };

// =============================================================================
// BOSS INSTANCE
// =============================================================================

let bossInstance: PgBoss | null = null;

/**
 * Get or create pg-boss instance
 */
export async function getBoss(): Promise<PgBoss> {
  if (!bossInstance) {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) {
      throw new Error("DATABASE_URL environment variable is required");
    }

    logger.debug("Initializing pg-boss...");

    // Create new PgBoss instance with explicit schema
    bossInstance = new PgBoss({
      connectionString,
      schema: "pgboss", // Use dedicated schema for job tables
    });

    bossInstance.on("error", (error) => {
      logger.error("pg-boss error:", error);
    });

    // Start pg-boss - this creates all internal tables on first run
    logger.debug("Starting pg-boss (creating tables if needed)...");
    await bossInstance.start();
    logger.debug("✅ pg-boss started successfully!");
  }

  return bossInstance;
}

// =============================================================================
// ENQUEUE FUNCTIONS
// =============================================================================

/**
 * Enqueue a job for worker processing
 *
 * @param queueName - Job type (e.g., "damage-analyze", "proposal-generate")
 * @param data - Job payload
 * @param options - Job options (priority, retries, etc.)
 * @returns Job ID
 */
export async function enqueue(
  queueName: string,
  data: any,
  options?: {
    priority?: number; // Higher = more priority (default: 0)
    retryLimit?: number; // Retry attempts
    retryDelay?: number; // Wait between retries (seconds)
    expireInSeconds?: number; // Job expiration
    singletonKey?: string; // Prevent duplicate jobs with same key
  }
): Promise<string> {
  const boss = await getBoss();

  const jobId = await boss.send(queueName, data, options);

  if (!jobId) {
    throw new Error(`Failed to enqueue job: ${queueName}`);
  }

  logger.debug(`Job enqueued: ${queueName} (${jobId})`);
  return jobId;
}

/**
 * Enqueue job to run at specific time
 */
export async function enqueueScheduled(
  queueName: string,
  data: any,
  startAfter: Date | string
): Promise<string> {
  const boss = await getBoss();

  const jobId = await boss.send(queueName, data, {
    startAfter: typeof startAfter === "string" ? new Date(startAfter) : startAfter,
  });

  if (!jobId) {
    throw new Error(`Failed to enqueue scheduled job: ${queueName}`);
  }

  logger.debug(`Scheduled job enqueued: ${queueName} (${jobId})`);
  return jobId;
}

// =============================================================================
// SUBSCRIBE FUNCTIONS (Worker)
// =============================================================================

export type JobHandler<T = any> = (payload: T, job: Job) => Promise<void>;

/**
 * Subscribe to a job queue
 *
 * @param queueName - Job type to subscribe to
 * @param handler - Function to handle jobs
 * @param options - Subscription options
 */
export async function subscribe<T = any>(
  queueName: string,
  handler: JobHandler<T>,
  options?: {
    batchSize?: number; // How many jobs to fetch at once (default: 1)
  }
): Promise<void> {
  const boss = await getBoss();

  const workOptions = {
    batchSize: options?.batchSize ?? 1,
  };

  await boss.work(queueName, workOptions, async (job: Job[] | Job) => {
    const jobs = Array.isArray(job) ? job : [job];

    for (const j of jobs) {
      try {
        logger.debug(`Processing job: ${queueName} (${j.id})`);
        await handler(j.data as T, j);
        logger.debug(`Job completed: ${queueName} (${j.id})`);
      } catch (error) {
        logger.error(`Job failed: ${queueName} (${j.id})`, error);

        // Capture queue failure to Sentry
        if (typeof window === "undefined") {
          const Sentry = await import("@sentry/nextjs");
          Sentry.captureException(error, {
            tags: { subsystem: "queue", queueName },
            extra: { jobId: j.id, jobData: j.data },
          });
        }

        throw error; // pg-boss will handle retry
      }
    }
  });

  logger.debug(`Subscribed to queue: ${queueName}`);
}

// =============================================================================
// JOB MANAGEMENT
// =============================================================================

/**
 * Cancel jobs by queue name
 */
export async function cancelJobs(queueName: string, jobIds: string[]): Promise<void> {
  const boss = await getBoss();
  await boss.cancel(queueName, jobIds);
  logger.debug(`Jobs cancelled: ${queueName} - ${jobIds.length} jobs`);
}

/**
 * Get job status by queue name and job ID
 */
export async function getJobStatus(queueName: string, jobId: string): Promise<Job | null> {
  const boss = await getBoss();
  return boss.getJobById(queueName, jobId);
}

/**
 * Complete jobs manually
 */
export async function completeJobs(queueName: string, jobIds: string[]): Promise<void> {
  const boss = await getBoss();
  await boss.complete(queueName, jobIds);
}

/**
 * Fail jobs manually
 */
export async function failJobs(
  queueName: string,
  jobIds: string[],
  errorMessage: string
): Promise<void> {
  const boss = await getBoss();
  await boss.fail(queueName, jobIds, new Error(errorMessage));
}

// =============================================================================
// CLEANUP
// =============================================================================

/**
 * Stop pg-boss gracefully
 */
export async function stopQueue(): Promise<void> {
  if (bossInstance) {
    await bossInstance.stop();
    bossInstance = null;
    logger.debug("pg-boss queue stopped");
  }
}

// Handle process termination
process.on("SIGTERM", async () => {
  await stopQueue();
});

process.on("SIGINT", async () => {
  await stopQueue();
});
