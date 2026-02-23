// app/api/pdf/create/route.ts

import { renderToBuffer } from "@react-pdf/renderer";
import { logger } from "@/lib/logger";
import { NextResponse } from "next/server";

import { ClaimsReportPDF } from "@/components/pdf/ClaimsReportPDF";
import { RetailReportPDF } from "@/components/pdf/RetailReportPDF";
import prisma from "@/lib/prisma";
import { buildReportData } from "@/lib/reports/buildReportData";
import { ReportConfig } from "@/lib/reports/types";
import { uploadPdfToFirebase } from "@/lib/storage/uploadPdfToFirebase";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ReportConfig & { userId?: string; userName?: string };

    // Step 1: Build data
    const data = await buildReportData(body);

    // Step 2: Choose the template based on type
    const pdfComponent =
      body.type === "INSURANCE_CLAIM" ? (
        <ClaimsReportPDF data={data} sections={body.sections} />
      ) : body.type === "RETAIL_PROPOSAL" ? (
        <RetailReportPDF data={data} sections={body.sections} />
      ) : (
        <ClaimsReportPDF data={data} sections={body.sections} />
      ); // fallback

    // Step 3: Generate PDF buffer
    const pdfBuffer = await renderToBuffer(pdfComponent);

    // Step 4: Upload to Firebase
    const url = await uploadPdfToFirebase(
      Buffer.from(pdfBuffer),
      body.orgId,
      body.claimId,
      `reports-${body.type}`
    );

    // Step 5: Register reports in DB
    // ai_reports doesn't have 'url' - use attachments Json field or meta
    // Also needs required fields: userId, userName, tokensUsed, content
    const reports = await prisma.ai_reports.create({
      data: {
        id: crypto.randomUUID(),
        orgId: body.orgId,
        claimId: body.claimId,
        type: body.type,
        title: data.cover.title,
        content: JSON.stringify({ pdfUrl: url }),
        attachments: { pdfUrl: url },
        userId: body.userId || "system",
        userName: body.userName || "System",
        tokensUsed: 0,
        updatedAt: new Date(),
      },
    });

    return NextResponse.json({
      success: true,
      reportId: reports.id,
      url,
      title: reports.title,
    });
  } catch (error) {
    logger.error("PDF generation error:", error);
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
