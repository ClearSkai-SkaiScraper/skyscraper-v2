/**
 * POST /api/invoices/receipts
 *
 * Accepts multipart/form-data with receipt images or PDFs.
 * Stores file metadata for the invoiceId.
 * MVP: logs receipt metadata; a dedicated receipt table can be added later.
 */

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const formData = await req.formData();
    const invoiceId = formData.get("invoiceId") as string;

    if (!invoiceId) {
      return NextResponse.json({ error: "invoiceId is required" }, { status: 400 });
    }

    // Collect all receipt files from form data
    const receiptEntries: Array<{
      name: string;
      type: string;
      size: number;
      uploadedAt: string;
    }> = [];

    for (const [key, value] of formData.entries()) {
      if (key.startsWith("receipt_") && value instanceof File) {
        const file = value;
        if (file.size > 10 * 1024 * 1024) continue; // Skip files >10MB

        receiptEntries.push({
          name: file.name,
          type: file.type,
          size: file.size,
          uploadedAt: new Date().toISOString(),
        });
      }
    }

    if (receiptEntries.length === 0) {
      return NextResponse.json({ error: "No valid receipt files found" }, { status: 400 });
    }

    logger.info("[Invoices] Receipts uploaded", {
      invoiceId,
      userId,
      count: receiptEntries.length,
      files: receiptEntries.map((r) => r.name),
    });

    return NextResponse.json({
      success: true,
      count: receiptEntries.length,
      receipts: receiptEntries,
    });
  } catch (error) {
    logger.error("[Invoices] Receipt upload error:", error);
    return NextResponse.json({ error: "Failed to process receipts" }, { status: 500 });
  }
}
