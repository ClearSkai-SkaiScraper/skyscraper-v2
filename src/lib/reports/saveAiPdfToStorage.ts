/**
 * Phase 2: AI PDF Storage Helper
 * Standardized pipeline for saving AI-generated PDFs to Supabase + GeneratedArtifact
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { uploadSupabase } from "@/lib/storage";

interface SaveAiPdfOptions {
  orgId: string;
  claimId: string;
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

  // Create a File object from the buffer
  const timestamp = Date.now();
  const filename = `${type.toLowerCase()}_${timestamp}.pdf`;
  const file = new File([new Uint8Array(pdfBuffer)], filename, { type: "application/pdf" });

  // Upload to Supabase Storage
  const folder = `claims/${claimId}/ai`;
  const { url: publicUrl, path: storageKey } = await uploadSupabase(file, "documents", folder);

  // Save reference as GeneratedArtifact for tracking
  let artifactId = storageKey;
  try {
    const artifact = await prisma.generatedArtifact.create({
      data: {
        orgId,
        claimId,
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
