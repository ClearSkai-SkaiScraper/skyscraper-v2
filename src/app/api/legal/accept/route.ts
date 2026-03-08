export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { LEGAL_DOCUMENTS } from "@/lib/legal/config";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId } = await auth();
    logger.debug("[Legal Accept] Starting - userId:", userId);

    if (!userId) {
      logger.error("[Legal Accept] No userId - unauthorized");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      logger.error("[Legal Accept] Invalid JSON body");
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    // Support bulk acceptance: { documents: [{ documentId, version }] }
    // or single: { documentId, version }
    const documents: Array<{ documentId: string; version: string }> = body.documents
      ? body.documents
      : body.documentId
        ? [{ documentId: body.documentId, version: body.version }]
        : [];

    if (documents.length === 0) {
      logger.error("[Legal Accept] No documents provided");
      return NextResponse.json({ error: "Missing documentId or version" }, { status: 400 });
    }

    // Validate all documents before accepting any
    for (const doc of documents) {
      if (!doc.documentId || !doc.version) {
        return NextResponse.json(
          { error: `Missing documentId or version in: ${JSON.stringify(doc)}` },
          { status: 400 }
        );
      }
      const docConfig = LEGAL_DOCUMENTS.find((d) => d.id === doc.documentId);
      if (!docConfig) {
        return NextResponse.json({ error: "Unknown document: " + doc.documentId }, { status: 404 });
      }
      if (doc.version !== docConfig.latestVersion) {
        return NextResponse.json(
          {
            error: `Version mismatch for ${doc.documentId}. Expected ${docConfig.latestVersion}, got ${doc.version}`,
          },
          { status: 400 }
        );
      }
    }

    // Upsert all acceptances
    logger.debug(`[Legal Accept] Upserting ${documents.length} acceptances...`);
    const acceptances: any[] = [];
    for (const doc of documents) {
      const acceptance = await (prisma.legal_acceptances as any).upsert({
        where: {
          userId_documentId_version: {
            userId,
            documentId: doc.documentId,
            version: doc.version,
          },
        },
        create: {
          id: crypto.randomUUID(),
          userId,
          documentId: doc.documentId,
          version: doc.version,
        },
        update: {
          acceptedAt: new Date(),
        },
      });
      acceptances.push(acceptance as any);
    }

    logger.info("[Legal Accept] ✅ Success:", {
      userId,
      count: acceptances.length,
      documents: documents.map((d) => d.documentId),
    });

    return NextResponse.json({ ok: true, acceptances, count: acceptances.length });
  } catch (error) {
    logger.error("[Legal Accept] ❌ Error:", {
      message: "Internal server error",
      stack: error.stack,
      name: error.name,
    });
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
