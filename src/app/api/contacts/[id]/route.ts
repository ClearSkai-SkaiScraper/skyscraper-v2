import { NextRequest, NextResponse } from "next/server";

import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * GET /api/contacts/:id - Get a single contact by ID
 */
export const GET = withAuth(async (req: NextRequest, { orgId }, { params }) => {
  try {
    const { id } = params as { id: string };

    const contact = await prisma.contacts.findFirst({
      where: {
        id,
        orgId, // Tenant isolation
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    return NextResponse.json({ contact });
  } catch (error) {
    logger.error("[CONTACTS_GET_BY_ID] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

/**
 * DELETE /api/contacts/:id - Delete a contact
 */
export const DELETE = withAuth(async (req: NextRequest, { orgId, userId }, { params }) => {
  try {
    const { id } = params as { id: string };

    // Check if contact exists and belongs to this org
    const contact = await prisma.contacts.findFirst({
      where: {
        id,
        orgId, // Tenant isolation
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Delete the contact
    await prisma.contacts.delete({
      where: { id },
    });

    logger.info("[CONTACTS_DELETE]", { orgId, contactId: id, deletedBy: userId });

    return NextResponse.json({ success: true, message: "Contact deleted successfully" });
  } catch (error) {
    logger.error("[CONTACTS_DELETE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});

/**
 * PATCH /api/contacts/:id - Update a contact
 */
export const PATCH = withAuth(async (req: NextRequest, { orgId, userId }, { params }) => {
  try {
    const { id } = params as { id: string };
    const body = await req.json();

    // Check if contact exists and belongs to this org
    const contact = await prisma.contacts.findFirst({
      where: {
        id,
        orgId, // Tenant isolation
      },
    });

    if (!contact) {
      return NextResponse.json({ error: "Contact not found" }, { status: 404 });
    }

    // Update the contact
    const updated = await prisma.contacts.update({
      where: { id },
      data: {
        firstName: body.firstName,
        lastName: body.lastName,
        email: body.email,
        phone: body.phone,
        company: body.company,
        title: body.title,
        street: body.street,
        city: body.city,
        state: body.state,
        zipCode: body.zipCode,
        notes: body.notes,
        tags: body.tags,
        updatedAt: new Date(),
      },
    });

    logger.info("[CONTACTS_UPDATE]", { orgId, contactId: id, updatedBy: userId });

    return NextResponse.json({ contact: updated });
  } catch (error) {
    logger.error("[CONTACTS_UPDATE] Error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
});
