// src/features/reports/renderEngine.ts
// Render engine: use Puppeteer to render internal-route and upload PDF to S3 (MinIO/AWS)
import path from "path";
import puppeteer from "puppeteer";

import { getSignedGetUrl, uploadBuffer } from "@/lib/s3";

export async function renderAndUploadPDF(opts: {
  jobId: string;
  projectId: string;
  orgId: string;
  pageKey: string; // slot 'A'|'B1' etc
  renderContext?: any;
  version?: number;
}) {
  const { jobId, projectId, orgId, pageKey, renderContext = {}, version = 1 } = opts;

  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();

    const b64 = Buffer.from(JSON.stringify(renderContext)).toString("base64");
    const renderUrl = `${process.env.APP_URL || "http://127.0.0.1:3000"}/internal-render?page=${encodeURIComponent(pageKey)}&jobId=${encodeURIComponent(jobId)}&renderContext=${encodeURIComponent(b64)}`;

    await page.goto(renderUrl, { waitUntil: "networkidle0" });
    // wait for client readiness flag
    try {
      await page.waitForFunction("window.__SKAISCRAPER_RENDER_READY === true", { timeout: 5000 });
    } catch (_err) {
      // proceed anyway
    }

    const pdfBuffer = await page.pdf({
      printBackground: true,
      format: "letter",
      margin: { top: "12mm", bottom: "12mm" },
    });

    const now = new Date();
    const yyyy = now.getUTCFullYear();
    const mm = String(now.getUTCMonth() + 1).padStart(2, "0");
    const key = path.posix.join(
      "reports",
      String(yyyy),
      mm,
      String(orgId),
      String(projectId),
      `${pageKey}_v${version}.pdf`
    );

    await uploadBuffer(pdfBuffer, key, "application/pdf");
    const url = await getSignedGetUrl(key, Number(process.env.S3_PRESIGN_EXPIRES || 60 * 60));

    return { key, url };
  } finally {
    await browser.close();
  }
}

const renderEngine = { renderAndUploadPDF };
export default renderEngine;
