/**
 * Portal Appointments API
 * Allows clients to request inspection appointments
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { requirePortalAuth } from "@/lib/auth/requirePortalAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const appointmentSchema = z.object({
  claimId: z.string().min(1),
  date: z.string().min(1),
  time: z.string().min(1),
  type: z.enum(["in-person", "video"]),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    // Parse body first
    const body = await req.json();
    const parsed = appointmentSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: "Invalid request", details: parsed.error.flatten() },
        { status: 400 }
      );
    }

    const { claimId, date, time, type, notes } = parsed.data;

    // Verify portal auth and claim access
    const authResult = await requirePortalAuth({ claimId });
    if (authResult instanceof NextResponse) return authResult;
    const { userId, email, orgId, claim } = authResult;

    if (!orgId || !claim) {
      return NextResponse.json({ error: "Claim not found" }, { status: 404 });
    }

    // Create appointment request
    const appointmentId = createId();

    // Parse date and time into a proper DateTime
    const timeParts = time.match(/(\d{1,2}):?(\d{2})?\s*(am|pm)?/i);
    let hour = parseInt(timeParts?.[1] || "9");
    const minutes = parseInt(timeParts?.[2] || "0");
    const isPM = timeParts?.[3]?.toLowerCase() === "pm";
    if (isPM && hour !== 12) hour += 12;
    if (!isPM && hour === 12) hour = 0;

    const scheduledAt = new Date(date);
    scheduledAt.setHours(hour, minutes, 0, 0);

    // Create the appointment as a task for the contractor
    await prisma.tasks.create({
      data: {
        id: appointmentId,
        orgId,
        title: `Appointment Request: ${type === "video" ? "Video Call" : "Property Inspection"}`,
        description: `Client (${email}) has requested an appointment.\n\nDate: ${date}\nTime: ${time}\nType: ${type}\n${notes ? `Notes: ${notes}` : ""}`,
        status: "TODO",
        priority: "HIGH",
        dueAt: scheduledAt,
        claimId: claim.id,
        updatedAt: new Date(),
      },
    });

    logger.info("[PORTAL_APPOINTMENT] Created appointment request", {
      appointmentId,
      userId,
      claimId,
      date,
      time,
      type,
    });

    return NextResponse.json({
      success: true,
      appointmentId,
      message: "Appointment request submitted. You'll receive a confirmation shortly.",
    });
  } catch (error) {
    logger.error("[PORTAL_APPOINTMENT] Error creating appointment:", error);
    return NextResponse.json({ error: "Failed to create appointment request" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const authResult = await requirePortalAuth();
    if (authResult instanceof NextResponse) return authResult;
    const { email } = authResult;

    // Get appointments for claims this user has access to
    const clientAccess = await prisma.client_access.findMany({
      where: { email },
      select: { claimId: true },
    });

    const claimIds = clientAccess.map((ca) => ca.claimId);

    // Get tasks that are appointment requests for these claims
    const appointments = await prisma.tasks.findMany({
      where: {
        claimId: { in: claimIds },
        title: { contains: "Appointment Request" },
      },
      orderBy: { dueAt: "asc" },
      take: 10,
    });

    return NextResponse.json({ appointments });
  } catch (error) {
    logger.error("[PORTAL_APPOINTMENT] Error fetching appointments:", error);
    return NextResponse.json({ error: "Failed to fetch appointments" }, { status: 500 });
  }
}
