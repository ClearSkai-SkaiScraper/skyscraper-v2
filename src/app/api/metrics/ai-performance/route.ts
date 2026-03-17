/**
 * PHASE 34: AI Performance Metrics API
 * 
 * Returns cost analytics, cache hit rates, and performance breakdowns
 * by org, route, model, and date range.
 */

export const dynamic = 'force-dynamic';
export const revalidate = 0;
import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's org
    const user = await prisma.users.findUnique({
      where: { clerkUserId: userId },
      select: { orgId: true },
    });

    if (!user?.orgId) {
      return NextResponse.json({ error: "No organization found" }, { status: 404 });
    }

    const orgId = user.orgId;
    const { searchParams } = new URL(req.url);

    // Parse filters
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const route = searchParams.get("route");
    const model = searchParams.get("model");

    // Build where clause
    const where: any = { org_id: orgId };

    if (startDate) {
      where.created_at = { gte: new Date(startDate) };
    }
    if (endDate) {
      where.created_at = { ...where.created_at, lte: new Date(endDate) };
    }
    if (route) {
      where.route = route;
    }
    if (model) {
      where.model = model;
    }

    // Get logs
    const logs = await prisma.ai_performance_logs.findMany({
      where,
      orderBy: { created_at: "desc" },
      take: 1000, // Limit for performance
    });

    // Calculate aggregates
    const totalCalls = logs.length;
    const totalCost = logs.reduce((sum, log) => sum + (Number(log.cost_usd) || 0), 0);
    const avgDuration = logs.length > 0 ? logs.reduce((sum, log) => sum + log.duration_ms, 0) / logs.length : 0;
    const cacheHits = logs.filter((log) => log.cache_hit).length;
    const cacheHitRate = totalCalls > 0 ? (cacheHits / totalCalls) * 100 : 0;

    // Group by route
    const byRoute = logs.reduce((acc, log) => {
      if (!acc[log.route]) {
        acc[log.route] = {
          route: log.route,
          calls: 0,
          cost: 0,
          duration: 0,
          cacheHits: 0,
        };
      }
      acc[log.route].calls++;
      acc[log.route].cost += Number(log.cost_usd) || 0;
      acc[log.route].duration += log.duration_ms;
      if (log.cache_hit) acc[log.route].cacheHits++;
      return acc;
    }, {} as Record<string, any>);

    const routeStats = Object.values(byRoute).map((stat: any) => ({
      ...stat,
      avgDuration: stat.calls > 0 ? stat.duration / stat.calls : 0,
      cacheHitRate: stat.calls > 0 ? (stat.cacheHits / stat.calls) * 100 : 0,
    }));

    // Group by model
    const byModel = logs.reduce((acc, log) => {
      if (!acc[log.model]) {
        acc[log.model] = {
          model: log.model,
          calls: 0,
          cost: 0,
          tokensIn: 0,
          tokensOut: 0,
        };
      }
      acc[log.model].calls++;
      acc[log.model].cost += Number(log.cost_usd) || 0;
      acc[log.model].tokensIn += log.tokens_in;
      acc[log.model].tokensOut += log.tokens_out;
      return acc;
    }, {} as Record<string, any>);

    const modelStats = Object.values(byModel);

    // Time series (by day)
    const byDay = logs.reduce((acc, log) => {
      const day = log.created_at.toISOString().split("T")[0];
      if (!acc[day]) {
        acc[day] = {
          date: day,
          calls: 0,
          cost: 0,
          cacheHits: 0,
        };
      }
      acc[day].calls++;
      acc[day].cost += Number(log.cost_usd) || 0;
      if (log.cache_hit) acc[day].cacheHits++;
      return acc;
    }, {} as Record<string, any>);

    const timeSeries = Object.values(byDay).sort((a: any, b: any) =>
      a.date.localeCompare(b.date)
    );

    // Top 5 most expensive calls
    const topExpensive = logs
      .sort((a, b) => (Number(b.cost_usd) || 0) - (Number(a.cost_usd) || 0))
      .slice(0, 5)
      .map((log) => ({
        id: log.id,
        route: log.route,
        model: log.model,
        cost: Number(log.cost_usd),
        duration: log.duration_ms,
        createdAt: log.created_at,
        cacheHit: log.cache_hit,
      }));

    // Top 5 slowest calls
    const topSlowest = logs
      .sort((a, b) => b.duration_ms - a.duration_ms)
      .slice(0, 5)
      .map((log) => ({
        id: log.id,
        route: log.route,
        model: log.model,
        cost: Number(log.cost_usd),
        duration: log.duration_ms,
        createdAt: log.created_at,
        cacheHit: log.cache_hit,
      }));

    return NextResponse.json({
      success: true,
      summary: {
        totalCalls,
        totalCost: totalCost.toFixed(6),
        avgDuration: Math.round(avgDuration),
        cacheHitRate: cacheHitRate.toFixed(2),
        cacheHits,
        cacheMisses: totalCalls - cacheHits,
      },
      byRoute: routeStats.sort((a: any, b: any) => b.cost - a.cost),
      byModel: modelStats.sort((a: any, b: any) => b.cost - a.cost),
      timeSeries,
      topExpensive,
      topSlowest,
      filters: {
        startDate: startDate || null,
        endDate: endDate || null,
        route: route || null,
        model: model || null,
      },
    });
  } catch (error) {
    logger.error("[AI Metrics] Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch metrics" },
      { status: 500 }
    );
  }
}
