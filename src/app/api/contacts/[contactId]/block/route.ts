export const dynamic = "force-dynamic";
export const revalidate = 0;

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

/**
 * POST /api/contacts/[contactId]/block
 * Block a contact — prevents them from appearing in searches and disables messaging.
 *
 * DELETE /api/contacts/[contactId]/block
 * Unblock a previously blocked contact.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params;
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok || !orgCtx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Blocked by user";

    // Verify contact belongs to this org
    const contact = await prisma.contacts.findFirst({
      where: { id: contactId, orgId: orgCtx.orgId },
      select: { id: true, firstName: true, lastName: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Set blocked flag via tags (using existing tag system)
    const existing = await prisma.contacts.findFirst({
      where: { id: contactId, orgId: orgCtx.orgId },
      select: { tags: true },
    });

    const tags: string[] = Array.isArray(existing?.tags) ? (existing.tags as string[]) : [];
    if (!tags.includes("blocked")) {
      tags.push("blocked");
    }

    await prisma.contacts.update({
      where: { id: contactId },
      data: {
        tags,
        updatedAt: new Date(),
      },
    });

    logger.info("[CONTACTS_BLOCK] Contact blocked", {
      orgId: orgCtx.orgId,
      contactId,
      reason,
    });

    return NextResponse.json({ ok: true, blocked: true });
  } catch (error) {
    logger.error("[CONTACTS_BLOCK] Error", error);
    return NextResponse.json({ error: "Failed to block contact" }, { status: 500 });
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
) {
  try {
    const { contactId } = await params;
    const orgCtx = await safeOrgContext();
    if (!orgCtx.ok || !orgCtx.orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const contact = await prisma.contacts.findFirst({
      where: { id: contactId, orgId: orgCtx.orgId },
      select: { id: true, tags: true },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    const tags: string[] = Array.isArray(contact.tags) ? (contact.tags as string[]) : [];
    const filtered = tags.filter((t) => t !== "blocked");

    await prisma.contacts.update({
      where: { id: contactId },
      data: { tags: filtered, updatedAt: new Date() },
    });

    logger.info("[CONTACTS_UNBLOCK] Contact unblocked", {
      orgId: orgCtx.orgId,
      contactId,
    });

    return NextResponse.json({ ok: true, blocked: false });
  } catch (error) {
    logger.error("[CONTACTS_UNBLOCK] Error", error);
    return NextResponse.json({ error: "Failed to unblock contact" }, { status: 500 });
  }
}
