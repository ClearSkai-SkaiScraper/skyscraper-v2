export const dynamic = "force-dynamic";
/**
 * GET /api/contractors/forms/public/[slug]
 * Returns the public intake form definition for a contractor
 * NO AUTHENTICATION REQUIRED
 *
 * Since contractor_forms model doesn't exist in Prisma yet,
 * returns a default service request form for the contractor.
 */

import { NextRequest, NextResponse } from "next/server";

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export async function GET(_req: NextRequest, { params }: { params: { slug: string } }) {
  try {
    const { slug } = params;

    // Verify contractor exists
    const company = await prisma.tradesCompany.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        isActive: true,
        specialties: true,
      },
    });

    if (!company || !company.isActive) {
      return NextResponse.json({ error: "Contractor not found" }, { status: 404 });
    }

    // Build a default intake form based on the contractor's specialties
    const tradeOptions =
      company.specialties.length > 0
        ? company.specialties
        : ["Roofing", "Siding", "Gutters", "Windows", "General Repair"];

    const form = {
      id: `default-form-${company.id}`,
      title: `Request Service from ${company.name}`,
      description: "Fill out this form and we'll get back to you as soon as possible.",
      fields: [
        {
          name: "name",
          type: "text",
          label: "Your Full Name",
          required: true,
        },
        {
          name: "email",
          type: "email",
          label: "Email Address",
          required: true,
        },
        {
          name: "phone",
          type: "tel",
          label: "Phone Number",
          required: true,
        },
        {
          name: "address",
          type: "text",
          label: "Property Address",
          required: true,
        },
        {
          name: "service",
          type: "select",
          label: "Type of Service Needed",
          required: true,
          options: tradeOptions,
        },
        {
          name: "urgency",
          type: "select",
          label: "How Urgent Is This?",
          required: false,
          options: ["Not Urgent", "Within a Week", "Within 48 Hours", "Emergency"],
        },
        {
          name: "description",
          type: "textarea",
          label: "Describe the Work Needed",
          required: true,
        },
      ],
      requirePhotos: true,
    };

    return NextResponse.json({ form });
  } catch (error) {
    logger.error("❌ [GET /api/contractors/forms/public/[slug]] Error:", error);
    return NextResponse.json({ error: "Failed to load form" }, { status: 500 });
  }
}
