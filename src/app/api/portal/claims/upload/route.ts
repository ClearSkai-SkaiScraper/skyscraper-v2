/**
 * POST /api/portal/claims/upload
 *
 * Handles photo uploads from the portal claim wizard.
 * Uploads files to Supabase Storage and creates file_assets records
 * so photos are immediately visible on both portal and pro sides.
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createClient } from "@supabase/supabase-js";
import { NextRequest, NextResponse } from "next/server";

import { assertPortalAccess } from "@/lib/auth/portalAccess";
import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const BUCKET = "portal-uploads";
const MAX_SIZE = 25 * 1024 * 1024; // 25MB
const ALLOWED_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/heic"];

function getSupabaseAdmin() {
  // eslint-disable-next-line no-restricted-syntax
  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
  // eslint-disable-next-line no-restricted-syntax
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate via portal auth (works for client users)
    const authResult = await requirePortalAuth();
    if (isPortalAuthError(authResult)) return authResult;
    const { userId } = authResult;

    // Rate limit: 20 uploads/min per user
    const rl = await checkRateLimit(userId, "UPLOAD");
    if (!rl.success) {
      return NextResponse.json(
        { error: "Too many uploads. Please try again shortly." },
        { status: 429 }
      );
    }

    const supabase = getSupabaseAdmin();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
    }

    const formData = await req.formData();
    const claimId = formData.get("claimId") as string;

    if (!claimId) {
      return NextResponse.json({ error: "claimId is required" }, { status: 400 });
    }

    // Verify portal access to this specific claim (checks all 3 access paths)
    try {
      await assertPortalAccess({ userId, claimId });
    } catch {
      logger.warn("[PORTAL_CLAIM_UPLOAD] Unauthorized access attempt", { userId, claimId });
      return NextResponse.json({ error: "Access denied to this claim" }, { status: 403 });
    }

    // Get claim details
    const claim = await prisma.claims.findUnique({
      where: { id: claimId },
      select: { id: true, orgId: true, insured_name: true },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Collect all files (wizard sends as "files" field)
    const files = formData.getAll("files") as File[];
    if (files.length === 0 || !(files[0] instanceof File)) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    const results: Array<{
      id: string;
      filename: string;
      publicUrl: string;
      category: string;
    }> = [];

    for (const file of files) {
      if (!(file instanceof File)) continue;

      // Validate type
      if (!ALLOWED_TYPES.includes(file.type)) {
        logger.warn("[PORTAL_CLAIM_UPLOAD] Skipping invalid type:", file.type);
        continue;
      }

      // Validate size
      if (file.size > MAX_SIZE) {
        logger.warn("[PORTAL_CLAIM_UPLOAD] Skipping oversized file:", file.name);
        continue;
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = file.name.split(".").pop() || "jpg";
      const timestamp = Date.now();
      const uuid = crypto.randomUUID();
      const storagePath = `claims/${claimId}/wizard-photos/${timestamp}-${uuid}.${ext}`;

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, buffer, {
          contentType: file.type,
          upsert: true,
        });

      if (uploadError) {
        logger.error("[PORTAL_CLAIM_UPLOAD] Supabase error:", uploadError);
        continue;
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(BUCKET).getPublicUrl(storagePath);

      // Create file_assets record so both portal and pro sides can see the photo
      const asset = await prisma.file_assets.create({
        data: {
          id: crypto.randomUUID(),
          orgId: claim.orgId,
          ownerId: userId,
          claimId,
          filename: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
          storageKey: storagePath,
          bucket: BUCKET,
          publicUrl,
          category: "damage_photo",
          source: "client_upload",
          visibleToClient: true,
          updatedAt: new Date(),
        },
      });

      results.push({
        id: asset.id,
        filename: file.name,
        publicUrl,
        category: "damage_photo",
      });
    }

    logger.info("[PORTAL_CLAIM_UPLOAD]", {
      userId,
      claimId,
      uploaded: results.length,
      total: files.length,
    });

    return NextResponse.json({
      success: true,
      files: results,
      count: results.length,
    });
  } catch (error) {
    logger.error("[PORTAL_CLAIM_UPLOAD] Error:", error);
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
