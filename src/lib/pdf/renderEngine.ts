import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";

import { config } from "@/lib/config";
import { logger } from "@/lib/logger";

interface RenderOptions {
  [key: string]: unknown;
}

interface RenderContext {
  [key: string]: unknown;
}

type RenderPayload = {
  jobId: string;
  projectId: string;
  types?: string[];
  options?: RenderOptions;
  renderContext?: RenderContext;
};

async function uploadToS3(buffer: Buffer, key: string) {
  const bucket = config.REPORTS_BUCKET || config.S3_BUCKET;
  const region = config.AWS_REGION || "us-east-1";
  if (!bucket) {
    throw new Error("S3 bucket not configured (REPORTS_BUCKET)");
  }

  const s3Endpoint = config.S3_ENDPOINT;
  const client = new S3Client({
    region,
    endpoint: s3Endpoint || undefined,
    credentials: config.AWS_ACCESS_KEY_ID
      ? {
          accessKeyId: config.AWS_ACCESS_KEY_ID,
          secretAccessKey: config.AWS_SECRET_ACCESS_KEY ?? "",
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
  const { jobId, projectId, types = ["A"], renderContext = {}, options: _options = {} } = payload;
  const outputs: Record<string, string> = {};

  const browser = await puppeteer.launch({ args: ["--no-sandbox", "--disable-setuid-sandbox"] });
  try {
    const page = await browser.newPage();

    for (const t of types) {
      const encoded = Buffer.from(JSON.stringify(renderContext)).toString("base64");
      const renderUrl = `${config.INTERNAL_RENDER_BASE || "http://127.0.0.1:3000"}/internal-render?page=${encodeURIComponent(t)}&jobId=${encodeURIComponent(jobId)}&renderContext=${encodeURIComponent(encoded)}`;

      await page.goto(renderUrl, { waitUntil: "networkidle0" });
      // wait for client flag (internal-render sets this)
      try {
        await page.waitForFunction("window.__SKAISCRAPER_RENDER_READY === true", { timeout: 5000 });
      } catch {
        // proceed anyway after a short delay
        await page.waitForTimeout(200);
      }

      const pdfBuffer = await page.pdf({
        printBackground: true,
        format: "letter",
        margin: { top: "12mm", bottom: "12mm", left: "12mm", right: "12mm" },
      });

      // checksum of render context
      const _checksum = crypto
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
      if (config.REPORTS_BUCKET || config.S3_BUCKET) {
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

const renderEngineExports = { renderPdfJob };
export default renderEngineExports;
