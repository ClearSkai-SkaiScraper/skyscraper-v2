/**
 * Phase 2: AI PDF Storage Helper
 * Standardized pipeline for saving AI-generated PDFs to Supabase + GeneratedArtifact
 *
 * Uses service-role admin client for server-side uploads (no user auth required)
 */

import crypto from "crypto";

import { createClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// Use claim-photos bucket which is guaranteed to exist and have proper policies
const BUCKET = "claim-photos";

/**
 * Get Supabase admin client with service role key for server-side uploads
 */
function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("[saveAiPdfToStorage] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  }
  return createClient(url, key, { auth: { persistSession: false } });
}

interface SaveAiPdfOptions {
  orgId: string;
  claimId?: string;
  userId: string;
  type: "WEATHER" | "REBUTTAL" | "DEPRECIATION" | "SUPPLEMENT" | "OTHER";
  label: string;
  pdfBuffer: Buffer;
  visibleToClient?: boolean;
  aiReportId?: string;
}

interface SaveAiPdfResult {
  id: string;
  publicUrl: string;
  storageKey: string;
}

/**
 * Save an AI-generated PDF to Supabase Storage and create a GeneratedArtifact record
 */
export async function saveAiPdfToStorage(options: SaveAiPdfOptions): Promise<SaveAiPdfResult> {
  const {
    orgId,
    claimId,
    userId,
    type,
    label,
    pdfBuffer,
    visibleToClient = false,
    aiReportId,
  } = options;

  const supabase = getSupabaseAdmin();

  // Build storage path - matches claim-photos bucket structure: orgId/claimId/category/filename
  const timestamp = Date.now();
  const uuid = crypto.randomUUID();
  const filename = `${type.toLowerCase()}_${timestamp}_${uuid}.pdf`;
  const storageKey = `${orgId}/${claimId || "standalone"}/ai-reports/${filename}`;

  const sizeMB = (pdfBuffer.length / (1024 * 1024)).toFixed(2);
  logger.info("[saveAiPdfToStorage] Uploading PDF:", {
    bucket: BUCKET,
    storageKey,
    sizeBytes: pdfBuffer.length,
    sizeMB,
  });

  // Upload to Supabase Storage using admin client (no user auth required)
  let { error: uploadError } = await supabase.storage.from(BUCKET).upload(storageKey, pdfBuffer, {
    contentType: "application/pdf",
    upsert: true,
  });

  // If upload failed due to size limit, try to increase the bucket limit and retry
  if (uploadError?.message?.includes("maximum allowed size")) {
    logger.warn("[saveAiPdfToStorage] Upload rejected by size limit, attempting to update bucket", {
      pdfSizeMB: sizeMB,
    });
    try {
      await supabase.storage.updateBucket(BUCKET, {
        public: true,
        fileSizeLimit: 50 * 1024 * 1024, // 50 MB
      });
      logger.info("[saveAiPdfToStorage] Bucket limit updated to 50 MB, retrying upload");
      const retryResult = await supabase.storage.from(BUCKET).upload(storageKey, pdfBuffer, {
        contentType: "application/pdf",
        upsert: true,
      });
      uploadError = retryResult.error;
    } catch (bucketErr) {
      logger.error("[saveAiPdfToStorage] Failed to update bucket limit:", bucketErr);
      // Fall through to original error handling
    }
  }

  if (uploadError) {
    logger.error("[saveAiPdfToStorage] ❌ Supabase upload failed:", {
      error: uploadError,
      bucket: BUCKET,
      claimId,
      storageKey,
      pdfSizeMB: sizeMB,
    });
    throw new Error(`Supabase upload failed: ${uploadError.message} (PDF size: ${sizeMB} MB)`);
  }

  // Get public URL
  const {
    data: { publicUrl },
  } = supabase.storage.from(BUCKET).getPublicUrl(storageKey);

  logger.info("[saveAiPdfToStorage] ✅ Uploaded to Supabase:", { storageKey, publicUrl });

  // Save reference as GeneratedArtifact for tracking
  let artifactId = storageKey;
  try {
    const artifact = await prisma.generatedArtifact.create({
      data: {
        orgId,
        claimId: claimId || null,
        type: type.toLowerCase(),
        title: label,
        fileUrl: publicUrl,
        status: "completed",
        metadata: {
          storageKey,
          userId,
          visibleToClient,
          aiReportId: aiReportId || null,
          filename,
          sizeBytes: pdfBuffer.length,
        },
      },
    });
    artifactId = artifact.id;
    logger.info(
      `[saveAiPdfToStorage] ✅ Saved artifact ${artifactId} for claim ${claimId}, aiReportId=${aiReportId}`
    );
  } catch (dbErr) {
    // Log full error details for debugging
    logger.error(`[saveAiPdfToStorage] ❌ Artifact DB write failed for claim ${claimId}:`, {
      error: dbErr,
      orgId,
      claimId,
      type,
      aiReportId,
    });
    // Re-throw so callers know the artifact wasn't saved
    throw new Error(`Failed to save GeneratedArtifact: ${dbErr}`);
  }

  return {
    id: artifactId,
    publicUrl,
    storageKey,
  };
}
