import { NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const ctx = await safeOrgContext();

  if (ctx.status !== "ok") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const statusFilter = searchParams.get("status");

  // Fetch appointments from the appointments table
  const appointments = await prisma.appointments.findMany({
    where: { orgId: ctx.orgId! },
    orderBy: { startTime: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      startTime: true,
      endTime: true,
      location: true,
      leadId: true,
      claimId: true,
      status: true,
      notes: true,
    },
  });

  // Get lead IDs to fetch associated data
  const leadIds = appointments.map((apt) => apt.leadId).filter(Boolean) as string[];
  const leads = await prisma.leads.findMany({
    where: { id: { in: leadIds } },
    select: {
      id: true,
      title: true,
      contactId: true,
    },
  });
  const leadsById = new Map(leads.map((l) => [l.id, l]));

  // Get contact data
  const contactIds = leads.map((l) => l.contactId).filter(Boolean);
  const contacts = await prisma.contacts.findMany({
    where: { id: { in: contactIds } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });
  const contactsById = new Map(contacts.map((c) => [c.id, c]));

  // Transform appointments to match expected format
  const data = appointments
    .map((apt) => {
      const lead = apt.leadId ? leadsById.get(apt.leadId) : null;
      const contact = lead ? contactsById.get(lead.contactId) : null;

      return {
        id: apt.id,
        title: apt.title,
        scheduledFor: apt.startTime.toISOString(),
        status: apt.status.toUpperCase(),
        contractorName: contact
          ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
          : undefined,
        propertyAddress:
          apt.location ||
          (contact
            ? [contact.street, contact.city, contact.state, contact.zipCode]
                .filter(Boolean)
                .join(", ")
            : undefined),
        notes: apt.notes || apt.description || undefined,
        leadId: apt.leadId,
        claimId: apt.claimId,
      };
    })
    .filter((apt) => {
      if (!statusFilter || statusFilter === "all") return true;
      return apt.status === statusFilter;
    });

  return NextResponse.json({ success: true, data });
}
