import { AlertTriangle, CheckCircle2, Clock, DollarSign, FileText, XCircle } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { cn } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Supplement Tracker | SkaiScraper",
  description: "Track every supplement from submission to payment. Never lose revenue again.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SupplementStatus =
  | "DRAFT"
  | "PENDING"
  | "SUBMITTED"
  | "IN_REVIEW"
  | "APPROVED"
  | "DENIED"
  | "PAID";

interface SupplementRow {
  id: string;
  claimNumber: string;
  homeownerName: string;
  status: SupplementStatus;
  amount: number;
  submittedAt: Date | null;
  updatedAt: Date;
  carrier: string | null;
}

const statusConfig: Record<
  SupplementStatus,
  { label: string; color: string; icon: React.ComponentType<{ className?: string }> }
> = {
  DRAFT: {
    label: "Draft",
    color: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
    icon: FileText,
  },
  PENDING: {
    label: "Pending",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    icon: Clock,
  },
  SUBMITTED: {
    label: "Submitted",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
    icon: FileText,
  },
  IN_REVIEW: {
    label: "In Review",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
    icon: AlertTriangle,
  },
  APPROVED: {
    label: "Approved",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    icon: CheckCircle2,
  },
  DENIED: {
    label: "Denied",
    color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
    icon: XCircle,
  },
  PAID: {
    label: "Paid",
    color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",
    icon: DollarSign,
  },
};

function StatusBadge({ status }: { status: SupplementStatus }) {
  const config = statusConfig[status] || statusConfig.DRAFT;
  const Icon = config.icon;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        config.color
      )}
    >
      <Icon className="h-3 w-3" />
      {config.label}
    </span>
  );
}

export default async function SupplementsPage() {
  const orgCtx = await safeOrgContext();

  if (orgCtx.status === "unauthenticated") {
    redirect("/sign-in");
  }

  // Fetch supplements for this org
  let supplements: SupplementRow[] = [];
  let summary = {
    total: 0,
    pending: 0,
    approved: 0,
    denied: 0,
    totalValue: 0,
    approvedValue: 0,
  };

  if (orgCtx.orgId) {
    try {
      const rows = await prisma.supplements.findMany({
        where: { org_id: orgCtx.orgId },
        orderBy: { updated_at: "desc" },
        take: 50,
        include: {
          claims: {
            select: {
              claimNumber: true,
              insured_name: true,
              carrier: true,
            },
          },
        },
      });

      supplements = rows.map((r) => ({
        id: r.id,
        claimNumber: r.claims?.claimNumber || "—",
        homeownerName: r.claims?.insured_name || "Unknown",
        status: (r.status as SupplementStatus) || "DRAFT",
        amount: Number(r.total ?? 0),
        submittedAt: r.submitted_at,
        updatedAt: r.updated_at,
        carrier: r.claims?.carrier || null,
      }));

      summary.total = supplements.length;
      summary.pending = supplements.filter((s) =>
        ["PENDING", "SUBMITTED", "IN_REVIEW"].includes(s.status)
      ).length;
      summary.approved = supplements.filter((s) => ["APPROVED", "PAID"].includes(s.status)).length;
      summary.denied = supplements.filter((s) => s.status === "DENIED").length;
      summary.totalValue = supplements.reduce((sum, s) => sum + s.amount, 0);
      summary.approvedValue = supplements
        .filter((s) => ["APPROVED", "PAID"].includes(s.status))
        .reduce((sum, s) => sum + s.amount, 0);
    } catch (err) {
      logger.error("[supplements-page]", err);
      // Graceful degradation — show empty state
    }
  }

  return (
    <PageContainer>
      <PageHero
        icon={<FileText className="h-7 w-7" />}
        title="Supplement Tracker"
        subtitle="Track every supplement from submission to carrier payment. Never lose revenue."
      />

      {/* Summary Cards */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard label="Total Supplements" value={summary.total} color="blue" />
        <SummaryCard label="Pending / In Review" value={summary.pending} color="amber" />
        <SummaryCard label="Approved" value={summary.approved} color="emerald" />
        <SummaryCard
          label="Approved Value"
          value={`$${summary.approvedValue.toLocaleString()}`}
          color="green"
        />
      </div>

      {/* Supplements Table */}
      <div className="mt-8 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {supplements.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50">
                  <th className="px-6 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                    Claim #
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                    Homeowner
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                    Carrier
                  </th>
                  <th className="px-4 py-3 text-left font-semibold text-slate-700 dark:text-slate-300">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                    Updated
                  </th>
                </tr>
              </thead>
              <tbody>
                {supplements.map((s, idx) => (
                  <tr
                    key={s.id}
                    className={cn(
                      "border-b border-slate-100 transition-colors hover:bg-blue-50/50 dark:border-slate-800 dark:hover:bg-blue-900/10",
                      idx % 2 === 0
                        ? "bg-white dark:bg-slate-900"
                        : "bg-slate-50/30 dark:bg-slate-800/20"
                    )}
                  >
                    <td className="px-6 py-3">
                      <Link
                        href={`/claims`}
                        className="font-medium text-blue-600 hover:underline dark:text-blue-400"
                      >
                        {s.claimNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-300">
                      {s.homeownerName}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">
                      {s.carrier || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={s.status} />
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white">
                      ${s.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500 dark:text-slate-400">
                      {s.updatedAt.toLocaleDateString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <FileText className="mb-3 h-12 w-12 text-slate-200 dark:text-slate-700" />
            <p className="text-lg font-semibold text-slate-600 dark:text-slate-400">
              No supplements yet
            </p>
            <p className="mt-1 max-w-sm text-sm text-slate-500 dark:text-slate-500">
              Supplements are generated from your claims. Create a claim and use the AI Supplement
              Builder to generate your first supplement.
            </p>
            <Link
              href="/ai/tools/supplement"
              className="mt-4 rounded-lg bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-blue-700"
            >
              Open Supplement Builder
            </Link>
          </div>
        )}
      </div>
    </PageContainer>
  );
}

function SummaryCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string | number;
  color: "blue" | "amber" | "emerald" | "green";
}) {
  const bg = {
    blue: "from-blue-500 to-blue-600",
    amber: "from-amber-500 to-amber-600",
    emerald: "from-emerald-500 to-emerald-600",
    green: "from-green-500 to-green-600",
  };

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-extrabold text-slate-900 dark:text-white">{value}</p>
      <div className={`mt-3 h-1 w-12 rounded-full bg-gradient-to-r ${bg[color]}`} />
    </div>
  );
}
