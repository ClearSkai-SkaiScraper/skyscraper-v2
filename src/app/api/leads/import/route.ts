/**
 * POST /api/leads/import
 * Bulk-import leads from a parsed CSV payload.
 */
export const dynamic = "force-dynamic";

import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

interface LeadRow {
  name: string;
  email?: string;
  phone?: string;
  address: string;
  city?: string;
  state?: string;
  zip?: string;
  source?: string;
  notes?: string;
}

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (ctx.status !== "ok" || !ctx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const leads: LeadRow[] = body.leads;

    if (!Array.isArray(leads) || leads.length === 0) {
      return NextResponse.json({ error: "No leads provided" }, { status: 400 });
    }

    if (leads.length > 500) {
      return NextResponse.json({ error: "Maximum 500 leads per import" }, { status: 400 });
    }

    let imported = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const lead of leads) {
      if (!lead.name || !lead.address) {
        skipped++;
        continue;
      }

      try {
        // Split name into first/last for contacts model
        const nameParts = lead.name.trim().split(/\s+/);
        const firstName = nameParts[0] || lead.name;
        const lastName = nameParts.slice(1).join(" ") || "";

        // Create a contact for this lead
        const contactId = createId();
        await prisma.contacts.create({
          data: {
            id: contactId,
            orgId: ctx.orgId,
            firstName: firstName.slice(0, 200),
            lastName: lastName.slice(0, 200),
            email: lead.email?.slice(0, 200) || null,
            phone: lead.phone?.slice(0, 50) || null,
            street: lead.address?.slice(0, 500) || null,
            city: lead.city?.slice(0, 100) || null,
            state: lead.state?.slice(0, 50) || null,
            zipCode: lead.zip?.slice(0, 20) || null,
            source: lead.source?.slice(0, 100) || "CSV Import",
            notes: lead.notes?.slice(0, 2000) || null,
            updatedAt: new Date(),
          },
        });

        await prisma.leads.create({
          data: {
            id: createId(),
            orgId: ctx.orgId,
            contactId,
            title: lead.name.slice(0, 200),
            source: lead.source?.slice(0, 100) || "CSV Import",
            stage: "new",
            temperature: "warm",
            updatedAt: new Date(),
          },
        });
        imported++;
      } catch (err: any) {
        if (err?.code === "P2002") {
          skipped++;
          errors.push(`Duplicate: ${lead.name}`);
        } else {
          skipped++;
          errors.push(`Failed: ${lead.name}`);
        }
      }
    }

    logger.info("[LEADS_IMPORT]", {
      orgId: ctx.orgId,
      imported,
      skipped,
      total: leads.length,
    });

    return NextResponse.json({ imported, skipped, errors: errors.slice(0, 10) });
  } catch (error) {
    logger.error("[LEADS_IMPORT] Error:", error);
    return NextResponse.json({ error: "Import failed" }, { status: 500 });
  }
}
