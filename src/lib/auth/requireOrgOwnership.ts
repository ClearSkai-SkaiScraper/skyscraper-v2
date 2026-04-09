/**
 * requireOrgOwnership — Shared helper for verifying org ownership of records
 *
 * Used across API routes to ensure a record belongs to the caller's org
 * before allowing mutations (update/delete).
 *
 * Usage:
 *   const result = await requireOrgOwnership("claims", claimId, orgId);
 *   if (result instanceof NextResponse) return result;
 *   // result is the found record
 */

import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

type OrgScopedModel =
  | "claims"
  | "reports"
  | "clients"
  | "contacts"
  | "leads"
  | "vendors"
  | "team_invitations"
  | "ai_reports"
  | "generatedArtifact"
  | "signatureEnvelope";

/**
 * Verify that a record belongs to the given org.
 *
 * @param model - The Prisma model name (must have orgId field)
 * @param recordId - The record ID to check
 * @param orgId - The org ID to verify ownership against
 * @returns The found record, or a NextResponse(403/404) on failure
 */
export async function requireOrgOwnership(
  model: OrgScopedModel,
  recordId: string,
  orgId: string
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
): Promise<any | NextResponse> {
  if (!recordId || !orgId) {
    logger.warn(`[requireOrgOwnership] Missing recordId or orgId`, { model, recordId, orgId });
    return NextResponse.json({ error: "Missing record ID or org context" }, { status: 400 });
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const delegate = (prisma as any)[model];
    if (!delegate?.findFirst) {
      logger.error(`[requireOrgOwnership] Invalid model: ${model}`);
      return NextResponse.json({ error: "Internal server error" }, { status: 500 });
    }

    const record = await delegate.findFirst({
      where: { id: recordId, orgId },
    });

    if (!record) {
      logger.warn(`[requireOrgOwnership] Record not found or not owned`, {
        model,
        recordId,
        orgId,
      });
      return NextResponse.json({ error: "Not found or access denied" }, { status: 404 });
    }

    return record;
  } catch (error) {
    logger.error(`[requireOrgOwnership] Query failed`, { model, recordId, orgId, error });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
