// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import prisma from "@/lib/prisma";

// Simple in-memory rate limiter (production should use Redis)
const rateLimits = new Map<string, { count: number; resetAt: number }>();

const RATE_LIMIT = 60; // requests per minute
const WINDOW_MS = 60 * 1000; // 1 minute

export async function middleware(req: NextRequest) {
  // Skip rate limiting for static files
  if (req.nextUrl.pathname.startsWith("/_next") || req.nextUrl.pathname.startsWith("/static")) {
    return NextResponse.next();
  }

  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.next(); // Let auth handle it
  }

  const key = userId;
  const now = Date.now();
  const userLimit = rateLimits.get(key);

  if (userLimit && userLimit.resetAt > now) {
    userLimit.count++;
    if (userLimit.count > RATE_LIMIT) {
      return new NextResponse(
        JSON.stringify({ error: "Rate limit exceeded. Please try again later." }),
        {
          status: 429,
          headers: {
            "Content-Type": "application/json",
            "Retry-After": String(Math.ceil((userLimit.resetAt - now) / 1000)),
          },
        }
      );
    }
  } else {
    rateLimits.set(key, { count: 1, resetAt: now + WINDOW_MS });
  }

  // Quota check for AI endpoints
  if (req.nextUrl.pathname.startsWith("/api/ai/")) {
    try {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const meter = await prisma.$queryRaw<any[]>`
        SELECT count, quota_limit FROM usage_meters
        WHERE org_id = ${userId}
        AND resource_type = 'ai_requests'
        AND period_start = ${startOfMonth}
        LIMIT 1
      `.then((r) => r[0]);

      if (meter && meter.quota_limit && meter.count >= meter.quota_limit) {
        return new NextResponse(
          JSON.stringify({
            error: "AI quota exceeded. Please upgrade your plan.",
            code: "QUOTA_EXCEEDED",
          }),
          {
            status: 402, // Payment Required
            headers: { "Content-Type": "application/json" },
          }
        );
      }

      // Increment usage
      await prisma.$executeRaw`
        INSERT INTO usage_meters (org_id, userId, resource_type, count, period_start, period_end, quota_limit)
        VALUES (${userId}, ${userId}, 'ai_requests', 1, ${startOfMonth}, ${new Date(startOfMonth.getFullYear(), startOfMonth.getMonth() + 1, 0)}, 1000)
        ON CONFLICT (org_id, resource_type, period_start)
        DO UPDATE SET count = usage_meters.count + 1
      `;
    } catch (error) {
      console.error("Quota check failed:", error);
      // Continue request on error to avoid blocking
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: "/api/:path*",
};
