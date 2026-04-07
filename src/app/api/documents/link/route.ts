export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Universal Document Linking API
 * POST   /api/documents/link   — Link a document to a job/claim
 * GET    /api/documents/link?jobId=xxx or ?claimId=xxx — List linked docs
 * DELETE /api/documents/link?id=xxx — Remove a link
 *
 * This powers the "attach to job docs" feature across all pages:
 * Permits, Material Estimates, Reports, etc.
 */

import { NextRequest } from "next/server";

import { apiError, apiOk } from "@/lib/apiError";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { logger } from "@/lib/logger";

// ---------------------------------------------------------------------------
// GET — List document links for a job or claim
// ---------------------------------------------------------------------------
export async function GET(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId)
      return apiError(401, "UNAUTHORIZED", "Authentication required");

    const url = new URL(req.url);
    const jobId = url.searchParams.get("jobId");
    const claimId = url.searchParams.get("claimId");
    const sourceType = url.searchParams.get("sourceType");
    const sourceId = url.searchParams.get("sourceId");

    const where: any = { orgId: ctx.orgId };

    if (jobId) where.jobId = jobId;
    if (claimId) where.claimId = claimId;
    if (sourceType) where.sourceType = sourceType;
    if (sourceId) where.sourceId = sourceId;

    // At least one filter is required
    if (!jobId && !claimId && !sourceType) {
      return apiError(400, "VALIDATION_ERROR", "jobId, claimId, or sourceType is required");
    }

    const links = await prisma.document_links.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return apiOk({
      documents: links.map((d) => ({
        ...d,
        sizeBytes: d.sizeBytes ? Number(d.sizeBytes) : null,
      })),
    });
  } catch (err: any) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}

// ---------------------------------------------------------------------------
// POST — Create a document link (attach doc to job/claim)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId)
      return apiError(401, "UNAUTHORIZED", "Authentication required");

    const body = await req.json().catch(() => null);
    if (!body) return apiError(400, "INVALID_BODY", "Invalid JSON");

    const { sourceType, sourceId, jobId, claimId, title, url, mimeType, sizeBytes, category } =
      body;

    if (!sourceType || !sourceId || !title || !url) {
      return apiError(400, "VALIDATION_ERROR", "sourceType, sourceId, title, and url are required");
    }

    if (!jobId && !claimId) {
      return apiError(400, "VALIDATION_ERROR", "jobId or claimId is required to link a document");
    }

    const link = await prisma.document_links.create({
      data: {
        orgId: ctx.orgId,
        sourceType,
        sourceId,
        jobId: jobId || null,
        claimId: claimId || null,
        title,
        url,
        mimeType: mimeType || null,
        sizeBytes: sizeBytes ? BigInt(sizeBytes) : null,
        category: category || "document",
        createdBy: ctx.userId || null,
      },
    });

    return apiOk({
      link: {
        ...link,
        sizeBytes: link.sizeBytes ? Number(link.sizeBytes) : null,
      },
    });
  } catch (err: any) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}

// ---------------------------------------------------------------------------
// DELETE — Remove a document link
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId)
      return apiError(401, "UNAUTHORIZED", "Authentication required");

    const url = new URL(req.url);
    const id = url.searchParams.get("id");
    if (!id) return apiError(400, "VALIDATION_ERROR", "id is required");

    const existing = await prisma.document_links.findFirst({
      where: { id, orgId: ctx.orgId },
    });
    if (!existing) return apiError(404, "NOT_FOUND", "Document link not found");

    await prisma.document_links.delete({ where: { id } });
    return apiOk({ deleted: true });
  } catch (err: any) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}
