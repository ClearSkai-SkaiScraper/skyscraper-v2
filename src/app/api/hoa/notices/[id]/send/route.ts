export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { auth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

import { getOpenAI } from "@/lib/ai/client";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

const sendNoticeSchema = z.object({
  deliveryMethod: z.enum(["email", "print", "door-to-door"]).default("print"),
  deliveryNotes: z.string().optional(),
});

/**
 * POST /api/hoa/notices/[id]/send
 * Generate PDF and mark the HOA notice as sent
 */
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Parse request body
    const body = await request.json().catch(() => ({}));
    const validation = sendNoticeSchema.safeParse(body);

    const deliveryMethod = validation.success ? validation.data.deliveryMethod : "print";
    const deliveryNotes = validation.success ? validation.data.deliveryNotes : undefined;

    // Verify the notice exists and belongs to this org
    const notice = await prisma.hoa_notice_packs.findFirst({
      where: { id, orgId },
    });

    if (!notice) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    // Get organization branding
    const org = await prisma.org.findUnique({
      where: { id: orgId },
      select: {
        name: true,
        brandLogoUrl: true,
        pdfFooterText: true,
      },
    });

    // Generate AI content for the notice
    const openai = getOpenAI();
    const contentPrompt =
      notice.mode === "neutral"
        ? `Generate a neutral, informational storm notice for an HOA community.

Community: ${notice.community}
Storm Date: ${notice.stormDate.toLocaleDateString()}
Homes Affected: ${notice.homeCount}
Hail Size: ${notice.hailSize || "Not specified"}
Wind Speed: ${notice.windSpeed || "Not specified"}

Write a professional notice that:
1. Informs residents about the recent storm event
2. Explains potential property damage to look for
3. Recommends getting a professional inspection
4. Does NOT mention any specific contractor
5. Provides general guidance on insurance claims

${notice.customMessage ? `Additional context: ${notice.customMessage}` : ""}

Return a JSON object with:
{
  "subject": "Notice subject line",
  "greeting": "Dear [Community] Homeowners,",
  "body": "Main notice content (multiple paragraphs)",
  "callToAction": "What residents should do",
  "closing": "Professional closing statement"
}`
        : `Generate a contractor-assisted storm notice for an HOA community.

Community: ${notice.community}
Storm Date: ${notice.stormDate.toLocaleDateString()}
Homes Affected: ${notice.homeCount}
Hail Size: ${notice.hailSize || "Not specified"}
Wind Speed: ${notice.windSpeed || "Not specified"}
Contractor: ${org?.name || "Local Contractor"}

Write a professional notice that:
1. Informs residents about the recent storm event
2. Explains potential property damage to look for
3. Offers free inspections from the contractor
4. Explains the contractor's experience and credentials
5. Includes a call to action to schedule an inspection

${notice.customMessage ? `Additional context: ${notice.customMessage}` : ""}

Return a JSON object with:
{
  "subject": "Notice subject line",
  "greeting": "Dear [Community] Homeowners,",
  "body": "Main notice content (multiple paragraphs)",
  "callToAction": "Schedule your free inspection",
  "closing": "Professional closing with contractor info"
}`;

    const aiResponse = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        {
          role: "system",
          content:
            "You are a professional storm restoration communication specialist. Generate clear, helpful notices for homeowners affected by storms.",
        },
        { role: "user", content: contentPrompt },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const generatedContent = JSON.parse(aiResponse.choices[0]?.message?.content || "{}");

    // Generate HTML preview
    const previewHtml = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .logo { max-height: 60px; margin-bottom: 20px; }
    h1 { color: #333; font-size: 24px; }
    .content { line-height: 1.6; color: #444; }
    .cta { background: #f0f7ff; padding: 20px; border-radius: 8px; margin: 20px 0; }
    .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #eee; font-size: 12px; color: #666; }
  </style>
</head>
<body>
  <div class="header">
    ${org?.brandLogoUrl ? `<img src="${org.brandLogoUrl}" class="logo" alt="${org.name}" />` : ""}
    <h1>${generatedContent.subject || "Storm Notice"}</h1>
  </div>
  <div class="content">
    <p><strong>${generatedContent.greeting || `Dear ${notice.community} Homeowners,`}</strong></p>
    <div>${(generatedContent.body || "")
      .split("\n")
      .map((p: string) => `<p>${p}</p>`)
      .join("")}</div>
    <div class="cta">
      <strong>What You Should Do:</strong>
      <p>${generatedContent.callToAction || "Schedule a professional inspection."}</p>
    </div>
    <p>${generatedContent.closing || "Sincerely,"}</p>
  </div>
  <div class="footer">
    <p>Storm Date: ${notice.stormDate.toLocaleDateString()}</p>
    ${org?.pdfFooterText ? `<p>${org.pdfFooterText}</p>` : ""}
  </div>
</body>
</html>`;

    // Update the notice
    const updatedNotice = await prisma.hoa_notice_packs.update({
      where: { id },
      data: {
        status: "sent",
        previewHtml,
        generatedAt: new Date(),
        sentAt: new Date(),
        sentBy: userId,
        deliveryMethod,
        deliveryNotes,
        metadata: {
          ...((notice.metadata as object) || {}),
          generatedContent,
          aiModel: "gpt-4o-mini",
        },
      },
    });

    logger.info("[HOA_NOTICES] Notice sent successfully", {
      orgId,
      noticeId: id,
      deliveryMethod,
      homeCount: notice.homeCount,
    });

    return NextResponse.json({
      success: true,
      notice: updatedNotice,
      previewHtml,
      generatedContent,
    });
  } catch (error) {
    logger.error("[HOA_NOTICES] Error sending notice:", error);
    return NextResponse.json({ error: "Failed to send HOA notice" }, { status: 500 });
  }
}

/**
 * GET /api/hoa/notices/[id]/send
 * Preview the generated notice content
 */
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { userId, orgId } = await auth();

    if (!userId || !orgId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const notice = await prisma.hoa_notice_packs.findFirst({
      where: { id, orgId },
    });

    if (!notice) {
      return NextResponse.json({ error: "Notice not found" }, { status: 404 });
    }

    if (!notice.previewHtml) {
      return NextResponse.json(
        { error: "Notice has not been generated yet. Call POST to generate and send." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      previewHtml: notice.previewHtml,
      generatedAt: notice.generatedAt,
      sentAt: notice.sentAt,
    });
  } catch (error) {
    logger.error("[HOA_NOTICES] Error fetching preview:", error);
    return NextResponse.json({ error: "Failed to fetch notice preview" }, { status: 500 });
  }
}
