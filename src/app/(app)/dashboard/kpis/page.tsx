import { currentUser } from "@clerk/nextjs/server";
import { Metadata } from "next";
import { redirect } from "next/navigation";

import KPIDashboardClient from "@/components/kpi-dashboard/KPIDashboardClient";

export const metadata: Metadata = {
  title: "KPI Dashboard | SkaiScraper",
  description: "Executive intelligence dashboard with comprehensive performance analytics",
};

export default async function KPIsPage() {
  let user;
  try {
    user = await currentUser();
  } catch (error: unknown) {
    // Re-throw redirect errors (Next.js uses these for navigation)
    if (error instanceof Error && error.message === "NEXT_REDIRECT") throw error;
    redirect("/sign-in");
  }
  if (!user) redirect("/sign-in");
  return <KPIDashboardClient />;
}
