/**
 * POST /api/templates/generate
 * Generate a PDF from a premium template for a specific claim
 */

import fs from "fs/promises";
import { NextRequest, NextResponse } from "next/server";
import path from "path";

import { requireApiAuth } from "@/lib/auth/apiAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { renderTemplateToPdf } from "@/lib/templates/renderer";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
export const maxDuration = 60; // Allow up to 60s for PDF generation

interface GenerateRequestBody {
  templateId: string;
  claimId: string;
  customTitle?: string;
}

export async function POST(req: NextRequest) {
  try {
    // Authenticate
    const authResult = await requireApiAuth();
    if (authResult instanceof NextResponse) {
      return authResult;
    }

    const { orgId, userId } = authResult;

    if (!orgId || !userId) {
      return NextResponse.json({ error: "Organization and user required" }, { status: 400 });
    }

    // Parse request body
    const body: GenerateRequestBody = await req.json();
    const { templateId, claimId, customTitle } = body;

    if (!templateId || !claimId) {
      return NextResponse.json({ error: "templateId and claimId are required" }, { status: 400 });
    }

    // Fetch claim and verify ownership with related data
    const claim = await prisma.claims.findFirst({
      where: {
        id: claimId,
        orgId,
      },
      include: {
        properties: true,
      },
    });

    // Fetch claim documents (FileAssets)
    const claimDocuments = await prisma.file_assets.findMany({
      where: {
        orgId,
        claimId,
      },
      take: 10,
      orderBy: { createdAt: "desc" },
    });

    if (!claim) {
      return NextResponse.json({ error: "Claim not found or access denied" }, { status: 404 });
    }

    // Fetch organization details
    const org = await prisma.org.findUnique({
      where: { id: orgId },
    });

    // Fetch branding separately (org_branding is not a direct relation)
    const branding = await prisma.org_branding.findFirst({
      where: { orgId },
    });

    // Build template data
    const templateData = {
      org: {
        name: org?.name || "Your Organization",
        logoUrl: branding?.logoUrl || undefined,
        primaryColor: branding?.colorPrimary || "#0ea5e9",
        secondaryColor: branding?.colorAccent || "#3b82f6",
        phone: branding?.phone || undefined,
        email: branding?.email || undefined,
        website: branding?.website || undefined,
      },
      claim: {
        claimNumber: claim.claimNumber || "N/A",
        policyNumber: undefined,
        dateOfLoss: claim.dateOfLoss
          ? new Date(claim.dateOfLoss).toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })
          : undefined,
        lossType: claim.damageType || undefined,
        carrier: claim.carrier || undefined,
        adjusterId: claim.adjusterName || undefined,
      },
      property: {
        address: claim.properties?.street || "N/A",
        city: claim.properties?.city || undefined,
        state: claim.properties?.state || undefined,
        zip: claim.properties?.zipCode || undefined,
        yearBuilt: claim.properties?.yearBuilt || undefined,
      },
      content: {
        notes: claim.description || "No additional notes",
        photos:
          claimDocuments
            ?.filter((doc) => doc.mimeType?.startsWith("image/"))
            .map((photo) => ({
              url: photo.publicUrl,
              caption: photo.filename || "Photo",
            })) || [],
      },
    };

    // Load template HTML - use templateId as slug for filesystem
    const templateSlug = templateId.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
    const templateHtmlPath = path.join(
      process.cwd(),
      "src/templates/marketplace",
      templateSlug,
      "template.html"
    );

    let templateHtml: string;
    try {
      templateHtml = await fs.readFile(templateHtmlPath, "utf-8");
    } catch (error) {
      return NextResponse.json({ error: "Template HTML not found" }, { status: 500 });
    }

    // Inject PDF theme CSS
    const pdfThemePath = path.join(process.cwd(), "src/styles/pdf-theme.css");
    let pdfThemeCss = "";
    try {
      pdfThemeCss = await fs.readFile(pdfThemePath, "utf-8");
      templateHtml = templateHtml.replace("/* INJECT: pdf-theme.css */", pdfThemeCss);
    } catch (error) {
      logger.warn("PDF theme CSS not found, continuing without it");
    }

    // Generate PDF
    logger.debug(`[TEMPLATE_GENERATE] Rendering PDF for template ${templateId}...`);
    const pdfBuffer = await renderTemplateToPdf(templateHtml, templateData, {
      format: "Letter",
      margin: {
        top: "0in",
        right: "0in",
        bottom: "0in",
        left: "0in",
      },
      printBackground: true,
    });

    // Save PDF to public directory (simple approach for demo)
    const fileName = `${templateSlug}-${claim.claimNumber}-${Date.now()}.pdf`;
    const publicPdfPath = path.join(process.cwd(), "public", "generated", fileName);
    const publicDir = path.join(process.cwd(), "public", "generated");

    // Ensure directory exists
    await fs.mkdir(publicDir, { recursive: true });
    await fs.writeFile(publicPdfPath, pdfBuffer);

    const pdfUrl = `/generated/${fileName}`;

    // Get user info for the report
    const user = await prisma.users.findFirst({
      where: { id: userId },
      select: { name: true },
    });

    // Save as ai_report to database
    const artifact = await prisma.ai_reports.create({
      data: {
        id: crypto.randomUUID(),
        orgId,
        userId,
        userName: user?.name || "Unknown",
        claimId: claim.id,
        type: "TEMPLATE_PDF",
        title: customTitle || `PDF Report - ${claim.claimNumber}`,
        content: pdfUrl,
        tokensUsed: 0,
        status: "generated",
        attachments: {
          templateId,
          templateSlug,
          generatedAt: new Date().toISOString(),
        },
        updatedAt: new Date(),
      },
    });

    logger.debug(`[TEMPLATE_GENERATE] ✅ Generated report ${artifact.id}`);

    return NextResponse.json({
      success: true,
      artifact: {
        id: artifact.id,
        title: artifact.title,
        pdfUrl,
        claimId: artifact.claimId,
        createdAt: artifact.createdAt,
      },
    });
  } catch (error) {
    logger.error("[TEMPLATE_GENERATE] Error:", error);
    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        details: "Internal error",
      },
      { status: 500 }
    );
  }
}
