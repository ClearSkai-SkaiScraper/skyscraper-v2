import { logger } from "@/lib/logger";

/**
 * PHASE 39: Estimator Engine
 *
 * Converts SkaiPDF scope into carrier-importable estimate formats:
 * - Xactimate ESX-compatible XML
 * - Symbility D22-style JSON
 */

interface ScopeItem {
  code: string;
  description: string;
  quantity: number;
  unit: string;
  slopeId?: string;
  justification: string;
  notes?: string;
}

interface ParsedScope {
  items: Array<{
    code: string;
    description: string;
    qty: number;
    units: string;
    slope?: string;
    justification: string;
    notes?: string;
  }>;
}

interface Lead {
  id: string;
  name?: string;
  address?: string;
  dateOfLoss?: string;
  claimNumber?: string;
}

/**
 * Parse and normalize scope JSON from ClaimWriter
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseScope(scopeJson: any): ParsedScope {
  try {
    const items = Array.isArray(scopeJson?.items) ? scopeJson.items : [];

    return {
      items: items.map((item: ScopeItem) => ({
        code: item.code || "UNKNOWN",
        description: item.description || "Unknown Item",
        qty: item.quantity || 0,
        units: item.unit || "EA",
        slope: item.slopeId,
        justification: item.justification || "",
        notes: item.notes,
      })),
    };
  } catch (error) {
    logger.error("[parseScope] Error:", error);
    throw new Error("Failed to parse scope JSON");
  }
}

/**
 * Build Xactimate ESX-compatible XML
 * Format designed to import into Xactimate X1
 */
export function buildXactimateXml(
  scope: ParsedScope,
  lead: Lead,
  pricing?: Array<{ code: string; unitPrice: number; tax: number; op: number; total: number }>
): string {
  const escapeXml = (str: string) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
  };

  const timestamp = new Date().toISOString();
  const claimNumber = lead.claimNumber || lead.id;

  const lineItemsXml = scope.items
    .map((item) => {
      const pricingInfo = pricing?.find((p) => p.code === item.code);
      return `    <item>
      <code>${escapeXml(item.code)}</code>
      <description>${escapeXml(item.description)}</description>
      <quantity>${item.qty.toFixed(2)}</quantity>
      <unit>${escapeXml(item.units)}</unit>
      ${pricingInfo ? `<unitPrice>${pricingInfo.unitPrice.toFixed(2)}</unitPrice>` : ""}
      ${pricingInfo ? `<tax>${pricingInfo.tax.toFixed(2)}</tax>` : ""}
      ${pricingInfo ? `<oandp>${pricingInfo.op.toFixed(2)}</oandp>` : ""}
      ${pricingInfo ? `<total>${pricingInfo.total.toFixed(2)}</total>` : ""}
      <notes>${escapeXml(item.justification)}${item.notes ? ` - ${escapeXml(item.notes)}` : ""}</notes>
      ${item.slope ? `<slopeReference>${escapeXml(item.slope)}</slopeReference>` : ""}
    </item>`;
    })
    .join("\n");

  return `<?xml version="1.0" encoding="UTF-8"?>
<estimate xmlns="http://www.xactware.com/xactimate" version="28.0">
  <header>
    <claimNumber>${escapeXml(claimNumber)}</claimNumber>
    <insured_name>${escapeXml(lead.name || "Unknown")}</insured_name>
    <propertyAddress>${escapeXml(lead.address || "")}</propertyAddress>
    <lossDate>${escapeXml(lead.dateOfLoss || "")}</lossDate>
    <generatedBy>SkaiPDF</generatedBy>
    <generatedDate>${timestamp}</generatedDate>
    <estimateType>Roof Damage</estimateType>
  </header>
  <lineItems>
${lineItemsXml}
  </lineItems>
  <metadata>
    <source>SkaiPDF Claim Writer</source>
    <aiGenerated>true</aiGenerated>
    <version>1.0</version>
  </metadata>
</estimate>`;
}

/**
 * Build Symbility D22-style JSON
 * Format designed to import into Symbility Claims
 */
