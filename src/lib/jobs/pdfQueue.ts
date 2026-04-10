/**
 * Job Queue System
 * Background PDF generation with Redis
 */

import { Redis } from "@upstash/redis";

// eslint-disable-next-line no-restricted-syntax
const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      // eslint-disable-next-line no-restricted-syntax
      url: process.env.UPSTASH_REDIS_REST_URL,
      // eslint-disable-next-line no-restricted-syntax
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

export interface PdfJob {
  id: string;
  documentId: string;
  status: "queued" | "processing" | "completed" | "failed";
  attempts: number;
  error?: string;
  createdAt: number;
  completedAt?: number;
}

export async function enqueuePdfJob(documentId: string): Promise<string> {
  const jobId = `pdf-job-${documentId}-${Date.now()}`;

  const job: PdfJob = {
    id: jobId,
    documentId,
    status: "queued",
    attempts: 0,
    createdAt: Date.now(),
  };

  if (redis) {
    await redis.set(jobId, JSON.stringify(job), { ex: 86400 }); // 24 hours
    await redis.lpush("pdf-job-queue", jobId);
  }

  return jobId;
}

export async function getPdfJob(jobId: string): Promise<PdfJob | null> {
  if (!redis) return null;

  const data = await redis.get(jobId);
  if (!data) return null;

  return JSON.parse(data as string);
}

export async function updatePdfJob(jobId: string, updates: Partial<PdfJob>): Promise<void> {
  if (!redis) return;

  const job = await getPdfJob(jobId);
  if (!job) return;

  const updated = { ...job, ...updates };
  await redis.set(jobId, JSON.stringify(updated), { ex: 86400 });
}

export async function getNextPdfJob(): Promise<string | null> {
  if (!redis) return null;

  const jobId = await redis.rpop("pdf-job-queue");
  return jobId as string | null;
}
