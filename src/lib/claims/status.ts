/**
 * PHASE C: CLAIMS FLOW OPTIMIZATION
 * Elite Status Engine & Type Definitions
 *
 * Professional claim lifecycle management with intelligent workflow automation
 */

/**
 * Canonical claim lifecycle stages — aligned with the PATCH API's Zod enum
 * in src/app/api/claims/[claimId]/route.ts.
 *
 * The lifecycle page stepper, edit-page dropdown, and badge helpers all
 * reference this single array.
 */
export const CLAIM_STATUSES = [
  "FILED",
  "INSPECTION_SCHEDULED",
  "INSPECTION_COMPLETE",
  "ADJUSTER_REVIEW",
  "APPROVED",
  "DENIED",
  "APPEAL",
  "IN_PROGRESS",
  "BUILD",
  "WORK_COMPLETE",
  "CLOSEOUT_PENDING",
  "COMPLETED",
  "DEPRECIATION",
  "CLOSED",
  // Legacy aliases kept for backwards-compat badge rendering
  "INTAKE",
  "INSPECTION_COMPLETED",
  "FILED_WITH_CARRIER",
  "ADJUSTER_SCHEDULED",
  "SUPPLEMENT_SUBMITTED",
  "PAID_CLOSED",
] as const;

export type ClaimStatus = (typeof CLAIM_STATUSES)[number];

export type LossType = "HAIL" | "WIND" | "WATER" | "FIRE" | "UNKNOWN";

export type RoofType = "SHINGLE" | "TILE" | "METAL" | "TPO" | "FOAM" | "MODBIT" | "OTHER";

export type StructureType =
  | "SINGLE_FAMILY"
  | "DUPLEX"
  | "MULTI_FAMILY"
  | "COMMERCIAL"
  | "MOBILE_HOME"
  | "OTHER";

/**
 * Get next workflow action based on current claim status
 * Powers "Next Action" UI throughout the platform
 */
export function getNextActionFromStatus(status: ClaimStatus | string): string {
  const normalized = status.toUpperCase();

  switch (normalized) {
    case "INTAKE":
    case "FILED":
      return "Schedule inspection";
    case "INSPECTION_SCHEDULED":
      return "Complete inspection & upload photos";
    case "INSPECTION_COMPLETED":
    case "INSPECTION_COMPLETE":
      return "Prepare estimate & file with carrier";
    case "FILED_WITH_CARRIER":
    case "ADJUSTER_REVIEW":
      return "Track adjuster appointment";
    case "ADJUSTER_SCHEDULED":
      return "Attend adjustment & document damage";
    case "APPROVED":
      return "Schedule build date";
    case "DENIED":
      return "Review for supplement or appraisal";
    case "APPEAL":
      return "Submit appeal & supporting documentation";
    case "SUPPLEMENT_SUBMITTED":
      return "Await carrier response on supplement";
    case "IN_PROGRESS":
    case "BUILD":
      return "Monitor build progress";
    case "WORK_COMPLETE":
      return "Schedule final walkthrough";
    case "CLOSEOUT_PENDING":
      return "Complete closeout checklist & collect depreciation";
    case "DEPRECIATION":
      return "Collect recoverable depreciation from carrier";
    case "COMPLETED":
    case "PAID_CLOSED":
    case "CLOSED":
      return "Send thank-you and request review/referral";
    default:
      return "Review claim details";
  }
}

/**
 * Get Tailwind CSS classes for status badge styling
 * Consistent visual language across the platform
 * Handles both lifecycle_stage (UPPER_CASE) and status (lowercase) fields
 */
