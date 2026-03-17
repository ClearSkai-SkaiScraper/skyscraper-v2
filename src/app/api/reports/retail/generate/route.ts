/**
 * POST /api/reports/retail/generate
 *
 * Generate an AI-powered retail proposal for homeowners.
 * Called from /reports/retail (RetailProposalClient).
 *
 * Body: { leadId, claimId?, scope, upsell }
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { createId } from "@paralleldrive/cuid2";
import { NextRequest, NextResponse } from "next/server";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export async function POST(req: NextRequest) {
  try {
    const ctx = await safeOrgContext();
    if (!ctx.ok || !ctx.orgId || !ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { leadId, claimId, scope, upsell } = body;

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required" }, { status: 400 });
    }

    if (!scope) {
      return NextResponse.json({ error: "scope description is required" }, { status: 400 });
    }

    // Fetch lead info with contact details
    const lead = await prisma.leads.findFirst({
      where: { id: leadId, orgId: ctx.orgId },
      select: {
        id: true,
        title: true,
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
      },
    });

    if (!lead) {
      return NextResponse.json({ error: "Lead not found" }, { status: 404 });
    }

    const contact = lead.contacts;
    const contactName =
      [contact.firstName, contact.lastName].filter(Boolean).join(" ") || "Valued Customer";
    const contactAddress =
      [contact.street, contact.city, contact.state, contact.zipCode].filter(Boolean).join(", ") ||
      "On file";

    // Optionally fetch claim if linked
    let claimInfo: {
      id: string;
      claimNumber: string;
      damageType: string;
      dateOfLoss: Date;
      estimatedValue: number | null;
    } | null = null;
    if (claimId) {
      claimInfo = await prisma.claims.findFirst({
        where: { id: claimId, orgId: ctx.orgId },
        select: {
          id: true,
          claimNumber: true,
          damageType: true,
          dateOfLoss: true,
          estimatedValue: true,
        },
      });
    }

    // Fetch org name for branding
    const org = await prisma.org.findUnique({
      where: { id: ctx.orgId },
      select: { name: true },
    });

    const client = getOpenAI();

    const systemPrompt = `You are an expert storm restoration sales proposal writer for ${org?.name || "our company"}.
Generate a professional, persuasive retail proposal for a homeowner.
The tone should be warm, professional, and reassuring. Highlight value and quality.
Output valid JSON with this shape:
{
  "proposalTitle": "string",
  "greeting": "string (personalized greeting)",
  "scopeSummary": "string (professional summary of the work scope)",
  "valueProposition": "string (why choose us)",
  "upsellSection": "string or null (additional services pitch)",
  "timeline": "string (estimated timeline)",
  "nextSteps": "string (call to action)",
  "disclaimer": "string (standard disclaimer text)"
}`;

    const userPrompt = `Create a retail proposal for:
Homeowner: ${contactName}
Address: ${contactAddress}
${claimInfo ? `Claim #: ${claimInfo.claimNumber || "N/A"}\nDamage Type: ${claimInfo.damageType || "Storm"}\nDate of Loss: ${claimInfo.dateOfLoss?.toISOString().split("T")[0] || "N/A"}` : "No linked insurance claim"}

Scope of Work:
${scope}

${upsell ? `Additional Services to Pitch:\n${upsell}` : "No specific upsell requested"}`;

    let proposal;
    try {
      const completion = await client.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.4,
        response_format: { type: "json_object" },
      });

      const raw = completion.choices[0]?.message?.content || "{}";
      proposal = JSON.parse(raw);

      // Save as ai_report
      const dbUser = await prisma.users.findFirst({
        where: { clerkUserId: ctx.userId },
        select: { id: true, name: true },
      });

      await prisma.ai_reports.create({
        data: {
          id: createId(),
          orgId: ctx.orgId,
          type: "RETAIL",
          title: proposal.proposalTitle || "Retail Proposal",
          content: raw,
          tokensUsed: completion.usage?.total_tokens || 0,
          model: "gpt-4o-mini",
          claimId: claimId || null,
          userId: dbUser?.id || ctx.userId,
          userName: dbUser?.name || "System",
          status: "generated",
          updatedAt: new Date(),
        },
      });
    } catch (aiError) {
      logger.error("[RETAIL_GENERATE] AI error:", aiError);
      proposal = {
        proposalTitle: "Restoration Proposal",
        greeting: `Dear ${contactName},`,
        scopeSummary: scope,
        valueProposition:
          "We are committed to providing the highest quality restoration services with transparent communication every step of the way.",
        upsellSection: upsell || null,
        timeline: "Project timeline will be discussed during our consultation.",
        nextSteps: "Please contact us to schedule your free inspection and consultation.",
        disclaimer: "This proposal is an estimate and subject to change upon final inspection.",
      };
    }

    logger.info("[RETAIL_GENERATE] Proposal generated", {
      orgId: ctx.orgId,
      leadId,
      claimId,
    });

    return NextResponse.json({
      success: true,
      proposal,
      lead: {
        id: lead.id,
        name: contactName,
        address: contactAddress,
      },
    });
  } catch (error) {
    logger.error("[RETAIL_GENERATE] Error:", error);
    return NextResponse.json({ error: "Failed to generate proposal" }, { status: 500 });
  }
}
