export const dynamic = "force-dynamic";

/**
 * 🔥 PHASE C: QOL - Save AI Output to Lead Notes
 * 
 * POST /api/leads/[id]/notes/from-ai
 */

import { auth } from "@clerk/nextjs/server";
import { logger } from "@/lib/logger";
import { NextRequest, NextResponse } from "next/server";

import { compose,safeAuth, withOrgScope, withRateLimit, withSentryApi } from "@/lib/api/wrappers";
import prisma from "@/lib/prisma";

const basePOST = async (
  req: NextRequest,
  { params }: { params: { id: string } }
) => {
  try {
    const { userId, orgId } = await auth();
    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const Org = await prisma.org.findUnique({
      where: { clerkOrgId: orgId },
    });

    if (!Org) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 });
    }

    const leadId = params.id;
    const body = await req.json();
    const { type, content } = body;

    if (!type || !content) {
      return NextResponse.json(
        { error: "type and content are required" },
        { status: 400 }
      );
    }

    // Verify lead belongs to Org
    const lead = await prisma.leads.findFirst({
      where: {
        id: leadId,
        orgId: Org.id,
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    // Format note with timestamp and type label
    const timestamp = new Date().toLocaleString();
    const typeLabels: Record<string, string> = {
      "dominus-summary": "Dominus AI Summary",
      "smart-action": "Smart Action",
      "video-script": "Video Script",
      "homeowner-message": "Homeowner Message",
      "adjuster-email": "Adjuster Email",
    };

    const label = typeLabels[type] || "AI Output";
    const formattedNote = `\n\n---\n**${label}** (${timestamp})\n\n${content}\n`;

    // Append to lead description or notes field
    const updatedLead = await prisma.leads.update({
      where: { id: leadId },
      data: {
        description: (lead.description || "") + formattedNote,
      },
    });

    return NextResponse.json({
      success: true,
      message: "Note saved successfully",
      lead: {
        id: updatedLead.id,
        description: updatedLead.description,
      },
    });
  } catch (error) {
    logger.error("Error saving note:", error);
    return NextResponse.json(
      { error: "Failed to save note", details: "Internal server error" },
      { status: 500 }
    );
  }
};

export const POST = compose(withSentryApi, withRateLimit, withOrgScope, safeAuth)(basePOST);