export function getStatusBadgeColor(status: ClaimStatus | string): string {
  const normalized = status.toUpperCase().replace(/ /g, "_");

  switch (normalized) {
    case "NEW":
    case "INTAKE":
    case "FILED":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "INSPECTION_SCHEDULED":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-400";
    case "INSPECTION_COMPLETED":
    case "INSPECTION_COMPLETE":
      return "border-indigo-200 bg-indigo-50 text-indigo-700 dark:border-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-400";
    case "FILED_WITH_CARRIER":
    case "ADJUSTER_REVIEW":
    case "IN_PROGRESS":
      return "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-800 dark:bg-amber-900/30 dark:text-amber-400";
    case "ADJUSTER_SCHEDULED":
    case "PENDING":
      return "border-purple-200 bg-purple-50 text-purple-700 dark:border-purple-800 dark:bg-purple-900/30 dark:text-purple-400";
    case "APPROVED":
      return "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400";
    case "DENIED":
      return "border-red-200 bg-red-50 text-red-700 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400";
    case "APPEAL":
      return "border-orange-200 bg-orange-50 text-orange-700 dark:border-orange-800 dark:bg-orange-900/30 dark:text-orange-400";
    case "SUPPLEMENT_SUBMITTED":
      return "border-cyan-200 bg-cyan-50 text-cyan-700 dark:border-cyan-800 dark:bg-cyan-900/30 dark:text-cyan-400";
    case "BUILD":
      return "border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-800 dark:bg-violet-900/30 dark:text-violet-400";
    case "WORK_COMPLETE":
      return "border-teal-200 bg-teal-50 text-teal-700 dark:border-teal-800 dark:bg-teal-900/30 dark:text-teal-400";
    case "CLOSEOUT_PENDING":
      return "border-yellow-200 bg-yellow-50 text-yellow-700 dark:border-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
    case "DEPRECIATION":
      return "border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-800 dark:bg-sky-900/30 dark:text-sky-400";
    case "COMPLETED":
    case "PAID_CLOSED":
    case "CLOSED":
    case "COMPLETE":
      return "border-green-200 bg-green-50 text-green-700 dark:border-green-800 dark:bg-green-900/30 dark:text-green-400";
    case "OPEN":
      return "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-800 dark:bg-blue-900/30 dark:text-blue-400";
    case "ON_HOLD":
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
    case "ARCHIVED":
      return "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-500";
    default:
      return "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400";
  }
}

/**
 * Get color classes for loss type badges
 * Visual differentiation for damage types
 */
export function getLossTypeColor(lossType: LossType | string): string {
  const normalized = lossType.toUpperCase() as LossType;

  switch (normalized) {
    case "HAIL":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "WIND":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "WATER":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "FIRE":
      return "bg-red-100 text-red-800 border-red-200";
    case "UNKNOWN":
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
  }
}

/**
 * Get emoji icon for loss type
 * Quick visual recognition in UI
 */
export function getLossTypeIcon(lossType: LossType | string): string {
  const normalized = lossType.toUpperCase() as LossType;

  switch (normalized) {
    case "HAIL":
      return "🧊";
    case "WIND":
      return "💨";
    case "WATER":
      return "💧";
    case "FIRE":
      return "🔥";
    case "UNKNOWN":
    default:
      return "❓";
  }
}

/**
 * Get emoji icon for roof type
 * Visual aid for property details
 */
export function getRoofTypeIcon(roofType: RoofType | string): string {
  const normalized = roofType.toUpperCase() as RoofType;

  switch (normalized) {
    case "SHINGLE":
      return "🏠";
    case "TILE":
      return "🧱";
    case "METAL":
      return "⚙️";
    case "TPO":
    case "FOAM":
    case "MODBIT":
      return "🏢";
    case "OTHER":
    default:
      return "🏘️";
  }
}

/**
 * Format status for display
 * Converts INSPECTION_SCHEDULED → Inspection Scheduled
 */
export function formatStatus(status: string): string {
  return status
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

/**
 * Check if claim needs attention
 * Logic for "Claims Needing Attention" dashboard metric
 */
export function claimNeedsAttention(claim: {
  status: string;
  contactId: string | null;
  dateOfLoss: Date;
  updatedAt: Date;
}): boolean {
  const daysSinceUpdate = Math.floor(
    (Date.now() - claim.updatedAt.getTime()) / (1000 * 60 * 60 * 24)
  );

  // Missing contact
  if (!claim.contactId) return true;

  // Stuck in INTAKE/FILED for more than 3 days
  if ((claim.status === "INTAKE" || claim.status === "FILED") && daysSinceUpdate > 3) return true;

  // Inspection scheduled but no update in 7 days
  if (claim.status === "INSPECTION_SCHEDULED" && daysSinceUpdate > 7) return true;

  // Filed with carrier / adjuster review but no update in 14 days
  if (
    (claim.status === "FILED_WITH_CARRIER" || claim.status === "ADJUSTER_REVIEW") &&
    daysSinceUpdate > 14
  )
    return true;

  return false;
}
