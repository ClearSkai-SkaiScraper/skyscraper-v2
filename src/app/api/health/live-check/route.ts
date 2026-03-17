/**
 * Live System Health Check API
 *
 * GET /api/health/live-check
 *
 * Per AI advisor: "Simple internal page showing:
 *   - auth OK
 *   - org context OK
 *   - invite email provider OK
 *   - OpenAI OK
 *   - weather PDF service OK
 *   - DB OK"
 *
 * This helps when something feels broken and you need a fast answer.
 */

export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

interface HealthCheck {
  name: string;
  status: "ok" | "degraded" | "error";
  latencyMs: number;
  message?: string;
}

async function checkDatabase(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return {
      name: "Database (Prisma)",
      status: "ok",
      latencyMs: Date.now() - start,
    };
  } catch (err) {
    return {
      name: "Database (Prisma)",
      status: "error",
      latencyMs: Date.now() - start,
      message: String(err),
    };
  }
}

async function checkAuth(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const { userId } = await auth();
    return {
      name: "Auth (Clerk)",
      status: userId ? "ok" : "degraded",
      latencyMs: Date.now() - start,
      message: userId ? `User: ${userId.slice(0, 8)}...` : "No user session",
    };
  } catch (err) {
    return {
      name: "Auth (Clerk)",
      status: "error",
      latencyMs: Date.now() - start,
      message: String(err),
    };
  }
}

async function checkOrgContext(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const ctx = await safeOrgContext();
    return {
      name: "Org Context",
      status: ctx.status === "ok" ? "ok" : "degraded",
      latencyMs: Date.now() - start,
      message:
        ctx.status === "ok" ? `Org: ${ctx.orgId?.slice(0, 8)}...` : (ctx.reason ?? "Unknown"),
    };
  } catch (err) {
    return {
      name: "Org Context",
      status: "error",
      latencyMs: Date.now() - start,
      message: String(err),
    };
  }
}

async function checkOpenAI(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Just check if the env var is set — don't make an actual API call
    const hasKey = !!process.env.OPENAI_API_KEY;
    return {
      name: "OpenAI API",
      status: hasKey ? "ok" : "error",
      latencyMs: Date.now() - start,
      message: hasKey ? "API key configured" : "OPENAI_API_KEY not set",
    };
  } catch (err) {
    return {
      name: "OpenAI API",
      status: "error",
      latencyMs: Date.now() - start,
      message: String(err),
    };
  }
}

async function checkEmailProvider(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const hasResend = !!process.env.RESEND_API_KEY;
    return {
      name: "Email (Resend)",
      status: hasResend ? "ok" : "degraded",
      latencyMs: Date.now() - start,
      message: hasResend ? "Resend configured" : "RESEND_API_KEY not set",
    };
  } catch (err) {
    return {
      name: "Email (Resend)",
      status: "error",
      latencyMs: Date.now() - start,
      message: String(err),
    };
  }
}

async function checkWeatherService(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    // Quick check to Iowa Mesonet (free weather data source)
    const res = await fetch(
      "https://mesonet.agron.iastate.edu/api/1/cow.json?wfo=LOT&begints=2024-01-01&endts=2024-01-02",
      { method: "HEAD", signal: AbortSignal.timeout(5000) }
    );
    return {
      name: "Weather Service (Mesonet)",
      status: res.ok ? "ok" : "degraded",
      latencyMs: Date.now() - start,
      message: res.ok ? "Mesonet reachable" : `Status: ${res.status}`,
    };
  } catch (err) {
    return {
      name: "Weather Service (Mesonet)",
      status: "degraded",
      latencyMs: Date.now() - start,
      message: "Could not reach Mesonet (may be temporary)",
    };
  }
}

async function checkStorage(): Promise<HealthCheck> {
  const start = Date.now();
  try {
    const hasSupabase = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    return {
      name: "Storage (Supabase)",
      status: hasSupabase ? "ok" : "degraded",
      latencyMs: Date.now() - start,
      message: hasSupabase ? "Supabase configured" : "Supabase URL not set",
    };
  } catch (err) {
    return {
      name: "Storage (Supabase)",
      status: "error",
      latencyMs: Date.now() - start,
      message: String(err),
    };
  }
}

export async function GET(req: NextRequest) {
  const startTotal = Date.now();

  try {
    // Run all checks in parallel
    const checks = await Promise.all([
      checkDatabase(),
      checkAuth(),
      checkOrgContext(),
      checkOpenAI(),
      checkEmailProvider(),
      checkWeatherService(),
      checkStorage(),
    ]);

    const totalLatency = Date.now() - startTotal;

    // Calculate overall status
    const hasError = checks.some((c) => c.status === "error");
    const hasDegraded = checks.some((c) => c.status === "degraded");
    const overallStatus = hasError ? "error" : hasDegraded ? "degraded" : "ok";

    const okCount = checks.filter((c) => c.status === "ok").length;
    const totalCount = checks.length;

    return NextResponse.json({
      status: overallStatus,
      summary: `${okCount}/${totalCount} services healthy`,
      totalLatencyMs: totalLatency,
      timestamp: new Date().toISOString(),
      checks,
      // Quick emoji summary for UI
      statusEmoji: overallStatus === "ok" ? "✅" : overallStatus === "degraded" ? "⚠️" : "❌",
    });
  } catch (error) {
    logger.error("[HEALTH_CHECK] Error:", error);
    return NextResponse.json(
      {
        status: "error",
        summary: "Health check failed",
        error: String(error),
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
