import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

/**
 * GET /api/claims/[claimId]/documents
 * Fetch all documents for a claim from file_assets table (Prisma-managed)
 */
export const GET = withAuth(
  async (req: NextRequest, { orgId }, routeParams: { params: Promise<{ claimId: string }> }) => {
    try {
      const { claimId } = await routeParams.params;

      // Verify claim belongs to org (uses DB-backed orgId)
      await getOrgClaimOrThrow(orgId, claimId);

      // Use Prisma-managed file_assets table instead of raw SQL claim_documents
      const assets = await prisma.file_assets.findMany({
        where: { claimId, orgId },
        orderBy: { createdAt: "desc" },
        select: {
          id: true,
          filename: true,
          publicUrl: true,
          mimeType: true,
          sizeBytes: true,
          category: true,
          note: true,
          visibleToClient: true,
          createdAt: true,
          ownerId: true,
        },
      });

      // Map category to document type
      const categoryToType = (cat: string, mime: string): string => {
        if (mime?.startsWith("image/")) return "PHOTO";
        const map: Record<string, string> = {
          report: "DEPRECIATION",
          supplement: "SUPPLEMENT",
          certificate: "CERTIFICATE",
          invoice: "INVOICE",
          contract: "CONTRACT",
        };
        return map[cat] || "OTHER";
      };

      const documents = assets.map((doc) => ({
        id: doc.id,
        type: categoryToType(doc.category, doc.mimeType),
        title: doc.filename,
        description: doc.note,
        publicUrl: doc.publicUrl,
        mimeType: doc.mimeType,
        fileSize: doc.sizeBytes,
        visibleToClient: doc.visibleToClient,
        createdAt: doc.createdAt.toISOString(),
        createdBy: {
          name: doc.ownerId || "System",
          email: "",
        },
      }));

      return NextResponse.json({ documents });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.warn("[GET /api/claims/[claimId]/documents] Error:", error);
      return NextResponse.json({ documents: [] });
    }
  }
);

/**
 * POST /api/claims/[claimId]/documents
 * Upload a document for a claim — stores in Supabase, registers in file_assets
 */
export const POST = withAuth(
  async (
    req: NextRequest,
    { userId, orgId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;

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

      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const maxSize = 20 * 1024 * 1024; // 20MB
      const allowed = [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
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
      const filePath = `${orgId}/${claimId}/${timestamp}-${uuid}.${ext}`;
      const bucket = "claim-documents";

      const { data: buckets } = await supabase.storage.listBuckets();
      if (!buckets?.some((b: { name: string }) => b.name === bucket)) {
        await supabase.storage.createBucket(bucket, { public: true, fileSizeLimit: maxSize });
      }

      const { error: uploadError } = await supabase.storage
        .from(bucket)
        .upload(filePath, buffer, { contentType: file.type, upsert: true });

      if (uploadError) {
        logger.error("[Documents POST] Supabase upload error:", uploadError);
        return NextResponse.json({ error: "Upload failed" }, { status: 500 });
      }

      const {
        data: { publicUrl },
      } = supabase.storage.from(bucket).getPublicUrl(filePath);

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
          category: "document",
          source: "user",
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        document: {
          id: asset.id,
          filename: asset.filename,
          publicUrl,
          mimeType: asset.mimeType,
          sizeBytes: asset.sizeBytes,
          createdAt: asset.createdAt,
        },
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[Documents POST] Error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }
  }
);

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
