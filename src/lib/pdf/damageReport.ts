import { createWriteStream, existsSync, mkdirSync } from "fs";
import path from "path";
import PDFDocument from "pdfkit";

interface ScopeLineItem {
  code?: string | number;
  description?: string;
  quantity?: string | number;
  unit?: string;
  notes?: string;
}

interface CodeReference {
  jurisdiction?: string;
  reference?: string;
  note?: string;
}

interface DamageJson {
  summary?: (string | unknown)[];
  scope?: ScopeLineItem[];
  codes?: CodeReference[];
  materials?: (string | unknown)[];
  safety?: (string | unknown)[];
  assumptions?: (string | unknown)[];
}

export async function buildDamagePdf(params: {
  json: DamageJson;
  meta: {
    address: string;
    dateOfLoss: string;
    roofType: string;
    roofSqft: number;
    orgName?: string;
  };
}): Promise<{ filePath: string; publicUrl: string }> {
  const { json, meta } = params;
  const outDir = path.join(process.cwd(), "public", "reports");
  if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true });

  const stamp = Date.now();
  const fileName = `damage_report_${stamp}.pdf`;
  const filePath = path.join(outDir, fileName);
  const doc = new PDFDocument({ size: "LETTER", margin: 36 });
  const stream = createWriteStream(filePath);
  doc.pipe(stream);

  // Header
  doc
    .fontSize(16)
    .text(meta.orgName || "SkaiScraper", { continued: true })
    .fontSize(10)
    .text(`  |  AI Damage Builder v2`);
  doc.moveDown(0.5);
  doc.fontSize(10).text(`Address: ${meta.address}`);
  doc.text(
    `Date of Loss: ${meta.dateOfLoss}   •   Roof: ${meta.roofType}   •   Sqft: ${meta.roofSqft}`
  );
  doc.moveDown();

  // Summary
  doc.fontSize(12).text("Summary", { underline: true });
  (json.summary || []).forEach((s) => {
    const text = typeof s === "string" ? s : String(s || "");
    doc.text(`• ${text}`);
  });
  doc.moveDown();

  // Scope
  doc.fontSize(12).text("Scope of Work", { underline: true });
  (json.scope || []).forEach((li, idx) => {
    const code = typeof li.code === "string" ? li.code : String(li.code || "");
    const description =
      typeof li.description === "string" ? li.description : String(li.description || "");
    const quantity =
      typeof li.quantity === "number" || typeof li.quantity === "string" ? li.quantity : "";
    const unit = typeof li.unit === "string" ? li.unit : String(li.unit || "");
    const notes = li.notes && typeof li.notes === "string" ? ` (${li.notes})` : "";

    doc.fontSize(10).text(`${idx + 1}. [${code}] ${description} — ${quantity} ${unit}${notes}`);
  });
  doc.moveDown();

  // Codes
  doc.fontSize(12).text("Code References", { underline: true });
  (json.codes || []).forEach((c) => {
    const jurisdiction =
      typeof c.jurisdiction === "string" ? c.jurisdiction : String(c.jurisdiction || "");
    const reference = typeof c.reference === "string" ? c.reference : String(c.reference || "");
    const note = typeof c.note === "string" ? c.note : String(c.note || "");
    doc.fontSize(10).text(`• ${jurisdiction}: ${reference} — ${note}`);
  });
  doc.moveDown();

  // Materials
  doc.fontSize(12).text("Materials", { underline: true });
  (json.materials || []).forEach((m) => {
    const text = typeof m === "string" ? m : String(m || "");
    doc.fontSize(10).text(`• ${text}`);
  });
  doc.moveDown();

  // Safety & Assumptions
  doc.fontSize(12).text("Safety", { underline: true });
  (json.safety || []).forEach((m) => {
    const text = typeof m === "string" ? m : String(m || "");
    doc.fontSize(10).text(`• ${text}`);
  });
  doc.moveDown();

  doc.fontSize(12).text("Assumptions", { underline: true });
  (json.assumptions || []).forEach((m) => {
    const text = typeof m === "string" ? m : String(m || "");
    doc.fontSize(10).text(`• ${text}`);
  });

  doc.end();

  await new Promise<void>((resolve) => stream.on("finish", () => resolve()));
  // Public URL (served from /public)
  return { filePath, publicUrl: `/reports/${fileName}` };
}
