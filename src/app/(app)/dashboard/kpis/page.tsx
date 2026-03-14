import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * KPI Dashboard — now merged into Analytics Dashboard.
 * This page redirects to the unified analytics view.
 */
export default function KPIsPage() {
  redirect("/analytics/dashboard");
}
