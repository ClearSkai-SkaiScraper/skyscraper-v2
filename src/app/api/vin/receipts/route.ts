/**
 * VIN — Receipt Ingestion API
 * POST /api/vin/receipts — Upload and parse receipt
 * GET  /api/vin/receipts — Get parsed receipts
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const claimId = searchParams.get("claimId");
    const supplier = searchParams.get("supplier");

    const where: Record<string, unknown> = { orgId: ctx.orgId };
    if (claimId) where.claimId = claimId;
    if (supplier) where.supplier = supplier;

    const receipts = await prisma.material_receipts.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return NextResponse.json({
      success: true,
      receipts: receipts.map((r) => ({
        id: r.id,
        supplier: r.supplier,
        receiptNumber: r.receiptNumber,
        receiptUrl: r.receiptUrl,
        purchaseDate: r.purchaseDate,
        subtotal: r.subtotal ? Number(r.subtotal) : null,
        tax: r.tax ? Number(r.tax) : null,
        total: r.total ? Number(r.total) : null,
        paymentMethod: r.paymentMethod,
        parsedItems: r.parsedItems,
        eta: r.eta,
        trackingNumber: r.trackingNumber,
        status: r.status,
        parseConfidence: r.parseConfidence ? Number(r.parseConfidence) : null,
        createdAt: r.createdAt,
      })),
    });
  } catch (error) {
    logger.error("[VIN Receipts] Error:", error);
    return NextResponse.json({ error: "Failed to fetch receipts" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const {
      supplier,
      receiptNumber,
      receiptUrl,
      purchaseDate,
      subtotal,
      tax,
      total,
      paymentMethod,
      parsedItems,
      rawText,
      trackingNumber,
      eta,
      orderId,
      claimId,
    } = body;

    if (!supplier) {
      return NextResponse.json({ error: "Supplier is required" }, { status: 400 });
    }

    // Auto-parse receipt text if raw text is provided
    let autoParseConfidence = 0;
    let autoParsedItems = parsedItems || [];

    if (rawText && !parsedItems) {
      // Simple line-item extraction (production would use OpenAI Vision)
      const lines = rawText.split("\n").filter((l: string) => l.trim());
      autoParsedItems = lines
        .filter((line: string) => /\$[\d.,]+/.test(line))
        .map((line: string, idx: number) => {
          const priceMatch = line.match(/\$([\d.,]+)/);
          const price = priceMatch ? parseFloat(priceMatch[1].replace(",", "")) : 0;
          const name = line.replace(/\$[\d.,]+/g, "").trim();
          return { lineNumber: idx + 1, name, price, quantity: 1 };
        });
      autoParseConfidence = autoParsedItems.length > 0 ? 0.75 : 0.1;
    }

    const receipt = await prisma.material_receipts.create({
      data: {
        orgId: ctx.orgId,
        orderId,
        claimId,
        supplier,
        receiptNumber,
        receiptUrl,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
        subtotal,
        tax,
        total,
        paymentMethod,
        parsedItems: autoParsedItems,
        rawText,
        parseConfidence: autoParseConfidence || undefined,
        trackingNumber,
        eta: eta ? new Date(eta) : undefined,
        status: autoParsedItems.length > 0 ? "parsed" : "pending",
      },
    });

    // Create workflow event
    await prisma.vendor_workflow_events.create({
      data: {
        orgId: ctx.orgId,
        eventType: "receipt_parsed",
        entityType: "material_receipt",
        entityId: receipt.id,
        claimId,
        payload: {
          supplier,
          total,
          itemCount: autoParsedItems.length,
          parseConfidence: autoParseConfidence,
        },
      },
    });

    return NextResponse.json({ success: true, receipt });
  } catch (error) {
    logger.error("[VIN Receipts] Error:", error);
    return NextResponse.json({ error: "Failed to create receipt" }, { status: 500 });
  }
}
