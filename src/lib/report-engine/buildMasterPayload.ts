// src/lib/report-engine/buildMasterPayload.ts
import { collectAddonSelections } from "./collectors/addons";
import { collectDocumentDataset } from "./collectors/documents";
import { collectExternalDataset } from "./collectors/external";
import { collectForensicsDataset } from "./collectors/forensics";
import { collectInternalClaimDataset } from "./collectors/internal";

/**
 * MASTER PAYLOAD BUILDER
 * 
 * This is the UNIFIED INTELLIGENCE ENGINE for SkaiScraper.
 * It combines all 4 data collectors into a single, comprehensive payload
 * that powers EVERY AI-generated output in the system:
 * - Reports (adjuster packets, homeowner summaries)
 * - Supplements
 * - Proposals
 * - Automations
 * - Email drafts
 * - Any future AI feature
 * 
 * Architecture:
 * 1. Internal Collector → All claim data from Prisma
 * 2. Addon Collector → User-selected feature toggles
 * 3. Document Collector → Estimates, supplements, AI findings, files
 * 4. External Collector → Weather, codes, manufacturer specs, climate risks
 * 
 * Output: One unified JSON payload that AI can consume
 */

interface BuildMasterPayloadParams {
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  addonPayload?: Record<string, any>;
  orgId?: string;
}

export async function buildMasterReportPayload({
  claimId,
  addonPayload = {},
  orgId,
}: BuildMasterPayloadParams) {
  // STEP 1: Collect internal claim data (core source of truth)
  const internal = await collectInternalClaimDataset(claimId, orgId);

  // STEP 2: Collect user addon selections
  const addons = collectAddonSelections(addonPayload);

  // STEP 3: Collect all documents/estimates/supplements/AI findings
  const documents = await collectDocumentDataset(claimId);

  // STEP 4: Collect external/world data (weather, codes, specs)
  // Use property address and roof type from internal collector
  // Property details temporarily disabled (relation removed); provide placeholders
  const address = "";
  const roofType = null;
  const lossType = internal.typeOfLoss ?? null;

  const external = await collectExternalDataset({
    address,
    roofType,
    lossType,
  });

  // STEP 5: Collect material forensics (Phase 7)
  const forensics = await collectForensicsDataset(claimId);

  // STEP 6: Combine all collectors into unified payload
  const masterPayload = {
    internal,
    addons,
    documents,
    external,
    forensics, // Phase 7 - Material Forensics Engine
    generatedAt: new Date().toISOString(),
  };

  return masterPayload;
}

/**
 * Type-safe helper to build master payload with minimal params
 */
export async function buildPayloadForClaim(claimId: string, orgId?: string) {
  return buildMasterReportPayload({ claimId, orgId, addonPayload: {} });
}

/**
 * Type-safe helper to build master payload with custom addons
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function buildPayloadWithAddons(claimId: string, addonPayload: Record<string, any>, orgId?: string) {
  return buildMasterReportPayload({ claimId, addonPayload, orgId });
}
