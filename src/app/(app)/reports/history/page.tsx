import { currentUser } from "@clerk/nextjs/server";
import { ArrowUpRight, FileText, Filter, History, Search } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";
import { safeClaimsSelect } from "@/lib/db/safeClaimsSelect";
import { safeLeadsSelect } from "@/lib/db/safeLeadsSelect";
import { getAllUserReports, UnifiedReport } from "@/lib/reports/getAllUserReports";

import { CopyIdButton } from "./_components/CopyIdButton";
import { ReportViewToggle } from "./_components/ReportViewToggle";

function mapTypeLabel(t: UnifiedReport["type"]): { label: string; icon: React.ReactNode } {
  const base = <FileText className="h-4 w-4" />;
  switch (t) {
    case "AI_CLAIM_SCOPE":
      return { label: "AI Claim Scope", icon: base };
    case "CLAIM_PDF":
      return { label: "Claim PDF", icon: base };
    case "RETAIL_PROPOSAL":
      return { label: "Retail Proposal", icon: base };
    case "WEATHER_REPORT":
      return { label: "Weather Verification", icon: base };
    case "VIDEO_REPORT":
      return { label: "Video Report", icon: base };
    case "DAMAGE_REPORT":
      return { label: "Damage Report", icon: base };
    case "REBUTTAL":
      return { label: "Rebuttal Letter", icon: base };
    case "SUPPLEMENT":
      return { label: "Supplement", icon: base };
    case "CONTRACTOR_PACKET":
      return { label: "Contractor Packet", icon: base };
    case "BID_PACKAGE":
      return { label: "Bid Package", icon: base };
    case "MATERIALS_ESTIMATE":
      return { label: "Materials Estimate", icon: base };
    case "PROJECT_PLAN":
      return { label: "Project Plan", icon: base };
    case "BAD_FAITH":
      return { label: "Bad Faith Analysis", icon: base };
    case "CLAIMS_PACKET":
      return { label: "Claims Assembly", icon: base };
    default:
      return { label: "Report", icon: base };
  }
}

export const dynamic = "force-dynamic";

