export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { logger } from "@/lib/logger";

import { requireAuth } from "@/lib/auth/requireAuth";
import { money } from "@/lib/money";

type LineItem = {
  trade: string;
  code: string;
  desc: string;
  qty: number;
  unit: string;
  unitPriceCents: number;
};

export async function POST(req: NextRequest) {
  try {
    const auth = await requireAuth();
    if (auth instanceof NextResponse) return auth;
    const { orgId, userId } = auth;

    const items: LineItem[] = await req.json();

    // Calculate total
    const totalCents = items.reduce((sum, item) => sum + item.qty * item.unitPriceCents, 0);

    // Build simple HTML PDF content
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8" />
        <title>Supplement Proposal</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, sans-serif; margin: 40px; color: #1a1a1a; }
          h1 { color: #117CFF; margin-bottom: 10px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
          th { background: #f4f7fb; font-weight: 600; }
          .total { font-weight: 700; background: #f0f9ff; }
        </style>
      </head>
      <body>
        <h1>Supplement Proposal</h1>
        <p>Generated: ${new Date().toLocaleDateString()}</p>
        <table>
          <thead>
            <tr>
              <th>Trade</th>
              <th>Code</th>
              <th>Description</th>
              <th>Qty</th>
              <th>Unit Price</th>
              <th>Line Total</th>
            </tr>
          </thead>
          <tbody>
            ${items
              .map(
                (item) => `
              <tr>
                <td>${item.trade}</td>
                <td>${item.code}</td>
                <td>${item.desc}</td>
                <td>${item.qty} ${item.unit}</td>
                <td>${money(item.unitPriceCents)}</td>
                <td>${money(item.qty * item.unitPriceCents)}</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
          <tfoot>
            <tr class="total">
              <td colspan="5">Total Supplement Request</td>
              <td>${money(totalCents)}</td>
            </tr>
          </tfoot>
        </table>
      </body>
      </html>
    `;

    // In production, use a library like puppeteer or pdf-lib to generate actual PDF
    // For now, return HTML that can be printed as PDF
    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html",
        "Content-Disposition": 'inline; filename="supplement.html"',
      },
    });
  } catch (error) {
    logger.error("PDF generation error:", error);
    return NextResponse.json({ error: "Failed to generate PDF" }, { status: 500 });
  }
}
