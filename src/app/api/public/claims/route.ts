import { NextResponse } from "next/server";

import { ensurePublicDemoOrg } from "@/lib/demo/ensurePublicDemo";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { toPlainJSON } from "@/lib/serialize";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const orgId = await ensurePublicDemoOrg();
    if (!orgId) {
      return NextResponse.json({ success: false, error: "DEMO_ORG_UNAVAILABLE" }, { status: 503 });
    }

    const claims = await prisma.claims.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        carrier: true,
        estimatedValue: true,
        dateOfLoss: true,
        updatedAt: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
            contacts: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        },
      },
    });

    const dto = claims.map((claim) => {
      const contact = claim.properties?.contacts;
      const insured_name = contact
        ? [contact.firstName, contact.lastName].filter(Boolean).join(" ")
        : null;
      const propertyAddress = [
        claim.properties?.street,
        claim.properties?.city,
        claim.properties?.state,
        claim.properties?.zipCode,
      ]
        .filter(Boolean)
        .join(", ")
        .replace(/,\s,/, ", ");

      return toPlainJSON({
        id: claim.id,
        claimNumber: claim.claimNumber,
        insured_name,
        status: claim.status,
        carrier: claim.carrier,
        estimatedValue: claim.estimatedValue,
        propertyAddress: propertyAddress || null,
        lossDate: claim.dateOfLoss,
        updatedAt: claim.updatedAt,
      });
    });

    if (dto.length === 0) {
      const now = new Date();
      dto.push({
        id: "test",
        claimNumber: "CLM-DEMO-001",
        insured_name: "John Smith",
        status: "active",
        carrier: "Demo Carrier",
        estimatedValue: 0,
        propertyAddress: "123 Demo St, Phoenix, AZ 85001",
        lossDate: now.toISOString(),
        updatedAt: now.toISOString(),
      });
    }

    return NextResponse.json({ success: true, claims: dto });
  } catch (error) {
    logger.error("[api/public/claims] error", error);
    return NextResponse.json(
      {
        success: false,
        error: "INTERNAL_ERROR",
        message: error?.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
