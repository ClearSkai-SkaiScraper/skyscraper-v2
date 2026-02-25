import { Metadata } from "next";

import KPIDashboardClient from "@/components/kpi-dashboard/KPIDashboardClient";

export const metadata: Metadata = {
  title: "KPI Dashboard | SkaiScraper",
  description: "Executive intelligence dashboard with comprehensive performance analytics",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * KPI Dashboard page — renders the client component directly.
 * Auth is handled by the (app) layout. The client component has its own
 * mockData fallback so it always renders even if the API fails.
 */
export default function KPIsPage() {
  return <KPIDashboardClient />;
}
