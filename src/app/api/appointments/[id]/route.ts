export const dynamic = "force-dynamic";

import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  const ctx = await safeOrgContext();

  if (ctx.status !== "ok" || !ctx.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { id } = params;

    // Verify Appointment belongs to user's org
    const existing = await prisma.appointments.findFirst({
      where: {
        id,
        orgId: ctx.orgId,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Appointment not found or access denied" },
        { status: 404 }
      );
    }

    await prisma.appointments.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    logger.error("Error deleting Appointment:", error);
    return NextResponse.json({ error: "Failed to delete Appointment" }, { status: 500 });
  }
}
