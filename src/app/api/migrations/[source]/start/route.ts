export const dynamic = "force-dynamic";

/**
 * Migration API Route
 * POST /api/migrations/[source]/start
 *
 * Starts a migration job from an external CRM (AccuLynx, JobNimbus, etc.)
 * Streams progress via SSE to the client.
 */

import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import type { MigrationProgress, MigrationSource } from "@/lib/migrations/base-engine";
import { JobNimbusMigrationEngine } from "@/lib/migrations/jobnimbus-engine";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

// Supported migration sources
const SUPPORTED_SOURCES: MigrationSource[] = ["JOBNIMBUS", "ACCULYNX", "CSV"];

export const POST = withAuth(async (request: NextRequest, { orgId, userId }, routeParams) => {
  const { source } = await routeParams.params;
  const upperSource = source.toUpperCase() as MigrationSource;
  logger.info("[MIGRATION_START]", { source: upperSource, orgId, userId });

  // Validate source
  if (!SUPPORTED_SOURCES.includes(upperSource)) {
    return NextResponse.json({ error: `Unsupported migration source: ${source}` }, { status: 400 });
  }

  // Rate limit (migrations are expensive)
  const rateLimitResult = await checkRateLimit(`migration:${orgId}`, "MIGRATION");
  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: "Too many migration requests. Please wait before starting another." },
      { status: 429 }
    );
  }

  // Parse body
  let body: {
    apiKey?: string;
    accessToken?: string;
    options?: Record<string, any>;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Validate credentials
  if (!body.apiKey && !body.accessToken) {
    return NextResponse.json({ error: "API key or access token is required" }, { status: 400 });
  }

  // Check for existing running migration
  const existingJob = await prisma.migration_jobs.findFirst({
    where: {
      orgId,
      status: { in: ["PENDING", "RUNNING"] },
    },
  });

  if (existingJob) {
    return NextResponse.json(
      { error: "A migration is already in progress", jobId: existingJob.id },
      { status: 409 }
    );
  }

  // Create the appropriate engine
  let engine;
  switch (upperSource) {
    case "JOBNIMBUS":
      engine = new JobNimbusMigrationEngine({
        orgId,
        userId,
        source: "JOBNIMBUS",
        credentials: {
          apiKey: body.apiKey,
          accessToken: body.accessToken,
        },
        options: body.options,
      });
      break;
    // Add other engines as implemented
    default:
      return NextResponse.json(
        { error: `${upperSource} migration not yet implemented` },
        { status: 501 }
      );
  }

  // Test connection first
  const connectionTest = await engine.testConnection();
  if (!connectionTest.ok) {
    return NextResponse.json(
      { error: `Connection failed: ${connectionTest.error}` },
      { status: 400 }
    );
  }

  // For SSE streaming, we need to return a ReadableStream
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      // Progress callback sends SSE events
      engine.setProgressCallback((progress: MigrationProgress) => {
        const data = `data: ${JSON.stringify(progress)}\n\n`;
        controller.enqueue(encoder.encode(data));
      });

      try {
        // Run the migration
        const result = await engine.run();

        // Send final result
        const finalEvent = `data: ${JSON.stringify({ type: "complete", result })}\n\n`;
        controller.enqueue(encoder.encode(finalEvent));
      } catch (error) {
        // Send error event
        const errorEvent = `data: ${JSON.stringify({ type: "error", message: "Internal server error" })}\n\n`;
        controller.enqueue(encoder.encode(errorEvent));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
});

/**
 * GET /api/migrations/[source]/start
 * Returns the status of a running migration
 */
export const GET = withAuth(async (request: NextRequest, { orgId, userId }) => {
  // Get latest migration job for this org
  const job = await prisma.migration_jobs.findFirst({
    where: { orgId },
    orderBy: { createdAt: "desc" },
  });

  if (!job) {
    return NextResponse.json({ job: null });
  }

  return NextResponse.json({
    job: {
      id: job.id,
      source: job.source,
      status: job.status,
      totalRecords: job.totalRecords,
      importedRecords: job.importedRecords,
      skippedRecords: job.skippedRecords,
      errorRecords: job.errorRecords,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
    },
  });
});
