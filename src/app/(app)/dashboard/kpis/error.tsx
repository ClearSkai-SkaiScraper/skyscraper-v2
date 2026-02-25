"use client";

import KPIDashboardClient from "@/components/kpi-dashboard/KPIDashboardClient";

/**
 * Error recovery boundary for /dashboard/kpis.
 * Instead of showing a scary "Unavailable" message, just render the client
 * component which has its own mockData fallback and handles API errors gracefully.
 */
export default function KPIDashboardError() {
  return <KPIDashboardClient />;
}
