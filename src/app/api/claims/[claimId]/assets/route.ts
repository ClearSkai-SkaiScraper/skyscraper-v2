/**
 * ============================================================================
 * UNIFIED CLAIM ASSETS HANDLER
 * ============================================================================
 *
 * GET/POST /api/claims/[claimId]/assets
 *
 * Consolidates ALL asset/evidence operations for claims into a single endpoint.
 *
 * GET QUERY PARAMS:
 *   - type: "all" | "photos" | "documents" | "evidence" | "artifacts"
 *   - include: comma-separated list to include metadata
 *
 * POST ACTIONS:
 *   - upload_photo: Upload a photo
 *   - upload_document: Upload a document
 *   - upload_evidence: Upload evidence to collection
 *   - create_artifact: Create AI artifact
 *
 * REPLACES:
 *   - /api/claims/[claimId]/photos (GET/POST)
 *   - /api/claims/[claimId]/photos/[photoId] (keep for single item ops)
 *   - /api/claims/[claimId]/documents (GET)
 *   - /api/claims/[claimId]/evidence (GET)
 *   - /api/claims/[claimId]/evidence/upload
 *   - /api/claims/[claimId]/artifacts (GET/POST)
 *   - /api/claims/[claimId]/assets-with-meta
 *
 * ============================================================================
 */

import { nanoid } from "nanoid";
import { NextRequest, NextResponse } from "next/server";

