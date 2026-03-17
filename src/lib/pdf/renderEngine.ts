import { PutObjectCommand,S3Client } from "@aws-sdk/client-s3";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";

import { logger } from "@/lib/logger";

type RenderPayload = {
  jobId: string;
  projectId: string;
  types?: string[]; // slots like 'A','B1'...
  options?: Record<string, any>;
  renderContext?: any;
};

async function uploadToS3(buffer: Buffer, key: string) {
  const bucket = process.env.REPORTS_BUCKET || process.env.S3_BUCKET;
  const region = process.env.AWS_REGION || "us-east-1";
  if (!bucket) {
    throw new Error("S3 bucket not configured (REPORTS_BUCKET)");
  }

  const s3Endpoint = process.env.S3_ENDPOINT; // optional (MinIO)
  const client = new S3Client({
    region,
    endpoint: s3Endpoint || undefined,
    credentials: process.env.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
          secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
        }
      : undefined,
    forcePathStyle: !!s3Endpoint,
  });

  const cmd = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: "application/pdf",
  });

  await client.send(cmd);

  // build URL - if custom endpoint use that, otherwise use S3 URL
  if (s3Endpoint) {
    const endpoint = s3Endpoint.replace(/\/$/, "");
    return `${endpoint}/${bucket}/${key}`;
  }
  return `https://${bucket}.s3.${region}.amazonaws.com/${key}`;
}

export async function renderPdfJob(payload: RenderPayload) {
  const { jobId, projectId, types = ["A"], renderContext = {}, options = {} } = payload;
  const outputs: Record<string, string> = {};

  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();

    for (const t of types) {
      const encoded = Buffer.from(JSON.stringify(renderContext)).toString("base64");
      const renderUrl = `${process.env.INTERNAL_RENDER_BASE || "http://127.0.0.1:3000"}/internal-render?page=${encodeURIComponent(t)}&jobId=${encodeURIComponent(jobId)}&renderContext=${encodeURIComponent(encoded)}`;

      await page.goto(renderUrl, { waitUntil: "networkidle0" });
      // wait for client flag (internal-render sets this)
      try {
        await page.waitForFunction("window.__SKAISCRAPER_RENDER_READY === true", { timeout: 5000 });
      } catch (e) {
        // proceed anyway after a short delay
        await page.waitForTimeout(200);
      }

      const pdfBuffer = await page.pdf({
        printBackground: true,
        format: "letter",
        margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
      });

      // checksum of render context
      const checksum = crypto
        .createHash("sha256")
        .update(JSON.stringify(renderContext || {}))
        .digest("hex");

      // filename and local write
      const filename = `report_${projectId}_${t}_${Date.now()}.pdf`;
      const outDir = path.join(process.cwd(), "tmp");
      await fs.mkdir(outDir, { recursive: true });
      const outPath = path.join(outDir, filename);
      await fs.writeFile(outPath, pdfBuffer);

      // attempt S3 upload if configured
      let publicUrl = `file://${outPath}`;
      if (process.env.REPORTS_BUCKET || process.env.S3_BUCKET) {
        const key = `${projectId}/${jobId}/${filename}`;
        try {
          publicUrl = await uploadToS3(pdfBuffer, key);
        } catch (err) {
          // swallow upload error but keep local file
          logger.error("S3 upload failed", err);
        }
      }

      outputs[t] = publicUrl;
    }

    return { jobId, projectId, outputs, status: "complete" };
  } finally {
    await browser.close();
  }
}

export default { renderPdfJob };
