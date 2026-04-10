export const dynamic = "force-dynamic";

import fs from "fs";
import { marked } from "marked";
import { NextResponse } from "next/server";
import path from "path";

import { LEGAL_DOCUMENTS } from "@/lib/legal/config";
import { logger } from "@/lib/logger";

interface Params {
  params: Promise<{ docId: string }>;
}

/**
 * GET /api/legal/document/[docId]
 * Fetches a legal document's content rendered as HTML
 */
export async function GET(request: Request, { params }: Params) {
  try {
    const { docId } = await params;

    // Find document config
    const docConfig = LEGAL_DOCUMENTS.find((d) => d.id === docId);

    if (!docConfig) {
      return NextResponse.json({ error: "Document not found" }, { status: 404 });
    }

    // Build path to legal document
    const docPath = path.join(process.cwd(), "legal", docId, docConfig.latestVersion, "legal.md");

    // Check if file exists
    if (!fs.existsSync(docPath)) {
      logger.error(`[Legal Document] File not found: ${docPath}`);
      return NextResponse.json({ error: "Document file not found" }, { status: 404 });
    }

    // Read and parse markdown
    const markdown = fs.readFileSync(docPath, "utf-8");
    // eslint-disable-next-line @typescript-eslint/await-thenable
    const html = await marked(markdown);

    return NextResponse.json({
      id: docConfig.id,
      title: docConfig.title,
      version: docConfig.latestVersion,
      content: html,
      required: docConfig.required,
      audience: docConfig.audience,
    });
  } catch (error) {
    logger.error("[Legal Document] Error:", error);
    return NextResponse.json({ error: "Failed to fetch document" }, { status: 500 });
  }
}