export default async function ReportHistoryPage({
  searchParams,
}: {
  searchParams: {
    q?: string;
    type?: string;
    from?: string;
    to?: string;
    claim?: string;
    lead?: string;
  };
}) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const userId = user.id;

  // Get org context from safeOrgContext instead of publicMetadata
  let orgId: string | undefined;
  try {
    const { safeOrgContext } = await import("@/lib/safeOrgContext");
    const ctx = await safeOrgContext();
    orgId = ctx.orgId ?? undefined;
  } catch (err) {
    // Failed to get org context — continue with empty state
  }

  if (!orgId) {
    // Missing org context — will show empty state
    // Don't redirect - render empty state instead
  }

  const q = (searchParams.q || "").toLowerCase().trim();
  const typeFilter = (searchParams.type || "").trim();
  const from = searchParams.from ? new Date(searchParams.from) : undefined;
  const to = searchParams.to ? new Date(searchParams.to) : undefined;
  const claimFilter = searchParams.claim || "";
  const leadFilter = searchParams.lead || "";

  let claims: { id: string; claimNumber: string | null }[] = [];
  let leads: { id: string; title: string | null }[] = [];
  let unified: any[] = [];

  // Only fetch if we have orgId
  if (orgId) {
    try {
      claims = await safeClaimsSelect(orgId, 100).then((c) =>
        c.map((c) => ({ id: c.id, claimNumber: c.claimNumber }))
      );
      leads = await safeLeadsSelect(orgId, 100).then((l) =>
        l.map((l) => ({ id: l.id, title: l.title }))
      );

      // Unified fetch
      unified = await getAllUserReports({
        type: (typeFilter as any) || undefined,
        from,
        to,
        search: q || undefined,
        claimId: claimFilter || undefined,
        leadId: leadFilter || undefined,
      });
    } catch (error) {
      // Error loading reports — continue with empty arrays
      // Continue with empty arrays - will show "No reports" message
    }
  }

  // Already filtered via getAllUserReports; optional further refinement if typeFilter not passed as Unified type
  if (typeFilter && !unified.every((u) => u.type === typeFilter)) {
    unified = unified.filter((u) => u.type.toLowerCase().includes(typeFilter.toLowerCase()));
  }

  return (
    <PageContainer>
      <PageHero
        section="reports"
        title="Report History"
        description="All generated reports, PDFs, supplements, rebuttals, damage reports, and packets in one place."
        icon={<History className="h-8 w-8" />}
        actions={
          <Link href="/reports">
            <Button variant="outline" className="gap-2">
              <FileText className="h-4 w-4" />
              Create New Report
            </Button>
          </Link>
        }
      />
      <PageSectionCard title="Search & Filters">
        <form action="" className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
              <Search className="h-4 w-4 text-muted-foreground" />
              <input
                name="q"
                defaultValue={searchParams.q || ""}
                placeholder="Search title, claim #"
                className="flex-1 bg-transparent text-sm focus:outline-none"
              />
            </div>
            <div className="flex items-center gap-2 rounded-xl border border-border bg-background px-4 py-3">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <select
                name="type"
                aria-label="Filter by report type"
                defaultValue={typeFilter}
                className="flex-1 bg-transparent text-sm focus:outline-none"
              >
                <option value="">All Types</option>
                <optgroup label="AI-Generated">
                  <option value="AI_CLAIM_SCOPE">AI Claim Scope</option>
                  <option value="REBUTTAL">Rebuttal Letter</option>
                  <option value="SUPPLEMENT">Supplement</option>
                  <option value="BAD_FAITH">Bad Faith Analysis</option>
                  <option value="PROJECT_PLAN">Project Plan</option>
                </optgroup>
                <optgroup label="PDF Reports">
                  <option value="CLAIM_PDF">Claim PDF</option>
                  <option value="DAMAGE_REPORT">Damage Report</option>
                  <option value="WEATHER_REPORT">Weather Verification</option>
                  <option value="RETAIL_PROPOSAL">Retail Proposal</option>
                </optgroup>
                <optgroup label="Packages &amp; Estimates">
                  <option value="CONTRACTOR_PACKET">Contractor Packet</option>
                  <option value="BID_PACKAGE">Bid Package</option>
                  <option value="MATERIALS_ESTIMATE">Materials Estimate</option>
                  <option value="CLAIMS_PACKET">Claims Assembly</option>
                </optgroup>
                <optgroup label="Other">
                  <option value="VIDEO_REPORT">Video Report</option>
                  <option value="OTHER">Other</option>
                </optgroup>
              </select>
            </div>
            <select
              id="claim-filter"
              name="claim"
              defaultValue={claimFilter}
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none"
              aria-label="Filter by claim"
            >
              <option value="">All Claims</option>
              {claims.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.claimNumber || c.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <select
              id="lead-filter"
              name="lead"
              defaultValue={leadFilter}
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none"
              aria-label="Filter by lead"
            >
              <option value="">All Leads</option>
              {leads.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.title || l.id.slice(0, 8)}
                </option>
              ))}
            </select>
            <input
              id="from-date"
              aria-label="Filter from date"
              type="date"
              name="from"
              defaultValue={searchParams.from || ""}
              placeholder="From date"
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none"
            />
            <input
              id="to-date"
              aria-label="Filter to date"
              type="date"
              name="to"
              defaultValue={searchParams.to || ""}
              placeholder="To date"
              className="rounded-xl border border-border bg-background px-4 py-3 text-sm focus:outline-none"
            />
          </div>
          <Button className="w-full md:w-auto">Apply Filters</Button>
        </form>
      </PageSectionCard>{" "}
      {/* Report List — with Table/Folder view toggle */}
      <ReportViewToggle reports={unified}>
        <PageSectionCard title={`Reports (${unified.length})`}>
          {unified.length === 0 ? (
            <div className="py-16 text-center">
              <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="mb-2 text-xl font-semibold text-foreground">No reports found</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                {q || typeFilter || claimFilter || leadFilter
                  ? "Try adjusting your filters to see more results."
                  : "Create your first report to get started."}
              </p>
              <Link href="/reports">
                <Button className="gap-2">
                  <FileText className="h-4 w-4" />
                  Create Report
                </Button>
              </Link>
            </div>
          ) : (
            <div className="overflow-hidden rounded-xl border border-border">
              <div className="sticky top-0 grid grid-cols-7 gap-4 bg-secondary px-4 py-3 text-xs font-semibold text-secondary-foreground">
                <span className="col-span-2">Report</span>
                <span>Claim / Lead</span>
                <span>Created</span>
                <span>Status</span>
                <span>Source</span>
                <span className="text-right">Actions</span>
              </div>
              {unified.map((r) => {
                const { label, icon } = mapTypeLabel(r.type);
                const status =
                  r.metadata?.status || (r.type === "AI_CLAIM_SCOPE" ? "Draft" : "Final");
                const sourceLabel = r.source;
                return (
                  <div
                    key={r.id}
                    className="grid grid-cols-7 gap-4 border-t border-[color:var(--border)] bg-[var(--surface-1)] px-4 py-3 text-xs hover:bg-[var(--surface-2)]"
                  >
                    <div className="col-span-2 flex items-center gap-2">
                      <div className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-500/10 text-indigo-600">
                        {icon}
                      </div>
                      <div className="flex flex-col">
                        <span className="font-medium">{r.title || label}</span>
                        <span className="text-[10px] text-slate-700 dark:text-slate-300">
                          {label}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col justify-center">
                      {r.claimNumber ? (
                        <span>#{r.claimNumber}</span>
                      ) : r.claimId ? (
                        <span>{r.claimId.slice(0, 8)}</span>
                      ) : r.leadId ? (
                        <span>{r.leadId.slice(0, 8)}</span>
                      ) : (
                        <span className="text-slate-700 dark:text-slate-300">—</span>
                      )}
                      {r.address && (
                        <span className="max-w-[140px] truncate text-[10px] text-slate-700 dark:text-slate-300">
                          {r.address}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-col justify-center">
                      <span>{new Date(r.createdAt).toLocaleDateString()}</span>
                      <span className="text-[10px] text-slate-700 dark:text-slate-300">
                        {new Date(r.createdAt).toLocaleTimeString()}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span
                        className={`rounded-full border px-2 py-1 text-[10px] ${status === "Final" ? "border-emerald-500/20 bg-emerald-500/10 text-emerald-600" : "border-yellow-500/20 bg-yellow-500/10 text-yellow-700"}`}
                      >
                        {status}
                      </span>
                    </div>
                    <div className="flex items-center">
                      <span className="text-[10px] uppercase tracking-wide text-slate-700 dark:text-slate-300">
                        {sourceLabel}
                      </span>
                    </div>
                    <div className="flex items-center justify-end gap-2">
                      {r.url && (
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1 rounded-md bg-indigo-600 px-2 py-1 text-white"
                        >
                          <FileText className="h-3 w-3" /> View
                        </a>
                      )}
                      {r.type === "AI_CLAIM_SCOPE" && r.claimId && (
                        <Link
                          href={`/reports/ai-claims-builder?claimId=${r.claimId}`}
                          className="flex items-center gap-1 rounded-md border border-[color:var(--border)] px-2 py-1 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:text-slate-300"
                          title="Re-open"
                        >
                          <ArrowUpRight className="h-3 w-3" /> Open
                        </Link>
                      )}
                      {r.type === "RETAIL_PROPOSAL" && r.claimId && (
                        <Link
                          href={`/reports/retail?claimId=${r.claimId}`}
                          className="flex items-center gap-1 rounded-md border border-[color:var(--border)] px-2 py-1 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:text-slate-300"
                          title="Resume"
                        >
                          <ArrowUpRight className="h-3 w-3" /> Resume
                        </Link>
                      )}
                      {r.type === "WEATHER_REPORT" && r.claimId && (
                        <Link
                          href={`/claims/${r.claimId}/weather`}
                          className="flex items-center gap-1 rounded-md border border-[color:var(--border)] px-2 py-1 text-slate-700 hover:border-indigo-500 hover:text-indigo-600 dark:text-slate-300"
                          title="View Weather"
                        >
                          <ArrowUpRight className="h-3 w-3" /> Weather
                        </Link>
                      )}
                      <CopyIdButton id={r.id} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </PageSectionCard>
      </ReportViewToggle>
    </PageContainer>
  );
}
