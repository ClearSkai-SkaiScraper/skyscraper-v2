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
 */
export function getStatusBadgeColor(status: ClaimStatus | string): string {
  const normalized = status.toUpperCase();

  switch (normalized) {
    case "INTAKE":
    case "FILED":
      return "bg-slate-100 text-slate-800 border-slate-200";
    case "INSPECTION_SCHEDULED":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "INSPECTION_COMPLETED":
    case "INSPECTION_COMPLETE":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    case "FILED_WITH_CARRIER":
    case "ADJUSTER_REVIEW":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "ADJUSTER_SCHEDULED":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "APPROVED":
      return "bg-emerald-100 text-emerald-800 border-emerald-200";
    case "DENIED":
      return "bg-red-100 text-red-800 border-red-200";
    case "APPEAL":
      return "bg-orange-100 text-orange-800 border-orange-200";
    case "SUPPLEMENT_SUBMITTED":
      return "bg-cyan-100 text-cyan-800 border-cyan-200";
    case "IN_PROGRESS":
    case "BUILD":
      return "bg-violet-100 text-violet-800 border-violet-200";
    case "WORK_COMPLETE":
      return "bg-teal-100 text-teal-800 border-teal-200";
    case "CLOSEOUT_PENDING":
      return "bg-yellow-100 text-yellow-800 border-yellow-200";
    case "DEPRECIATION":
      return "bg-sky-100 text-sky-800 border-sky-200";
    case "COMPLETED":
    case "PAID_CLOSED":
    case "CLOSED":
      return "bg-green-100 text-green-800 border-green-200";
    default:
      return "bg-slate-100 text-slate-800 border-slate-200";
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
