/**
 * Canonical 4-Stage Workflow Status System
 *
 * Both insurance claims (claims.status) and retail jobs (leads.stage)
 * share the same 4-stage lifecycle:
 *
 *   NEW_INTAKE → IN_PROGRESS → FINALIZING → FINISHED
 *
 * The raw DB values stay as-is (backward compatible), but all UI
 * surfaces display these canonical buckets.
 */

export type WorkflowStatus = "NEW_INTAKE" | "IN_PROGRESS" | "FINALIZING" | "FINISHED";

export interface WorkflowStatusInfo {
  value: WorkflowStatus;
  label: string;
  emoji: string;
  description: string;
  badgeColor: string;
  dotColor: string;
}

export const WORKFLOW_STATUSES: WorkflowStatusInfo[] = [
  {
    value: "NEW_INTAKE",
    label: "New Intake",
    emoji: "📥",
    description: "Newly created, first contact, inspection not yet complete",
    badgeColor: "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300",
    dotColor: "bg-blue-500",
  },
  {
    value: "IN_PROGRESS",
    label: "In Progress",
    emoji: "🔨",
    description: "Inspection done, estimate/report being worked, active production",
    badgeColor: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300",
    dotColor: "bg-amber-500",
  },
  {
    value: "FINALIZING",
    label: "Finalizing",
    emoji: "📋",
    description: "Work complete, waiting on final invoice/payment/docs/signatures",
    badgeColor: "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300",
    dotColor: "bg-purple-500",
  },
  {
    value: "FINISHED",
    label: "Finished",
    emoji: "✅",
    description: "Fully done, ready for archive review",
    badgeColor: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300",
    dotColor: "bg-emerald-500",
  },
];

/* ------------------------------------------------------------------ */
/*  Mapping: raw DB value → canonical bucket                           */
/* ------------------------------------------------------------------ */

const INTAKE_KEYWORDS = new Set(["new", "intake", "new_intake", "filed", "lead", "qualified"]);

const PROGRESS_KEYWORDS = new Set([
  "in_progress",
  "in-progress",
  "inprogress",
  "active",
  "inspection",
  "inspected",
  "inspection_scheduled",
  "adjuster_review",
  "estimate_sent",
  "insurance_claim",
  "build",
  "production",
  "scheduled",
  "proposal",
  "negotiation",
]);

const FINALIZING_KEYWORDS = new Set([
  "finalizing",
  "final_qa",
  "invoiced",
  "approved",
  "review",
  "pending_payment",
  "closing",
  "warranty",
]);

const FINISHED_KEYWORDS = new Set([
  "finished",
  "completed",
  "done",
  "closed",
  "won",
  "paid",
  "denied",
  "lost",
  "depreciation",
]);

/**
 * Maps ANY existing raw status/stage string → one of the 4 canonical
 * WorkflowStatus buckets.  Handles both claim statuses and lead stages.
 */
export function mapToWorkflowStatus(rawStatus: string | null | undefined): WorkflowStatus {
  const s = (rawStatus || "").toLowerCase().trim().replace(/\s+/g, "_");

  if (INTAKE_KEYWORDS.has(s)) return "NEW_INTAKE";
  if (PROGRESS_KEYWORDS.has(s)) return "IN_PROGRESS";
  if (FINALIZING_KEYWORDS.has(s)) return "FINALIZING";
  if (FINISHED_KEYWORDS.has(s)) return "FINISHED";

  // Default — unknown values land in intake
  return "NEW_INTAKE";
}

/**
 * Look up the full info object for a canonical status.
 */
export function getWorkflowStatusInfo(status: WorkflowStatus): WorkflowStatusInfo {
  return WORKFLOW_STATUSES.find((s) => s.value === status) ?? WORKFLOW_STATUSES[0];
}

/**
 * Convenience: get badge color for a raw DB status.
 */
export function getWorkflowBadgeColor(rawStatus: string | null): string {
  return getWorkflowStatusInfo(mapToWorkflowStatus(rawStatus)).badgeColor;
}

/* ------------------------------------------------------------------ */
/*  Analytics helper: group raw statuses → canonical buckets           */
/* ------------------------------------------------------------------ */

/**
 * Takes a record of { rawStatus: count } and returns
 * { WorkflowStatus: count } with totals collapsed.
 */
export function groupByWorkflowStatus(
  rawCounts: Record<string, number>
): Record<WorkflowStatus, number> {
  const result: Record<WorkflowStatus, number> = {
    NEW_INTAKE: 0,
    IN_PROGRESS: 0,
    FINALIZING: 0,
    FINISHED: 0,
  };

  for (const [rawStatus, count] of Object.entries(rawCounts)) {
    const bucket = mapToWorkflowStatus(rawStatus);
    result[bucket] += count;
  }

  return result;
}
