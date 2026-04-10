// src/pdf/weatherTemplate.ts

import chromium from "@sparticuz/chromium";
import puppeteer from "puppeteer-core";

import { uploadPDFToFirebase } from "@/lib/storage/firebaseUpload";

import { htmlTemplate } from "./weatherTemplateHtml";

export async function buildWeatherPDF(opts: {
  lat: number;
  lon: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  dol: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  scored: any[];
  summary: string;
  branding?: {
    primary?: string;
    secondary?: string;
    background?: string;
    logoUrl?: string;
    companyName?: string;
  };
}) {
  const html = htmlTemplate(opts);

  // eslint-disable-next-line no-restricted-syntax
  const isDev = process.env.NODE_ENV === "development";

  const browser = await puppeteer.launch({
    args: isDev ? ["--no-sandbox", "--disable-setuid-sandbox"] : chromium.args,
    executablePath: isDev
      ? "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      : await chromium.executablePath(),
    headless: true,
  });

  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: "networkidle0" });

  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    margin: { top: "20mm", bottom: "20mm" },
  });

  await browser.close();

  const pdfUrl = await uploadPDFToFirebase(Buffer.from(pdfBuffer), {
    lat: opts.lat,
    lon: opts.lon,
    date: opts.dol?.recommended_date_utc || new Date().toISOString().split("T")[0],
  });

  return pdfUrl;
}
