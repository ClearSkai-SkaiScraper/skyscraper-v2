export type LegalDocId =
  | "tos"
  | "privacy"
  | "aup"
  | "refund"
  | "esign"
  | "contractor"
  | "billing"
  | "dpa"
  | "hipaa"
  | "sla"
  | "client-agreement"
  | "pro-agreement";

export type LegalAudience = "all" | "contractor" | "homeowner" | "internal";

export interface LegalDocConfig {
  id: LegalDocId;
  title: string;
  latestVersion: string;
  required: boolean;
  audience: LegalAudience;
}

export const LEGAL_DOCUMENTS: LegalDocConfig[] = [
  // ============================================
  // REQUIRED FOR ALL USERS
  // ============================================
  {
    id: "tos",
    title: "Terms of Service",
    latestVersion: "2026-01",
    required: true,
    audience: "all",
  },
  {
    id: "privacy",
    title: "Privacy Policy",
    latestVersion: "2026-01",
    required: true,
    audience: "all",
  },
  // ============================================
  // ROLE-SPECIFIC AGREEMENTS
  // ============================================
  {
    id: "client-agreement",
    title: "Client User Agreement",
    latestVersion: "2026-01",
    required: true,
    audience: "homeowner",
  },
  {
    id: "pro-agreement",
    title: "Trades Professional Agreement",
    latestVersion: "2026-01",
    required: false, // Prompted separately, not as a gate blocker
    audience: "contractor",
  },
  {
    id: "contractor",
    title: "Pro Contractor Agreement",
    latestVersion: "2026-01",
    required: false, // Prompted separately, not as a gate blocker
    audience: "contractor",
  },
  // ============================================
  // ADDITIONAL — optional, shown in settings
  // ============================================
  {
    id: "aup",
    title: "Acceptable Use Policy",
    latestVersion: "2026-01",
    required: false, // Shown in settings, not as a gate
    audience: "contractor",
  },
  {
    id: "refund",
    title: "Refund & Cancellation Policy",
    latestVersion: "2026-01",
    required: false,
    audience: "all",
  },
  {
    id: "esign",
    title: "E-Sign Disclosure",
    latestVersion: "2026-01",
    required: false,
    audience: "all",
  },
  {
    id: "billing",
    title: "Billing Addendum",
    latestVersion: "2026-01",
    required: false, // Shown in settings, not as a gate
    audience: "contractor",
  },
  // ============================================
  // OPTIONAL DOCUMENTS
  // ============================================
  {
    id: "dpa",
    title: "Data Processing Agreement",
    latestVersion: "2026-01",
    required: false,
    audience: "contractor",
  },
  {
    id: "hipaa",
    title: "HIPAA Non-Coverage Notice",
    latestVersion: "2026-01",
    required: false,
    audience: "all",
  },
  {
    id: "sla",
    title: "Service Level Agreement",
    latestVersion: "2026-01",
    required: false,
    audience: "all",
  },
];
