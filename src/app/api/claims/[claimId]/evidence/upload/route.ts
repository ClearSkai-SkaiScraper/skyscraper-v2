/**
 * POST /api/claims/[claimId]/evidence/upload
 *
 * Proxy route for evidence uploads.
 * Forwards to the universal /api/upload/supabase handler with proper params.
 */

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getSupabaseAdmin() {
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export const POST = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org
      await getOrgClaimOrThrow(orgId, claimId);

      const supabase = getSupabaseAdmin();
      if (!supabase) {
        return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
      }

      const formData = await req.formData();
      const file = formData.get("file") as File;
      const sectionKey = formData.get("sectionKey") as string | null;

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      // Validate
      const maxSize = 20 * 1024 * 1024; // 20MB
      const allowed = [
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/pdf",
        "image/jpg",
        "image/heic",
      ];

      if (!allowed.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
      }
      if (file.size > maxSize) {
        return NextResponse.json({ error: "File too large (max 20MB)" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = file.name.split(".").pop() || "bin";
      const timestamp = Date.now();
      const uuid = crypto.randomUUID();
      const filePath = `${orgId}/${claimId}/evidence/${timestamp}-${uuid}.${ext}`;

      const bucket = "evidence";

      // Ensure bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some((b) => b.name === bucket)) {
        await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: maxSize });
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, { contentType: file.type, upsert: true });

      if (error) {
        logger.error("[Evidence Upload] Supabase error:", error);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      // Create file_assets DB record
      const asset = await prisma.file_assets.create({
        data: {
          id: crypto.randomUUID(),
          orgId,
          ownerId: userId,
          claimId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey: filePath,
          bucket,
          publicUrl,
          category: "evidence",
          note: sectionKey || null,
          source: "user",
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        asset: {
          id: asset.id,
          filename: asset.filename,
          publicUrl: asset.publicUrl,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
          category: asset.category,
        },
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Evidence Upload] Error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }
);
