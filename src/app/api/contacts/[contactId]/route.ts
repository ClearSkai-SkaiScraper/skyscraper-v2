// src/app/api/contacts/[contactId]/route.ts
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";
import { z } from "zod";

import { withOrgScope } from "@/lib/auth/tenant";
import prisma from "@/lib/prisma";
import { checkRateLimit } from "@/lib/rate-limit";

const updateContactSchema = z.object({
  firstName: z.string().min(1).optional(),
  lastName: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  street: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  zipCode: z.string().optional(),
  company: z.string().optional(),
  title: z.string().optional(),
  notes: z.string().optional(),
});

export const dynamic = "force-dynamic";

/**
 * GET /api/contacts/[contactId] - Get contact details
 */
export const GET = withOrgScope(
  async (req, { orgId }, { params }: { params: { contactId: string } }) => {
    try {
      const contact = await prisma.contacts.findFirst({
        where: {
          id: params.contactId,
          orgId: orgId,
        },
      });

      if (!contact) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      return NextResponse.json({
        contact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          street: contact.street,
          city: contact.city,
          state: contact.state,
          zipCode: contact.zipCode,
        },
      });
    } catch (error) {
      logger.error("[GET /api/contacts/:id] Error:", error);
      return NextResponse.json(
        { error: "Failed to fetch contact" },
        { status: 500 }
      );
    }
  }
);

/**
 * PATCH /api/contacts/[contactId] - Update contact details
 */
export const PATCH = withOrgScope(
  async (req, { orgId, userId }, { params }: { params: { contactId: string } }) => {
    try {
      const rl = await checkRateLimit(userId, "API");
      if (!rl.success) {
        return NextResponse.json(
          { error: "rate_limit_exceeded", message: "Too many requests" },
          { status: 429 }
        );
      }

      const body = await req.json();
      const parsed = updateContactSchema.safeParse(body);
      if (!parsed.success) {
        return NextResponse.json(
          { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
          { status: 400 }
        );
      }

      // Allowlist of fields that can be updated
      const allowedFields = [
        "firstName",
        "lastName",
        "email",
        "phone",
        "street",
        "city",
        "state",
        "zipCode",
        "company",
        "title",
        "notes",
      ];

      // Filter to only allowed fields
      const updateData: Record<string, unknown> = {};
      for (const field of allowedFields) {
        if ((parsed.data as Record<string, unknown>)[field] !== undefined) {
          updateData[field] = (parsed.data as Record<string, unknown>)[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        return NextResponse.json({ error: "No valid fields to update" }, { status: 400 });
      }

      // Verify contact belongs to org before updating
      const existing = await prisma.contacts.findFirst({
        where: {
          id: params.contactId,
          orgId: orgId,
        },
      });

      if (!existing) {
        return NextResponse.json({ error: "Contact not found" }, { status: 404 });
      }

      // Update the contact
      const contact = await prisma.contacts.update({
        where: { id: params.contactId },
        data: {
          ...updateData,
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        contact: {
          id: contact.id,
          firstName: contact.firstName,
          lastName: contact.lastName,
          email: contact.email,
          phone: contact.phone,
          street: contact.street,
          city: contact.city,
          state: contact.state,
          zipCode: contact.zipCode,
        },
      });
    } catch (error) {
      logger.error("[PATCH /api/contacts/:id] Error:", error);
      return NextResponse.json(
        { error: "Failed to update contact" },
        { status: 500 }
      );
    }
  }
);