import { requireApiAuth, verifyClaimAccess } from "@/lib/auth/apiAuth";
import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { isAuthError, requireAuth } from "@/lib/auth/requireAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { uploadBuffer } from "@/lib/s3";
import { getClaimAssetsWithMetadata } from "@/server/claims/getClaimAssetsWithMetadata";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// ─────────────────────────────────────────────────────────────────────────────
// GET HANDLER - List assets by type
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    const auth = await requireAuth();
    if (isAuthError(auth)) return auth;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { orgId, userId } = auth;

    const { claimId } = await params;

    // Verify claim access
    await getOrgClaimOrThrow(orgId, claimId);

    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type") || "all";
    const includeMetadata = searchParams.get("include")?.includes("metadata");
    const aiReportsOnly = searchParams.get("aiReportsOnly") === "true";

    // If metadata requested, use the comprehensive function
    if (includeMetadata || type === "all") {
      const data = await getClaimAssetsWithMetadata(claimId);
      return NextResponse.json(data);
    }

    // Type-specific queries
    switch (type) {
      case "photos":
        return getPhotos(claimId, orgId);

      case "documents":
        return getDocuments(claimId, aiReportsOnly);

      case "evidence":
        return getEvidence(claimId, orgId);

      case "artifacts":
        return getArtifacts(claimId);

      default:
        return NextResponse.json({ error: "Invalid type" }, { status: 400 });
    }
  } catch (error) {
    if (error instanceof OrgScopeError) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }
    logger.error("[Assets GET] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST HANDLER - Upload/Create assets
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  try {
    const authResult = await requireApiAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { userId, orgId } = authResult;

    const { claimId } = await params;

    // Verify claim access
    const accessResult = await verifyClaimAccess(claimId, orgId!, userId!);
    if (accessResult instanceof NextResponse) return accessResult;

    // Check content type
    const contentType = req.headers.get("content-type") || "";

    if (contentType.includes("multipart/form-data")) {
      // Handle file upload
      return handleFileUpload(req, claimId, orgId!, userId!);
    } else {
      // Handle JSON action (artifact creation)
      return handleJsonAction(req, claimId, orgId!, userId!);
    }
  } catch (error) {
    logger.error("[Assets POST] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function getPhotos(claimId: string, orgId: string) {
  const photos = await prisma.file_assets.findMany({
    where: { claimId, orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    photos: photos.map((p) => ({
      id: p.id,
      filename: p.filename,
      url: p.publicUrl,
      category: p.category,
      note: p.note,
      mimeType: p.mimeType,
      sizeBytes: p.sizeBytes,
      createdAt: p.createdAt,
    })),
  });
}

async function getDocuments(claimId: string, aiReportsOnly: boolean) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereClause: any = {
    claimId,
    deletedAt: null,
  };

  if (aiReportsOnly) {
    whereClause.type = {
      in: ["WEATHER", "REBUTTAL", "DEPRECIATION", "SUPPLEMENT"],
    };
  }

  const documents = await prisma.documents.findMany({
    where: whereClause,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    success: true,
    documents: documents.map((doc) => ({
      id: doc.id,
      type: doc.type,
      title: doc.title,
      description: doc.description,
      url: doc.url,
      mimeType: doc.mimeType,
      fileSize: doc.sizeBytes,
      visibleToClient: doc.isPublic,
      createdAt: doc.createdAt,
    })),
  });
}

async function getEvidence(claimId: string, orgId: string) {
  const assets = await prisma.file_assets.findMany({
    where: { claimId, orgId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    collections: [],
    ungroupedAssets: assets.map((asset) => ({
      id: asset.id,
      fileName: asset.filename,
      mimeType: asset.mimeType,
      url: asset.publicUrl,
      createdAt: asset.createdAt,
    })),
    stats: {
      totalCollections: 0,
      totalAssets: assets.length,
      ungroupedCount: assets.length,
    },
  });
}

async function getArtifacts(claimId: string) {
  const artifacts = await prisma.ai_reports.findMany({
    where: { claimId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    artifacts: artifacts.map((a) => ({
      id: a.id,
      type: a.type,
      title: a.title,
      status: a.status,
      createdAt: a.createdAt,
    })),
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// POST HELPERS
// ─────────────────────────────────────────────────────────────────────────────

async function handleFileUpload(req: NextRequest, claimId: string, orgId: string, userId: string) {
  const formData = await req.formData();
  const file = formData.get("file") as File;
  const assetType = (formData.get("type") as string) || "photo";
  const caption = (formData.get("caption") as string) || "";
  const category = (formData.get("category") as string) || "damage";

  if (!file) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }

  // Enforce server-side file size limit (20MB)
  const MAX_FILE_SIZE = 20 * 1024 * 1024;
  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 20MB." }, { status: 400 });
  }

  // Validate file type based on asset type
  if (assetType === "photo" && !file.type.startsWith("image/")) {
    return NextResponse.json({ error: "File must be an image" }, { status: 400 });
  }

  // Read file buffer
  const buffer = Buffer.from(await file.arrayBuffer());
  const fileExtension = file.name.split(".").pop() || "bin";
  const s3Key = `claims/${claimId}/${assetType}s/${nanoid()}.${fileExtension}`;

  // Upload to S3
  await uploadBuffer(buffer, s3Key, file.type);

  // Create database record
  const asset = await prisma.file_assets.create({
    data: {
      id: nanoid(),
      claimId,
      orgId,
      ownerId: userId,
      filename: file.name,
      category: category,
      note: caption || undefined,
      storageKey: s3Key,
      // eslint-disable-next-line no-restricted-syntax
      bucket: process.env.S3_BUCKET || "preloss",
      // eslint-disable-next-line no-restricted-syntax
      publicUrl: `https://${process.env.S3_BUCKET}.s3.amazonaws.com/${s3Key}`,
      sizeBytes: file.size,
      mimeType: file.type,
      updatedAt: new Date(),
    },
  });

  return NextResponse.json({
    success: true,
    asset: {
      id: asset.id,
      filename: asset.filename,
      url: asset.publicUrl,
      category: asset.category,
      mimeType: asset.mimeType,
    },
  });
}

async function handleJsonAction(req: NextRequest, claimId: string, orgId: string, userId: string) {
  const body = await req.json();
  const { action } = body;

  if (action === "create_artifact") {
    const { type, title, content } = body;

    if (!type || !title) {
      return NextResponse.json({ error: "Missing required fields: type, title" }, { status: 400 });
    }

    const isJson = typeof content === "object";

    const artifact = await prisma.ai_reports.create({
      data: {
        orgId,
        claimId,
        createdByUserId: userId,
        type: type.toUpperCase(),
        title,
        contentJson: isJson ? content : null,
        contentText: isJson ? null : String(content || ""),
        status: "DRAFT",
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
    });

    return NextResponse.json({ success: true, artifact }, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
