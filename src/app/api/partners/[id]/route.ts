export const dynamic = "force-dynamic";

// app/api/partners/[id]/route.ts — migrated to withOrgScope (DB-verified orgId)
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { withOrgScope } from "@/lib/auth/tenant";
import prisma from "@/lib/prisma";

export const GET = withOrgScope(
  async (req: Request, { orgId }, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;
      const partner = await prisma.partner.findFirst({
        where: { id, orgId },
      });

      if (!partner) {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 });
      }

      return NextResponse.json(partner);
    } catch (error) {
      logger.error("Failed to fetch Partner:", error);
      return NextResponse.json({ error: "Failed to fetch Partner" }, { status: 500 });
    }
  }
);

export const PATCH = withOrgScope(
  async (req: Request, { orgId }, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;

      const body = await req.json();
      const { name, trade, email, phone, website, address, notes } = body;

      const partner = await prisma.$transaction(async (tx) => {
        const check = await tx.partner.findFirst({ where: { id, orgId } });
        if (!check) return null;
        return tx.partner.update({
          where: { id },
          data: {
            ...(name && { name }),
            ...(trade && { trade }),
            email: email ?? check.email,
            phone: phone ?? check.phone,
            website: website ?? check.website,
            address: address ?? check.address,
            notes: notes ?? check.notes,
          },
        });
      });
      if (!partner) {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 });
      }

      return NextResponse.json(partner);
    } catch (error) {
      logger.error("Failed to update Partner:", error);
      return NextResponse.json({ error: "Failed to update Partner" }, { status: 500 });
    }
  }
);

export const DELETE = withOrgScope(
  async (req: Request, { orgId }, context: { params: Promise<{ id: string }> }) => {
    try {
      const { id } = await context.params;

      const result = await prisma.partner.deleteMany({ where: { id, orgId } });
      if (result.count === 0) {
        return NextResponse.json({ error: "Partner not found" }, { status: 404 });
      }

      return NextResponse.json({ success: true });
    } catch (error) {
      logger.error("Failed to delete Partner:", error);
      return NextResponse.json({ error: "Failed to delete Partner" }, { status: 500 });
    }
  }
);