export function buildSymbilityJson(
  scope: ParsedScope,
  lead: Lead,
  pricing?: Array<{ code: string; unitPrice: number; tax: number; op: number; total: number }>
// eslint-disable-next-line @typescript-eslint/no-explicit-any
): Record<string, any> {
  return {
    ClaimInfo: {
      ClaimNumber: lead.claimNumber || lead.id,
      InsuredName: lead.name || "Unknown",
      LossAddress: lead.address || "",
      LossDate: lead.dateOfLoss || "",
      EstimateDate: new Date().toISOString().split("T")[0],
      EstimateType: "Roof Damage - Storm Loss",
      PreparedBy: "SkaiPDF",
    },
    PropertyInfo: {
      Address: lead.address || "",
      PropertyType: "Residential",
    },
    LineItems: scope.items.map((item) => {
      const pricingInfo = pricing?.find((p) => p.code === item.code);
      return {
        Code: item.code,
        Description: item.description,
        Quantity: item.qty,
        Unit: item.units,
        ...(pricingInfo && {
          Pricing: {
            UnitPrice: pricingInfo.unitPrice,
            Tax: pricingInfo.tax,
            OandP: pricingInfo.op,
            Total: pricingInfo.total,
          },
        }),
        Notes: item.justification,
        AdditionalNotes: item.notes || "",
        Category: getCategoryFromCode(item.code),
        SlopeReference: item.slope || null,
      };
    }),
    Summary: {
      TotalLineItems: scope.items.length,
      GeneratedBy: "SkaiPDF Claim Writer",
      AIGenerated: true,
      Version: "1.0",
    },
  };
}

/**
 * Helper: Determine category from Xactimate code
 */
function getCategoryFromCode(code: string): string {
  if (code.startsWith("RFG")) return "Roofing - General";
  if (code.startsWith("DRP")) return "Roofing - Drip Edge";
  if (code.startsWith("PJK")) return "Roofing - Penetrations";
  if (code.startsWith("VNT")) return "Roofing - Ventilation";
  if (code.startsWith("UND")) return "Roofing - Underlayment";
  if (code.startsWith("STR")) return "Roofing - Starter";
  if (code.startsWith("VAL")) return "Roofing - Valleys";
  if (code.startsWith("DEC")) return "Roofing - Decking";
  if (code === "STEEP") return "Roofing - Steep Charge";
  return "Roofing - Other";
}

/**
 * Build human-readable estimate summary
 */
export function buildEstimateSummary(scope: ParsedScope): string {
  const totalItems = scope.items.length;

  // Group items by category
  const roofing = scope.items.filter((i) => i.code.startsWith("RFG"));
  const drip = scope.items.filter((i) => i.code.startsWith("DRP"));
  const vents = scope.items.filter((i) => i.code.startsWith("VNT"));
  const jacks = scope.items.filter((i) => i.code.startsWith("PJK"));
  const other = scope.items.filter(
    (i) =>
      !i.code.startsWith("RFG") &&
      !i.code.startsWith("DRP") &&
      !i.code.startsWith("VNT") &&
      !i.code.startsWith("PJK")
  );

  const lines: string[] = [];

  if (roofing.length > 0) {
    const sq = roofing.find((i) => i.units === "SQ");
    if (sq) {
      lines.push(`${sq.qty} squares of roofing material`);
    }
  }

  if (drip.length > 0) {
    const lf = drip.reduce((sum, i) => sum + (i.units === "LF" ? i.qty : 0), 0);
    if (lf > 0) lines.push(`${lf} linear feet of drip edge`);
  }

  if (vents.length > 0) {
    const count = vents.reduce((sum, i) => sum + i.qty, 0);
    if (count > 0) lines.push(`${count} roof vents`);
  }

  if (jacks.length > 0) {
    const count = jacks.reduce((sum, i) => sum + i.qty, 0);
    if (count > 0) lines.push(`${count} pipe jacks`);
  }

  if (other.length > 0) {
    lines.push(`${other.length} additional line items (underlayment, flashing, etc.)`);
  }

  return `Roof Replacement Estimate Summary

This estimate includes ${totalItems} line items for complete roof replacement:

${lines.map((l) => `• ${l}`).join("\n")}

This scope has been generated using AI-assisted analysis of drone footage, damage detection, and slope measurements. All line items include detailed justifications and are ready for adjuster review.

The estimate is provided in industry-standard formats:
- Xactimate ESX XML (importable into Xactimate X1)
- Symbility D22 JSON (importable into Symbility Claims)

For questions or additional details, refer to the complete claim documentation package.`;
}
