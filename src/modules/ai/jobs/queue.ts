// ============================================================================
// AI JOB QUEUE
// ============================================================================
// Simple in-memory job queue for AI generation tasks
// TODO: Replace with Redis/Bull for production scaling

import { logger } from "@/lib/logger";

import { runEngine } from "../core/registry";
import type { AIJob, AISectionKey } from "../types";
import { saveAISection } from "./persist";

// In-memory job store (replace with Redis in production)
const jobs = new Map<string, AIJob>();

/**
 * Enqueue a new AI job
 */
export async function enqueue(params: {
  reportId: string;
  engine: string;
  sectionKey: AISectionKey;
  context?: any;
}): Promise<string> {
  const jobId = `job_${Date.now()}_${crypto.randomUUID().slice(0, 8)}`;

  const job: AIJob = {
    id: jobId,
    reportId: params.reportId,
    sectionKey: params.sectionKey,
    engine: params.engine,
    status: "running",
    createdAt: new Date().toISOString(),
  };

  jobs.set(jobId, job);

  // Execute job async (no await)
  executeJob(jobId, params).catch((error) => {
    logger.error(`[AI Queue] Job ${jobId} failed`, { error: String(error) });
    const failedJob = jobs.get(jobId);
    if (failedJob) {
      failedJob.status = "failed";
      failedJob.error = error.message;
      jobs.set(jobId, failedJob);
    }
  });

  return jobId;
}

/**
 * Execute a job
 */
async function executeJob(
  jobId: string,
  params: {
    reportId: string;
    engine: string;
    sectionKey: AISectionKey;
    context?: any;
  }
): Promise<void> {
  const job = jobs.get(jobId);
  if (!job) throw new Error(`Job ${jobId} not found`);

  try {
    // Run the engine
    const result = await runEngine(
      params.engine,
      params.reportId,
      params.sectionKey,
      params.context
    );

    // Save result to database
    await saveAISection(params.reportId, params.sectionKey, result);

    // Update job
    job.status = "succeeded";
    job.result = result;
    job.completedAt = new Date().toISOString();
    jobs.set(jobId, job);
  } catch (error: any) {
    job.status = "failed";
    job.error = error.message;
    jobs.set(jobId, job);
    throw error;
  }
}

/**
 * Get job status
 */
export function getStatus(jobId: string): AIJob | null {
  return jobs.get(jobId) || null;
}

/**
 * Retry a failed job
 */
export async function retry(jobId: string): Promise<string> {
  const oldJob = jobs.get(jobId);
  if (!oldJob) throw new Error(`Job ${jobId} not found`);
  if (oldJob.status !== "failed") {
    throw new Error(`Job ${jobId} is not in failed state`);
  }

  // Create new job with same params
  const newJobId = await enqueue({
    reportId: oldJob.reportId,
    engine: oldJob.engine,
    sectionKey: oldJob.sectionKey!,
  });

  return newJobId;
}

/**
 * Get all jobs for a report
 */
export function getJobsByReport(reportId: string): AIJob[] {
  return Array.from(jobs.values()).filter((job) => job.reportId === reportId);
}

/**
 * Clear completed jobs (cleanup)
 */
export function clearCompleted(): number {
  let count = 0;
  for (const [jobId, job] of jobs.entries()) {
    if (job.status === "succeeded" || job.status === "failed") {
      jobs.delete(jobId);
      count++;
    }
  }
  return count;
}
