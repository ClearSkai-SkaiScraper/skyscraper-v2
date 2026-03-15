/**
 * ============================================================================
 * buildContextLabel — Canonical Display Label Builder
 * ============================================================================
 *
 * Shared resolver for claim/job/contact display labels used everywhere
 * selectors, dropdowns, builders, and tools show claims or jobs.
 *
 * OUTPUT FORMAT:
 *   Claims → "CLM-123456 — Emily Test Claim — 1625 Palo Verde Dr, Chino Valley, AZ 86323"
 *   Jobs   → "JOB-123456 — Smith Roof Repair — 1625 Palo Verde Dr, Chino Valley, AZ 86323"
 *
 * FALLBACK CHAIN:
 *   1. Number + Name + Full Address
 *   2. Number + Name (no address)
 *   3. Number + Address (no name)
 *   4. Number + short ID
 *
 * ============================================================================
 */

// ── Types ──────────────────────────────────────────────────────────────────

export interface ClaimLabelInput {
  id: string;
  claimNumber?: string | null;
  /** Insured / homeowner name */
  insuredName?: string | null;
  /** Claim title (e.g. "Hail Damage Roof Repair") */
  title?: string | null;
  /** Pre-formatted full address string */
  address?: string | null;
  /** Structured address parts — used if `address` is missing */
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export interface JobLabelInput {
  id: string;
  title?: string | null;
  status?: string | null;
  /** Pre-formatted full address string */
  address?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

// ── Address Formatter ──────────────────────────────────────────────────────

/**
 * Build a clean address string from structured parts.
 * Degrades gracefully when parts are missing.
 */
export function formatAddress(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}): string | null {
  const { street, city, state, zip } = parts;

  // If we have street + city at minimum, build a real address
  if (street && city) {
    const stateZip = [state, zip].filter(Boolean).join(" ");
    return [street, city, stateZip].filter(Boolean).join(", ");
  }

  // Partial: just street
  if (street) {
    const rest = [city, state, zip].filter(Boolean).join(", ");
    return rest ? `${street}, ${rest}` : street;
  }

  // Partial: city + state
  if (city) {
    const stateZip = [state, zip].filter(Boolean).join(" ");
    return stateZip ? `${city}, ${stateZip}` : city;
  }

  // Barely anything
  if (state) return zip ? `${state} ${zip}` : state;

  return null;
}

// ── Claim Label Builder ────────────────────────────────────────────────────

/**
 * Build a canonical display label for a claim.
 *
 * @example
 * buildClaimLabel({ id: "abc", claimNumber: "CLM-2024-042", insuredName: "Emily Test", street: "1625 Palo Verde Dr", city: "Chino Valley", state: "AZ", zip: "86323" })
 * // → "CLM-2024-042 — Emily Test — 1625 Palo Verde Dr, Chino Valley, AZ 86323"
 */
export function buildClaimLabel(c: ClaimLabelInput): string {
  const number = c.claimNumber || c.id.slice(0, 8);
  const name = c.insuredName || c.title || null;
  const addr = c.address || formatAddress(c) || null;

  const parts = [number, name, addr].filter(Boolean);
  return parts.join(" — ");
}

/**
 * Build a shorter label for compact selectors.
 *
 * @example
 * buildClaimLabelShort({ claimNumber: "CLM-2024-042", insuredName: "Emily Test" })
 * // → "CLM-2024-042 — Emily Test"
 */
export function buildClaimLabelShort(c: ClaimLabelInput): string {
  const number = c.claimNumber || c.id.slice(0, 8);
  const name = c.insuredName || c.title || null;

  if (name) return `${number} — ${name}`;
  const addr = c.address || formatAddress(c);
  if (addr) return `${number} — ${addr}`;
  return number;
}

// ── Job Label Builder ──────────────────────────────────────────────────────

/**
 * Build a canonical display label for a job.
 *
 * @example
 * buildJobLabel({ id: "xyz", title: "Smith Roof Repair", status: "active", street: "1625 Palo Verde Dr", city: "Chino Valley", state: "AZ", zip: "86323" })
 * // → "Smith Roof Repair — 1625 Palo Verde Dr, Chino Valley, AZ 86323"
 */
export function buildJobLabel(j: JobLabelInput): string {
  const title = j.title || `Job ${j.id.slice(0, 8)}`;
  const addr = j.address || formatAddress(j) || null;
  const suffix = j.status ? ` (${j.status})` : "";

  if (addr) return `${title} — ${addr}${suffix}`;
  return `${title}${suffix}`;
}

// ── Generic Context Label ──────────────────────────────────────────────────

export type ContextEntity =
  | ({ type: "claim" } & ClaimLabelInput)
  | ({ type: "job" } & JobLabelInput);

/**
 * Generic label builder that dispatches to claim or job formatter.
 */
export function buildContextLabel(entity: ContextEntity): string {
  if (entity.type === "claim") return buildClaimLabel(entity);
  return buildJobLabel(entity);
}
