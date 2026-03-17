/**
 * v3 Production Health Check Endpoint
 * Enhanced with full system status monitoring
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { createRedisClientSafely } from "@/lib/upstash";

export async function GET() {
  const startTime = Date.now();

  try {
    // Database check
    let databaseOk = false;
    try {
      await prisma.$queryRaw`SELECT 1`;
      databaseOk = true;
    } catch (error) {
      logger.error("[health] Database check failed:", error);
    }

    // Redis check (real ping when configured)
    let redisConfigured = false;
    let redisOk = false;
    let redisPingMs: number | null = null;
    try {
      const redis = createRedisClientSafely();
      redisConfigured = !!redis;
      if (redis) {
        const redisStart = Date.now();
        // Upstash Redis supports PING
        await redis.ping();
        redisPingMs = Date.now() - redisStart;
        redisOk = true;
      }
    } catch (error) {
      logger.error("[health] Redis ping failed:", error);
      redisOk = false;
    }

    // Auth check (Clerk availability)
    const authOk = !!(
      process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
    );

    // Storage check (Supabase availability)
    const storageOk = !!(
      process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    // AI check (OpenAI availability)
    const aiOk = !!process.env.OPENAI_API_KEY;

    // Critical env vars
    const envVarsPresent = {
      database: !!process.env.DATABASE_URL,
      clerk: authOk,
      supabase: storageOk,
      openai: aiOk,
      stripe: !!(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY),
    };

    // Build SHA (from Vercel env var or default)
    const buildSHA = process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 8) || "local";

    // API check
    const apiOk = true;

    // Overall status
    const allChecks = databaseOk && authOk && storageOk && apiOk;
    const status = allChecks ? "healthy" : "degraded";

    const response = {
      // "ok" should reflect core service viability. Optional integrations can degrade.
      ok: databaseOk && apiOk,
      version: "v3",
      buildSHA,
      timestamp: Date.now(),
      status,
      checks: {
        database: databaseOk,
        redis: redisConfigured ? redisOk : false,
        auth: authOk,
        storage: storageOk,
        api: apiOk,
        ai: aiOk,
      },
      timings: {
        redisPingMs,
      },
      config: {
        redisConfigured,
      },
      envVarsPresent,
      uptime: Date.now() - startTime,
      environment: process.env.NODE_ENV || "unknown",
    };

    logger.info(
      `[${Date.now()}][/api/health] Status: ${status} | DB: ${databaseOk} | Redis: ${redisConfigured ? redisOk : "unconfigured"} | Auth: ${authOk} | Storage: ${storageOk}`
    );

    // Return proper HTTP status codes for uptime monitors & load balancers
    const httpStatus = !databaseOk ? 503 : status === "degraded" ? 207 : 200;

    return NextResponse.json(response, {
      status: httpStatus,
      headers: {
        "Cache-Control": "no-store",
        "X-SkaiScraper-Version": "v3",
        "X-Health-Status": status,
        "X-Response-Time": `${Date.now() - startTime}ms`,
      },
    });
  } catch (error) {
    logger.error("[health] Critical failure:", error);

    return NextResponse.json(
      {
        ok: false,
        version: "v3",
        timestamp: Date.now(),
        status: "offline",
        error: "Unknown error",
      },
      { status: 503 }
    );
  }
}

// HEAD request for simple uptime checks
export async function HEAD() {
  return new Response(null, {
    status: 200,
    headers: {
      "X-SkaiScraper-Version": "v3",
      "X-Status": "healthy",
    },
  });
}
