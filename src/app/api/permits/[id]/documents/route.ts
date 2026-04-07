export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Permit Documents API
 * GET    /api/permits/[id]/documents — List documents for a permit
 * POST   /api/permits/[id]/documents — Add a document record (after upload)
 * DELETE /api/permits/[id]/documents?docId=xxx — Remove a document
 */

import { NextRequest } from "next/server";

import { apiError, apiOk } from "@/lib/apiError";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

// ---------------------------------------------------------------------------
// GET — List all documents for a permit
// ---------------------------------------------------------------------------
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId)
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    logger.info("[PERMIT_DOCS_LIST]", { permitId: id, orgId: ctx.orgId });

    // Verify permit belongs to org
    const permit = await prisma.permits.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, jobId: true, claimId: true },
    });
    if (!permit) return apiError(404, "NOT_FOUND", "Permit not found");

    const documents = await prisma.permit_documents.findMany({
      where: { permitId: id, orgId: ctx.orgId },
      orderBy: { createdAt: "desc" },
    });

    return apiOk({
      documents: documents.map((d) => ({
        ...d,
        sizeBytes: d.sizeBytes ? Number(d.sizeBytes) : null,
      })),
    });
  } catch (err: any) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}

// ---------------------------------------------------------------------------
// POST — Add a document to a permit (and optionally link to job/claim)
// ---------------------------------------------------------------------------
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId)
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    logger.info("[PERMIT_DOCS_CREATE]", { permitId: id, orgId: ctx.orgId });

    const body = await req.json().catch(() => null);
    if (!body) return apiError(400, "INVALID_BODY", "Invalid JSON");

    const { title, url, mimeType, sizeBytes, category, notes, linkToJob } = body;
    if (!title || !url) {
      return apiError(400, "VALIDATION_ERROR", "title and url are required");
    }

    // Verify permit belongs to org
    const permit = await prisma.permits.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true, jobId: true, claimId: true },
    });
    if (!permit) return apiError(404, "NOT_FOUND", "Permit not found");

    // Create the permit document
    const doc = await prisma.permit_documents.create({
      data: {
        permitId: id,
        orgId: ctx.orgId,
        title,
        url,
        mimeType: mimeType || null,
        sizeBytes: sizeBytes ? BigInt(sizeBytes) : null,
        category: category || "permit",
        uploadedBy: ctx.userId || null,
        notes: notes || null,
      },
    });

    // If linkToJob is true AND permit is linked to a job/claim, also create
    // a document_links entry so the doc shows up in the job's Documents tab
    if (linkToJob !== false && (permit.jobId || permit.claimId)) {
      try {
        await prisma.document_links.create({
          data: {
            orgId: ctx.orgId,
            sourceType: "permit",
            sourceId: id,
            jobId: permit.jobId || null,
            claimId: permit.claimId || null,
            title,
            url,
            mimeType: mimeType || null,
            sizeBytes: sizeBytes ? BigInt(sizeBytes) : null,
            category: category || "permit",
            createdBy: ctx.userId || null,
          },
        });
      } catch {
        // Non-fatal — permit doc saved successfully, link is secondary
      }
    }

    return apiOk({
      document: {
        ...doc,
        sizeBytes: doc.sizeBytes ? Number(doc.sizeBytes) : null,
      },
    });
  } catch (err: any) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}

// ---------------------------------------------------------------------------
// DELETE — Remove a document from a permit
// ---------------------------------------------------------------------------
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId)
      return apiError(401, "UNAUTHORIZED", "Authentication required");
    logger.info("[PERMIT_DOCS_DELETE]", { permitId: id, orgId: ctx.orgId });

    const url = new URL(req.url);
    const docId = url.searchParams.get("docId");
    if (!docId) return apiError(400, "VALIDATION_ERROR", "docId is required");

    // Verify permit belongs to org
    const permit = await prisma.permits.findFirst({
      where: { id, orgId: ctx.orgId },
      select: { id: true },
    });
    if (!permit) return apiError(404, "NOT_FOUND", "Permit not found");

    // Delete the doc (only if it belongs to this permit + org)
    const existing = await prisma.permit_documents.findFirst({
      where: { id: docId, permitId: id, orgId: ctx.orgId },
    });
    if (!existing) return apiError(404, "NOT_FOUND", "Document not found");

    await prisma.permit_documents.delete({ where: { id: docId } });

    // Also clean up any linked document_links entry with same URL
    try {
      await prisma.document_links.deleteMany({
        where: {
          orgId: ctx.orgId,
          sourceType: "permit",
          sourceId: id,
          url: existing.url,
        },
      });
    } catch {
      // Non-fatal
    }

    return apiOk({ deleted: true });
  } catch (err: any) {
    return apiError(500, "INTERNAL_ERROR", err.message);
  }
}
