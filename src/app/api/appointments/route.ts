import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { createAppointmentSchema } from "@/lib/validation/appointment-schemas";
import { validateBody } from "@/lib/validation/middleware";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const ctx = await safeOrgContext();

  if (ctx.status !== "ok" || !ctx.orgId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await validateBody(req, createAppointmentSchema);
    if (body instanceof NextResponse) return body;
    const { title, description, startTime, endTime, location, leadId, claimId, contactId, notes } =
      body;

    const appointment = await prisma.appointments.create({
      data: {
        title,
        description: description || null,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        location: location || null,
        leadId: leadId || null,
        claimId: claimId || null,
        contactId: contactId || null,
        orgId: ctx.orgId,
        assignedTo: ctx.userId || null,
        status: "scheduled",
        notes: notes || null,
      },
    });

    return NextResponse.json({ success: true, data: appointment }, { status: 201 });
  } catch (error) {
    logger.error("Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment" }, { status: 500 });
  }
}
