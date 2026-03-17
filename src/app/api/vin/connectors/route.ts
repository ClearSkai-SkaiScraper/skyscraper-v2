/**
 * VIN — Supplier Connectors API
 * GET  /api/vin/connectors — List org's supplier connectors
 * POST /api/vin/connectors — Create/configure a connector
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import { getActiveOrgContext } from "@/lib/org/getActiveOrgContext";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const connectors = await prisma.supplier_connectors.findMany({
      where: { orgId: ctx.orgId },
      orderBy: { supplier: "asc" },
      include: {
        Vendor: {
          select: { id: true, name: true, slug: true, logo: true },
        },
      },
    });

    return NextResponse.json({
      success: true,
      connectors: connectors.map((c) => ({
        id: c.id,
        supplier: c.supplier,
        authType: c.authType,
        isActive: c.isActive,
        lastSyncAt: c.lastSyncAt,
        syncStatus: c.syncStatus,
        vendor: c.Vendor,
        createdAt: c.createdAt,
      })),
    });
  } catch (error) {
    logger.error("[VIN Connectors] Error:", error);
    return NextResponse.json({ error: "Failed to fetch connectors" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getActiveOrgContext();
    if (!ctx.ok) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { supplier, authType, vendorId, config } = body;

    if (!supplier) {
      return NextResponse.json({ error: "Supplier is required" }, { status: 400 });
    }

    const connector = await prisma.supplier_connectors.upsert({
      where: {
        orgId_supplier: {
          orgId: ctx.orgId,
          supplier,
        },
      },
      create: {
        orgId: ctx.orgId,
        supplier,
        authType: authType || "api_key",
        vendorId,
        config: config || {},
        isActive: true,
        syncStatus: "idle",
      },
      update: {
        authType: authType || undefined,
        vendorId: vendorId || undefined,
        config: config || undefined,
        isActive: true,
      },
    });

    return NextResponse.json({ success: true, connector });
  } catch (error) {
    logger.error("[VIN Connectors] Error:", error);
    return NextResponse.json({ error: "Failed to configure connector" }, { status: 500 });
  }
}
