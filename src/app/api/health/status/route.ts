import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/health/status — System status + active incidents
 *
 * Returns current system health and any active incidents.
 * Used by the StatusBanner component for real-time status display.
 *
 * No auth required — this is a public endpoint.
 */
export async function GET(req: NextRequest) {
  try {
    // Active incidents — edit this array to broadcast incidents
    // In production, this would read from a database or status page API
    const incidents: Array<{
      id: string;
      severity: "critical" | "warning" | "info" | "resolved";
      title: string;
      message: string;
      link?: string;
      dismissible?: boolean;
    }> = [
      // Example:
      // {
      //   id: "inc-20260226-001",
      //   severity: "info",
      //   title: "Scheduled Maintenance",
      //   message: "We'll be performing database maintenance on March 1, 2026 from 2-4am UTC.",
      //   dismissible: true,
      // },
    ];

    return NextResponse.json({
      ok: true,
      status: incidents.some((i) => i.severity === "critical") ? "degraded" : "operational",
      incidents,
      lastChecked: new Date().toISOString(),
    });
  } catch {
    return NextResponse.json({
      ok: true,
      status: "operational",
      incidents: [],
      lastChecked: new Date().toISOString(),
    });
  }
}
