/**
 * Queue Job Hooks
 *
 * Utilities for recording job events during job execution.
 */

import type { Job } from "pg-boss";

import { logger } from "@/lib/logger";

import { pool } from "../db/index.js";

/**
 * Record a job event for UI tracking
 *
 * @param job - pg-boss job object
 * @param status - queued|working|completed|failed|cancelled|retry
 * @param message - Optional status message
 * @param result - Optional result data
 */
export async function recordJobEvent(
  job: Job,
  status: string,
  message?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  result?: any
): Promise<void> {
  const query = `
    INSERT INTO job_events (job_name, job_id, status, message, payload, result, attempts)
    VALUES ($1, $2, $3, $4, $5::jsonb, $6::jsonb, $7)
  `;

  await pool.query(query, [
    job.name,
    job.id,
    status,
    message || null,
    job.data || {},
    result || {},
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (job as any).attempts || 0,
  ]);

  logger.debug(`Job event recorded: ${job.name} (${job.id}) → ${status}`);
}
