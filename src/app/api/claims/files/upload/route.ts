/**
 * POST /api/claims/files/upload
 *
 * Universal file upload for claims — uploads to Supabase Storage
 * and creates a file_assets DB record.
 *
 * Used by: ClaimFilesPanel, FinalPayoutClient, ClaimIntakeWizard
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const BUCKET = "claim-photos";
const MAX_SIZE = 20 * 1024 * 1024; // 20MB
const ALLOWED_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "application/pdf",
];

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const POST = withAuth(async (req: NextRequest, { userId, orgId }) => {
  try {
    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const claimId = formData.get("claimId") as string;
    const category =
      (formData.get("category") as string) || (formData.get("type") as string) || "general";

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    // Verify claim belongs to org
    const claim = await prisma.claims.findFirst({
      where: { id: claimId, orgId },
      select: { id: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Support both single file ("file") and multi-file ("files") field names
    const singleFile = formData.get("file") as File | null;
    const multiFiles = formData.getAll("files") as File[];
    const filesToUpload = singleFile ? [singleFile] : multiFiles;

    if (filesToUpload.length === 0 || !(filesToUpload[0] instanceof File)) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results: Array<{
      id: string;
      filename: string;
      publicUrl: string;
      url: string;
      storageKey: string;
      key: string;
      mimeType: string;
      sizeBytes: number;
      category: string;
    }> = [];

    for (const file of filesToUpload) {
      if (!(file instanceof File)) continue;

      // Validate
      if (!ALLOWED_TYPES.includes(file.type)) {
        logger.warn("[Claims Files Upload] Skipping invalid type:", file.type);
        continue;
      }
      if (file.size > MAX_SIZE) {
        logger.warn("[Claims Files Upload] Skipping oversized file:", file.name);
        continue;
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = file.name.split(".").pop() || "bin";
      const timestamp = Date.now();
      const uuid = crypto.randomUUID();
      const storagePath = `${orgId}/${claimId}/${category}/${timestamp}-${uuid}.${ext}`;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, { contentType: file.type, upsert: true });

      if (error) {
        logger.error("[Claims Files Upload] Supabase error:", error);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

      // Create file_assets record
      const asset = await prisma.file_assets.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          ownerId: userId,
          claimId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey: storagePath,
          bucket: BUCKET,
          publicUrl,
          category,
          source: "user",
          updatedAt: new Date(),
        },
      });

      results.push({
        id: asset.id,
        filename: asset.filename,
        publicUrl: asset.publicUrl || publicUrl,
        url: asset.publicUrl || publicUrl,
        storageKey: storagePath,
        key: storagePath,
        mimeType: asset.mimeType || file.type,
        sizeBytes: asset.sizeBytes || file.size,
        category,
      });
    }

    if (results.length === 0) {
      return NextResponse.json({ error: "No valid files uploaded" }, { status: 400 });
    }

    // If single file, return flat object for backwards compatibility
    if (results.length === 1) {
      return NextResponse.json({
        success: true,
        ...results[0],
      });
    }

    return NextResponse.json({
      success: true,
      files: results,
      count: results.length,
    });
  } catch (error) {
    logger.error("[Claims Files Upload] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
});
