/**
 * Damage Analysis Worker Job
 *
 * Processes uploaded photos using OpenAI Vision API to detect damage.
 * Stores findings in photo_findings table.
 */

import { type Job as PgBossJob } from "pg-boss";
import type { DamageReport } from "../../lib/ai/damage-schema.js";
import { analyzeImage } from "../../lib/ai/openai-vision.js";
import { q, qOne } from "../../lib/db/index.js";
import { extractStoragePath, getSignedReadUrl } from "../helpers/storage.js";

// =============================================================================
// TYPES
// =============================================================================

interface DamageAnalyzePayload {
  proposalId: string;
  orgId: string;
  photoIds: string[]; // UUIDs of photos to analyze
}

interface ProposalPhoto {
  id: string;
  proposal_id: string;
  org_id: string;
  image_url: string;
  source: string | null;
  created_at: string;
}

// DamageReport imported from damage-schema.ts

// =============================================================================
// JOB HANDLER
// =============================================================================

/**
 * Process damage analysis job
 */
export async function jobDamageAnalyze(
  payload: DamageAnalyzePayload,
  job: PgBossJob
): Promise<void> {
  const { proposalId, orgId, photoIds } = payload;

  console.log(`Starting damage analysis for proposal ${proposalId}`);
  console.log(`Photos to analyze: ${photoIds.length}`);

  try {
    // Update proposal status to "running"
    await q(`SELECT proposals_set_status($1::uuid, $2, NULL)`, [proposalId, "running"]);

    // Process each photo
    let successCount = 0;
    let errorCount = 0;

    for (const photoId of photoIds) {
      try {
        console.log(`Analyzing photo: ${photoId}`);

        // Fetch photo from database
        const photo = await qOne<ProposalPhoto>(
          `SELECT * FROM proposal_photos WHERE id = $1::uuid AND org_id = $2::uuid`,
          [photoId, orgId]
        );

        if (!photo) {
          console.error(`Photo not found: ${photoId}`);
          errorCount++;
          continue;
        }

        // Extract storage path and generate signed URL
        const storagePath = extractStoragePath(photo.image_url);
        const signedUrl = await getSignedReadUrl(storagePath, 300); // 5-minute expiry

        console.log(`Generated signed URL for photo ${photoId}`);

        // Call OpenAI Vision API
        const report: DamageReport = await analyzeImage(signedUrl);

        console.log(`Vision API result for photo ${photoId}:`, {
          severity: report.overall_severity,
          confidence: report.overall_confidence,
          itemCount: report.items.length,
        });

        // Insert finding into database (A-01: upsert to prevent duplicates on retry)
        await q(
          `INSERT INTO photo_findings (
            proposal_id,
            photo_id,
            model,
            findings,
            severity,
            confidence,
            created_at
          ) VALUES (
            $1::uuid,
            $2::uuid,
            $3,
            $4::jsonb,
            $5,
            $6,
            NOW()
          )
          ON CONFLICT (proposal_id, photo_id) DO UPDATE SET
            model = EXCLUDED.model,
            findings = EXCLUDED.findings,
            severity = EXCLUDED.severity,
            confidence = EXCLUDED.confidence,
            created_at = NOW()
          `,
          [
            proposalId,
            photoId,
            "gpt-4o-mini", // Model used
            JSON.stringify(report), // Store full DamageReport
            report.overall_severity,
            report.overall_confidence,
          ]
        );

        console.log(`Saved findings for photo ${photoId}`);
        successCount++;
      } catch (photoError: any) {
        console.error(`Failed to analyze photo ${photoId}:`, photoError);
        errorCount++;

        // Record error event but continue with other photos
        await q(
          `INSERT INTO proposal_events (proposal_id, event_type, message, metadata, created_at)
           VALUES ($1::uuid, $2, $3, $4::jsonb, NOW())`,
          [
            proposalId,
            "damage_analysis_error",
            `Photo analysis failed: ${photoError.message}`,
            JSON.stringify({ photoId, error: photoError.message }),
          ]
        );
      }
    }

    // Update proposal status
    if (errorCount === 0) {
      // All photos analyzed successfully
      await q(`SELECT proposals_set_status($1::uuid, $2, NULL)`, [proposalId, "complete"]);

      // Record success event
      await q(
        `INSERT INTO proposal_events (proposal_id, event_type, message, metadata, created_at)
         VALUES ($1::uuid, $2, $3, $4::jsonb, NOW())`,
        [
          proposalId,
          "damage_analysis_complete",
          `Analyzed ${successCount} photo${successCount > 1 ? "s" : ""}`,
          JSON.stringify({ successCount, totalCount: photoIds.length }),
        ]
      );

      console.log(`✅ Damage analysis complete for proposal ${proposalId}`);
    } else {
      // Some photos failed
      const errorMessage = `${successCount} of ${photoIds.length} photos analyzed. ${errorCount} failed.`;

      await q(`SELECT proposals_set_status($1::uuid, $2, $3)`, [proposalId, "error", errorMessage]);

      // Record partial success event
      await q(
        `INSERT INTO proposal_events (proposal_id, event_type, message, metadata, created_at)
         VALUES ($1::uuid, $2, $3, $4::jsonb, NOW())`,
        [
          proposalId,
          "damage_analysis_partial",
          errorMessage,
          JSON.stringify({ successCount, errorCount, totalCount: photoIds.length }),
        ]
      );

      console.warn(`⚠️ Damage analysis partially failed for proposal ${proposalId}`);
    }
  } catch (error: any) {
    console.error(`Fatal error in damage analysis job:`, error);

    // Update proposal status to error
    await q(`SELECT proposals_set_status($1::uuid, $2, $3)`, [proposalId, "error", error.message]);

    // Record error event
    await q(
      `INSERT INTO proposal_events (proposal_id, event_type, message, metadata, created_at)
       VALUES ($1::uuid, $2, $3, $4::jsonb, NOW())`,
      [
        proposalId,
        "damage_analysis_failed",
        `Analysis job failed: ${error.message}`,
        JSON.stringify({ error: error.message, stack: error.stack }),
      ]
    );

    // Re-throw to let pg-boss handle retry
    throw error;
  }
}
