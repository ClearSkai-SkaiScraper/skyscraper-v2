/**
 * Proposal Generation Worker Job v1
 *
 * Generates proposals with placeholder content and download URLs.
 * Phase 4: Creates proposal row with sections, returns fake download URL.
 * Future: Replace with real PDF generation pipeline.
 */

import { type Job as PgBossJob } from "pg-boss";
import { pool } from "../../lib/db/index.js";
import { recordJobEvent } from "../../lib/queue/hooks.js";

// =============================================================================
// TYPES
// =============================================================================

export interface ProposalGeneratePayload {
  leadId?: string;
  orgId: string; // S1-06: MANDATORY — tenant isolation requires orgId
  userId?: string;
  title?: string;
  sections?: Array<{ key: string; data: any }>;
}

// =============================================================================
// JOB HANDLER
// =============================================================================

/**
 * Process proposal generation job
 */
export async function jobProposalGenerate(
  payload: ProposalGeneratePayload,
  job: PgBossJob
): Promise<void> {
  console.log(`Starting proposal generation for org=${payload.orgId}`);

  // S1-06: Runtime validation — reject jobs without orgId
  if (!payload.orgId) {
    const msg = "[PROPOSAL_GENERATE] Rejected: missing orgId in job payload";
    console.error(msg);
    await recordJobEvent(job, "failed", msg);
    throw new Error(msg);
  }

  await recordJobEvent(job, "working", "Building proposal");

  const client = await pool.connect();

  try {
    const { leadId, orgId, title = "New Proposal", sections = [] } = payload;

    // Build proposal data
    const data = {
      sections,
      version: 1,
      note: "Phase 4 placeholder content - replace with real PDF generation",
      generatedAt: new Date().toISOString(),
    };

    // Placeholder download URL
    const downloadUrl = `https://skaiscrape.com/downloads/proposals/${job.id}.pdf`;

    // Insert proposal record (A-03: upsert to prevent duplicates on retry)
    const insertQuery = `
      INSERT INTO proposals_v2 (lead_id, org_id, title, status, data, download_url)
      VALUES ($1, $2, $3, 'ready', $4::jsonb, $5)
      ON CONFLICT (lead_id, org_id, title) DO UPDATE SET
        status = 'ready',
        data = EXCLUDED.data,
        download_url = EXCLUDED.download_url
      RETURNING id, download_url;
    `;

    const result = await client.query(insertQuery, [
      leadId || null,
      orgId || null,
      title,
      data,
      downloadUrl,
    ]);

    const proposalId = result.rows[0].id;
    const resultDownloadUrl = result.rows[0].download_url;

    // Record completion
    await recordJobEvent(job, "completed", "Proposal ready", {
      proposalId,
      downloadUrl: resultDownloadUrl,
    });

    console.log(`✅ Proposal generated: ${proposalId}`);
    console.log(`   Download URL: ${resultDownloadUrl}`);
  } catch (error: any) {
    console.error("Proposal generation failed:", error);
    await recordJobEvent(job, "failed", error.message);
    throw error;
  } finally {
    client.release();
  }
}
