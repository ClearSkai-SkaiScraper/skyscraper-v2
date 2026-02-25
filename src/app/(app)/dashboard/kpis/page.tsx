import { currentUser } from "@clerk/nextjs/server";
import { Metadata } from "next";
import { isRedirectError } from "next/dist/client/components/redirect";
import { redirect } from "next/navigation";

import KPIDashboardClient from "@/components/kpi-dashboard/KPIDashboardClient";
import { logger } from "@/lib/logger";

export const metadata: Metadata = {
  title: "KPI Dashboard | SkaiScraper",
  description: "Executive intelligence dashboard with comprehensive performance analytics",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function KPIsPage() {
  let user;
  try {
    user = await currentUser();
  } catch (error: unknown) {
    // Re-throw redirect errors (Next.js uses these for navigation)
    if (isRedirectError(error)) throw error;
    logger.error("[KPIs] Auth error:", error);
    redirect("/sign-in?redirect_url=/dashboard/kpis");
  }
  if (!user) redirect("/sign-in?redirect_url=/dashboard/kpis");
  return <KPIDashboardClient />;
}
