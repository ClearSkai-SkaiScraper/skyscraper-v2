/**
 * ============================================================================
 * CLAIM PHOTOS API
 * ============================================================================
 *
 * GET  /api/claims/[claimId]/photos  — List photos for a claim
 * POST /api/claims/[claimId]/photos  — Upload a photo (proxy to assets)
 *
 * Proxies to the underlying file_assets table for photo management.
 * The Photos page calls this endpoint directly.
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import prisma from "@/lib/prisma";

/**
 * GET /api/claims/[claimId]/photos
 * List all photos for a claim
 */
export const GET = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org and get damageType + property context for AI analysis
      const claim = await getOrgClaimOrThrow(orgId, claimId);

      // Fetch property data for AI context (roofType, city, state)
      const property = claim.propertyId
        ? await prisma.properties.findFirst({
            where: { id: claim.propertyId, orgId },
            select: {
              roofType: true,
              propertyType: true,
              city: true,
              state: true,
              zipCode: true,
            },
          })
        : null;

      const photos = await prisma.file_assets.findMany({
        where: {
          claimId,
          orgId,
          mimeType: { startsWith: "image/" },
          // Exclude damage_report files but INCLUDE NULLs
          // IMPORTANT: Prisma's notIn does NOT include NULL values (SQL behavior),
          // so we must use OR to explicitly allow NULLs
          OR: [{ file_type: { notIn: ["damage_report"] } }, { file_type: null }],
        },
        orderBy: { createdAt: "desc" },
      });

      return NextResponse.json({
        success: true,
        claimDamageType: claim.damageType || null,
        claimContext: {
          roofType: property?.roofType || null,
          propertyType: property?.propertyType || null,
          city: property?.city || null,
          state: property?.state || null,
          zipCode: property?.zipCode || null,
        },
        photos: photos.map((p) => {
          // Parse metadata for annotations
          const metadata = (p.metadata as Record<string, unknown>) || {};
          const annotations = metadata.annotations || [];
          const hasAnnotations = Array.isArray(annotations) && annotations.length > 0;

          // Build damage boxes from annotations for overlay display
          // Annotations may be stored in two formats:
          //   - Pixel-based: x/y in 0-800, width/height in 0-800/600 (from ClaimPhotoUploadWithAnalysis)
          //   - Percentage-based: x/y in 0-100, with isPercentage=true flag (legacy)
          // Both need to be converted to 0-1 fractions for CSS positioning
          const damageBoxes = hasAnnotations
            ? (
                annotations as Array<{
                  x: number;
                  y: number;
                  width?: number;
                  height?: number;
                  caption?: string;
                  damageType?: string;
                  severity?: string;
                  isPercentage?: boolean;
                }>
              ).map((ann) => {
                // Detect format: if isPercentage flag is set, divide by 100
                // Otherwise assume pixel-based (0-800/0-600) and divide accordingly
                const isPercent = ann.isPercentage === true;
                return {
                  x: isPercent ? (ann.x || 0) / 100 : (ann.x || 0) / 800,
                  y: isPercent ? (ann.y || 0) / 100 : (ann.y || 0) / 600,
                  w: isPercent ? (ann.width || 5) / 100 : (ann.width || 50) / 800,
                  h: isPercent ? (ann.height || 5) / 100 : (ann.height || 50) / 600,
                  label: ann.caption || ann.damageType || "Damage",
                };
              })
            : null;

          return {
            id: p.id,
            filename: p.filename,
            publicUrl: p.publicUrl,
            url: p.publicUrl,
            category: p.category,
            note: p.note,
            mimeType: p.mimeType,
            sizeBytes: p.sizeBytes,
            createdAt: p.createdAt,
            // AI analysis fields from saved data
            aiCaption: p.ai_caption
              ? {
                  summary: p.ai_caption,
                  damageType: (annotations[0] as { damageType?: string })?.damageType || null,
                  applicableCode: (annotations[0] as { ircCode?: string })?.ircCode || null,
                }
              : null,
            annotations: annotations,
            damageBoxes: damageBoxes,
            severity: p.ai_severity || null,
            confidence: p.ai_confidence ? Number(p.ai_confidence) : null,
            analyzed: !!p.analyzed_at || hasAnnotations,
            analyzedAt: p.analyzed_at,
            visibleToClient: p.visibleToClient ?? false,
          };
        }),
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Photos GET] Error:", error);
      return NextResponse.json({ error: "Failed to fetch photos" }, { status: 500 });
    }
  }
);

/**
 * POST /api/claims/[claimId]/photos
 * Upload a photo for a claim — stores in Supabase, registers in file_assets
 */
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

      const { createClient } = await import("@supabase/supabase-js");
      const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!url || !key) {
        return NextResponse.json({ error: "Storage not configured" }, { status: 500 });
      }
      const supabase = createClient(url, key, { auth: { persistSession: false } });

      const formData = await req.formData();
      const file = formData.get("file") as File;
      const category = (formData.get("category") as string) || "damage";

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const maxSize = 25 * 1024 * 1024; // 25MB per photo
      const allowed = [
        "image/jpeg",
        "image/jpg",
        "image/png",
        "image/webp",
        "image/heic",
        "image/heif",
      ];

      if (!allowed.includes(file.type)) {
        return NextResponse.json({ error: `Invalid file type: ${file.type}` }, { status: 400 });
      }
      if (file.size > maxSize) {
        return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
      }

      const bytes = await file.arrayBuffer();
      const buffer = Buffer.from(bytes);

      const ext = file.name.split(".").pop() || "jpg";
      const timestamp = Date.now();
      const uuid = crypto.randomUUID();
      const filePath = `${orgId}/${claimId}/${timestamp}-${uuid}.${ext}`;
      const bucket = "claim-photos";

      // Ensure bucket exists
      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some((b: { name: string }) => b.name === bucket)) {
        await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: maxSize });
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, { contentType: file.type, upsert: true });

      if (uploadError) {
        logger.error("[Photos POST] Supabase upload error:", uploadError);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

      // Register in file_assets
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
          category,
          source: "user",
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        photo: {
          id: asset.id,
          filename: asset.filename,
          url: publicUrl,
          publicUrl,
          category: asset.category,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
          createdAt: asset.createdAt,
        },
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Photos POST] Error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }
);
