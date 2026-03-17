/**
 * Portal Claims Assets - Unified handler for documents, artifacts, timeline
 *
 * GET /api/portal/claims/[claimId]/assets?type=documents|artifacts|timeline|all
 * POST /api/portal/claims/[claimId]/assets - Upload files
 *
 * NOTE: Uses real Prisma models:
 *   - GeneratedArtifact (claimId) for AI-generated reports/packets
 *   - claim_activities (claim_id) for timeline events
 *   - Supabase Storage for file uploads
 */

import { NextRequest, NextResponse } from "next/server";

import { assertPortalAccess } from "@/lib/auth/portalAccess";
import { isPortalAuthError, requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logger } from "@/lib/observability/logger";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";
import { getStorageClient } from "@/lib/storage/client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AssetType = "documents" | "artifacts" | "timeline" | "all";

export async function GET(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const authResult = await requirePortalAuth();
  if (isPortalAuthError(authResult)) return authResult;
  const { userId } = authResult;

  // Rate limit portal requests
  const rl = await checkRateLimit(userId, "API");
  if (!rl.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const { claimId } = await params;
    await assertPortalAccess({ userId, claimId });

    const { searchParams } = new URL(req.url);
    const type = (searchParams.get("type") || "all") as AssetType;

    const result: Record<string, any> = {};

    // Fetch generated artifacts (AI reports, packets, summaries)
    if (type === "artifacts" || type === "documents" || type === "all") {
      const artifacts = await prisma.generatedArtifact
        .findMany({
          where: { claimId },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            title: true,
            type: true,
            fileUrl: true,
            status: true,
            createdAt: true,
          },
        })
        .catch(() => []);
      result.artifacts = artifacts;

      // Also provide as "documents" for compatibility
      if (type === "documents" || type === "all") {
        result.documents = artifacts.map((a) => ({
          id: a.id,
          name: a.title,
          url: a.fileUrl,
          fileType: a.type,
          category: a.type,
          createdAt: a.createdAt,
        }));
      }
    }

    // Fetch timeline events from claim_activities
    if (type === "timeline" || type === "all") {
      const events = await prisma.claim_activities
        .findMany({
          where: { claim_id: claimId },
          orderBy: { created_at: "desc" },
          take: 50,
          select: {
            id: true,
            type: true,
            message: true,
            created_at: true,
            user_id: true,
          },
        })
        .catch(() => []);

      result.timeline = events.map((e) => ({
        id: e.id,
        title: e.type,
        description: e.message,
        eventType: e.type,
        createdAt: e.created_at,
        createdBy: e.user_id,
      }));
    }

    // Photos: list from Supabase Storage if available
    if (type === "all") {
      const supabase = getStorageClient();
      if (supabase) {
        const { data: files } = await supabase.storage
          .from("claim-photos")
          .list(`${claimId}/`, { limit: 100 })
          .catch(() => ({ data: null }));

        result.photos = (files || []).map((f) => {
          const {
            data: { publicUrl },
          } = supabase.storage.from("claim-photos").getPublicUrl(`${claimId}/${f.name}`);
          return {
            id: f.id || f.name,
            url: publicUrl,
            caption: f.name,
            createdAt: f.created_at,
          };
        });
      } else {
        result.photos = [];
      }
    }

    return NextResponse.json(result);
  } catch (error: any) {
    logger.error("[Portal Claims Assets] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ claimId: string }> }) {
  const authResult = await requirePortalAuth();
  if (isPortalAuthError(authResult)) return authResult;
  const { userId } = authResult;

  // Rate limit portal uploads
  const rlPost = await checkRateLimit(userId, "UPLOAD");
  if (!rlPost.success) return NextResponse.json({ error: "Rate limit exceeded" }, { status: 429 });

  try {
    const { claimId } = await params;
    await assertPortalAccess({ userId, claimId });

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const category = (formData.get("category") as string) || "general";
    const caption = (formData.get("caption") as string) || "";

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }

    const supabase = getStorageClient();
    if (!supabase) {
      return NextResponse.json({ error: "Storage not configured" }, { status: 503 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const ext = file.name.split(".").pop() || "bin";
    const timestamp = Date.now();
    const randomStr = crypto.randomUUID().replace(/-/g, "").slice(0, 13);
    const storagePath = `${claimId}/${category}_${timestamp}-${randomStr}.${ext}`;

    const { data, error } = await supabase.storage
      .from("portal-uploads")
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      logger.error("[Portal Claims Assets Upload] Storage error:", error);
      return NextResponse.json({ error: "Upload failed" }, { status: 500 });
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from("portal-uploads").getPublicUrl(data.path);

    logger.info(`[Portal Claims Assets] Uploaded: ${storagePath}`);

    return NextResponse.json({
      success: true,
      file: {
        url: publicUrl,
        name: file.name,
        size: file.size,
        type: file.type,
        category,
        caption,
      },
    });
  } catch (error: any) {
    logger.error("[Portal Claims Assets Upload] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
