import { redirect } from "next/navigation";

import { getOrgContext } from "@/lib/org/getOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Pending Approvals | SkaiScrape",
  description: "Review and approve pending job values from your team.",
};

/**
 * /claims/approvals — Bulk approval page for managers
 * Shows all claims with jobValueStatus === "pending"
 */
export default async function ApprovalsPage() {
  const ctx = await getOrgContext();
  if (!ctx.orgId) redirect("/sign-in");

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Pending Approvals</h1>
        <p className="mt-1 text-muted-foreground">
          Review and approve job values submitted by your team.
        </p>
      </div>

      <ApprovalsClient orgId={ctx.orgId} />
    </div>
  );
}

// ── Client Component ──────────────────────────────────────────────
import { ApprovalsClient } from "./ApprovalsClient";
