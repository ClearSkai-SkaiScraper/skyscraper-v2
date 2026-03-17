export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const revalidate = 0;

// =====================================================
// API: ACCEPT REPORT (PUBLIC)
// =====================================================
// POST /api/public/reports/[id]/accept
// Client acceptance endpoint (no auth required, uses token)
// =====================================================

import { NextResponse } from "next/server";

import { supabase } from "@/integrations/supabase/client";
import { logger } from "@/lib/logger";
import { sendAcceptanceReceiptEmail } from "@/lib/mailer";
import prisma from "@/lib/prisma";
import { buildAcceptanceReceiptPDF, getReceiptFilename } from "@/lib/receipt-pdf";

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const body = await req.json();
    const { token, name, email } = body as {
      token?: string;
      name?: string;
      email?: string;
    };

    if (!token) {
      return NextResponse.json({ error: "Token required" }, { status: 400 });
    }

    // Find report by ID
    const report = await prisma.ai_reports.findUnique({
      where: { id: params.id },
      include: { Org: true },
    });

    if (!report) {
      return NextResponse.json({ error: "Report not found" }, { status: 404 });
    }

    // Get client IP and user agent for security footprint
    const ip = req.headers.get("x-forwarded-for") || req.headers.get("x-real-ip") || "Unknown";
    const userAgent = req.headers.get("user-agent") || "Unknown";
    const acceptedAt = new Date();

    // Generate PDF receipt
    let receiptPdfUrl: string | undefined;
    try {
      const pdfBuffer = await buildAcceptanceReceiptPDF({
        orgName: report.Org?.name,
        reportId: report.id,
        clientName: name,
        clientEmail: email,
        acceptedAt,
        ip,
        userAgent,
      });

      // Upload to Supabase Storage
      const filename = getReceiptFilename(report.id);
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from("reports")
        .upload(`receipts/${filename}`, pdfBuffer, {
          contentType: "application/pdf",
          cacheControl: "3600",
        });

      if (uploadError) {
        logger.error("Receipt upload failed:", uploadError);
      } else {
        // Get signed URL (valid 30 days)
        const { data: urlData } = await supabase.storage
          .from("reports")
          .createSignedUrl(uploadData.path, 60 * 60 * 24 * 30);

        if (urlData) {
          receiptPdfUrl = urlData.signedUrl;
        }
      }
    } catch (pdfError) {
      logger.error("PDF generation failed:", pdfError);
      // Continue without PDF - acceptance is more important
    }

    // Log acceptance event to report_events table
    try {
      await prisma.$executeRaw`
        SELECT log_report_event(
          ${report.id}::uuid,
          ${report.orgId}::uuid,
          'accepted',
          ${JSON.stringify({ name, email })}::jsonb,
          ${ip},
          ${userAgent}
        )
      `;
    } catch (eventError) {
      logger.error("Event logging failed:", eventError);
      // Continue - logging is secondary
    }

    // Send receipt email to client + internal team
    if (email) {
      try {
        const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL}/reports/${report.id}/share?token=${token}`;

        // Get report PDF URL if available
        let reportPdfUrl: string | undefined;
        // Note: Adjust this based on your actual report PDF storage

        await sendAcceptanceReceiptEmail({
          to: [email],
          orgName: report.Org?.name,
          reportId: report.id,
          shareUrl,
          receiptPdfUrl: receiptPdfUrl || "",
          reportPdfUrl,
          clientName: name,
          acceptedAt,
        });
      } catch (emailError) {
        logger.error("Acceptance receipt email failed:", emailError);
        // Don't fail the acceptance if email fails
      }
    }

    return NextResponse.json({
      ok: true,
      description: "Report accepted successfully",
      receiptUrl: receiptPdfUrl,
    });
  } catch (error) {
    logger.error("Accept report error:", error);
    return NextResponse.json(
      { error: "Accept failed" },
      { status: 500 }
    );
  }
}
