/**
 * Repair Line Items Generator
 *
 * Converts damage analysis into structured repair line items.
 * Categorized by trade, ready for carrier submission or contractor bidding.
 */

export interface LineItem {
  id: string;
  trade: "roofing" | "siding" | "gutters" | "painting" | "general" | "structural";
  category: string;
  description: string;
  quantity: number;
  unit: "SQ" | "LF" | "EA" | "SF" | "HR";
  unitPrice?: number;
  totalPrice?: number;
  priority: "critical" | "high" | "medium" | "low";
  damageType: string;
  affectedArea: string;
  notes?: string;
}

export interface LineItemsReport {
  claimId: string;
  generatedAt: Date;
  items: LineItem[];
  tradeSubtotals: Record<string, number>;
  grandTotal: number;
  itemCount: number;
}

/**
 * Generate line items from Storm Intake analysis
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function generateLineItems(analysis: any, claimId: string): LineItemsReport {
  const items: LineItem[] = [];
  let itemCounter = 1;

  // ROOFING LINE ITEMS
  if (analysis.damageAnalysis?.hailDamage?.detected) {
    const roofArea = analysis.roofMetrics?.estimatedArea || 2500;
    const squares = Math.ceil(roofArea / 100);

    items.push({
      id: `LI-${String(itemCounter++).padStart(3, "0")}`,
      trade: "roofing",
      category: "Roof System",
      description: "Remove existing roof system - all layers",
      quantity: squares,
      unit: "SQ",
      unitPrice: 75,
      totalPrice: squares * 75,
      priority: "high",
      damageType: "hail",
      affectedArea: "Full roof",
      notes: "Hail damage throughout - full replacement required",
    });

    items.push({
      id: `LI-${String(itemCounter++).padStart(3, "0")}`,
      trade: "roofing",
      category: "Roof System",
      description: "Install architectural shingles (30-year)",
      quantity: squares,
      unit: "SQ",
      unitPrice: 350,
      totalPrice: squares * 350,
      priority: "high",
      damageType: "hail",
      affectedArea: "Full roof",
    });

    items.push({
      id: `LI-${String(itemCounter++).padStart(3, "0")}`,
      trade: "roofing",
      category: "Underlayment",
      description: "Install synthetic underlayment",
      quantity: squares,
      unit: "SQ",
      unitPrice: 45,
      totalPrice: squares * 45,
      priority: "high",
      damageType: "hail",
      affectedArea: "Full roof",
    });

    items.push({
      id: `LI-${String(itemCounter++).padStart(3, "0")}`,
      trade: "roofing",
      category: "Flashing",
      description: "Replace pipe flashing boots",
      quantity: 4,
      unit: "EA",
      unitPrice: 45,
      totalPrice: 180,
      priority: "medium",
      damageType: "hail",
      affectedArea: "Roof penetrations",
    });

    items.push({
      id: `LI-${String(itemCounter++).padStart(3, "0")}`,
      trade: "roofing",
      category: "Ridge/Hip",
      description: "Install ridge cap shingles",
      quantity: 40,
      unit: "LF",
      unitPrice: 12,
      totalPrice: 480,
      priority: "high",
      damageType: "hail",
      affectedArea: "Ridge lines",
    });
  }

  if (analysis.damageAnalysis?.windDamage?.detected) {
    if (analysis.damageAnalysis.windDamage.missingShingles) {
      items.push({
        id: `LI-${String(itemCounter++).padStart(3, "0")}`,
        trade: "roofing",
        category: "Roof Repair",
        description: "Replace missing/damaged shingles",
        quantity: 3,
        unit: "SQ",
        unitPrice: 450,
        totalPrice: 1350,
        priority: "high",
        damageType: "wind",
        affectedArea: "Edges and exposed areas",
        notes: "Wind damage - spot replacement",
      });
    }

    items.push({
      id: `LI-${String(itemCounter++).padStart(3, "0")}`,
      trade: "roofing",
      category: "Flashing",
      description: "Repair/replace damaged flashing",
      quantity: 20,
      unit: "LF",
      unitPrice: 18,
      totalPrice: 360,
      priority: "high",
      damageType: "wind",
      affectedArea: "Edges and valleys",
    });
  }

  // GUTTERS
  if (
    analysis.damageAnalysis?.hailDamage?.detected ||
    analysis.damageAnalysis?.windDamage?.detected
  ) {
    items.push({
      id: `LI-${String(itemCounter++).padStart(3, "0")}`,
      trade: "gutters",
      category: "Gutter System",
      description: "Replace damaged gutters",
      quantity: 80,
      unit: "LF",
      unitPrice: 15,
      totalPrice: 1200,
      priority: "medium",
      damageType: "hail",
      affectedArea: "Perimeter",
    });

    items.push({
      id: `LI-${String(itemCounter++).padStart(3, "0")}`,
      trade: "gutters",
      category: "Gutter System",
      description: "Replace downspouts",
      quantity: 4,
      unit: "EA",
      unitPrice: 125,
      totalPrice: 500,
      priority: "medium",
      damageType: "hail",
      affectedArea: "Corners",
    });
  }

  // STRUCTURAL (if needed)
  if (analysis.damageAnalysis?.structuralIssues?.detected) {
    items.push({
      id: `LI-${String(itemCounter++).padStart(3, "0")}`,
      trade: "structural",
      category: "Decking",
      description: "Replace damaged roof decking",
      quantity: 200,
      unit: "SF",
      unitPrice: 3.5,
      totalPrice: 700,
      priority: "critical",
      damageType: "structural",
      affectedArea: "Damaged sections",
      notes: "Requires inspection before final scope",
    });

    items.push({
      id: `LI-${String(itemCounter++).padStart(3, "0")}`,
      trade: "structural",
      category: "Engineering",
      description: "Structural engineering inspection",
      quantity: 1,
      unit: "EA",
      unitPrice: 500,
      totalPrice: 500,
      priority: "critical",
      damageType: "structural",
      affectedArea: "Overall structure",
    });
  }

  // GENERAL
  items.push({
    id: `LI-${String(itemCounter++).padStart(3, "0")}`,
    trade: "general",
    category: "Protection",
    description: "Tarping/temporary protection",
    quantity: 1,
    unit: "EA",
    unitPrice: 350,
    totalPrice: 350,
    priority: "critical",
    damageType: "general",
    affectedArea: "Overall",
    notes: "If immediate protection needed",
  });

  items.push({
    id: `LI-${String(itemCounter++).padStart(3, "0")}`,
    trade: "general",
    category: "Cleanup",
    description: "Debris removal and cleanup",
    quantity: 1,
    unit: "EA",
    unitPrice: 750,
    totalPrice: 750,
    priority: "medium",
    damageType: "general",
    affectedArea: "Property",
  });

  // Calculate subtotals by trade
  const tradeSubtotals: Record<string, number> = {};
  items.forEach((item) => {
    const total = item.totalPrice || 0;
    tradeSubtotals[item.trade] = (tradeSubtotals[item.trade] || 0) + total;
  });

  const grandTotal = Object.values(tradeSubtotals).reduce((sum, val) => sum + val, 0);

  return {
    claimId,
    generatedAt: new Date(),
    items,
    tradeSubtotals,
    grandTotal,
    itemCount: items.length,
  };
}

/**
 * Format line items as CSV
 */
export function exportLineItemsCSV(report: LineItemsReport): string {
  const lines: string[] = [];

  // Header
  lines.push(
    "ID,Trade,Category,Description,Quantity,Unit,Unit Price,Total,Priority,Damage Type,Affected Area,Notes"
  );

  // Items
  report.items.forEach((item) => {
    lines.push(
      [
        item.id,
        item.trade,
        item.category,
        `"${item.description}"`,
        item.quantity,
        item.unit,
        item.unitPrice || "",
        item.totalPrice || "",
        item.priority,
        item.damageType,
        item.affectedArea,
        `"${item.notes || ""}"`,
      ].join(",")
    );
  });

  // Subtotals
  lines.push("");
  lines.push("TRADE SUBTOTALS");
  Object.entries(report.tradeSubtotals).forEach(([trade, total]) => {
    lines.push(`${trade.toUpperCase()},,,,,,$${total.toFixed(2)}`);
  });

  lines.push("");
  lines.push(`GRAND TOTAL,,,,,,$${report.grandTotal.toFixed(2)}`);

  return lines.join("\n");
}

/**
 * Format line items as human-readable text
 */
export function exportLineItemsText(report: LineItemsReport): string {
  const lines: string[] = [];

  lines.push("═══════════════════════════════════════");
  lines.push("     REPAIR LINE ITEMS BREAKDOWN");
  lines.push("═══════════════════════════════════════");
  lines.push("");
  lines.push(`Claim ID: ${report.claimId}`);
  lines.push(`Generated: ${report.generatedAt.toLocaleString()}`);
  lines.push(`Total Items: ${report.itemCount}`);
  lines.push("");

  // Group by trade
  const trades = Array.from(new Set(report.items.map((i) => i.trade)));

  trades.forEach((trade) => {
    const tradeItems = report.items.filter((i) => i.trade === trade);

    lines.push("───────────────────────────────────────");
    lines.push(`${trade.toUpperCase()}`);
    lines.push("───────────────────────────────────────");

    tradeItems.forEach((item) => {
      lines.push(`[${item.id}] ${item.description}`);
      lines.push(
        `  Qty: ${item.quantity} ${item.unit} @ $${item.unitPrice || 0} = $${item.totalPrice || 0}`
      );
      lines.push(`  Priority: ${item.priority.toUpperCase()}`);
      lines.push(`  Area: ${item.affectedArea}`);
      if (item.notes) {
        lines.push(`  Notes: ${item.notes}`);
      }
      lines.push("");
    });

    lines.push(`SUBTOTAL (${trade}): $${report.tradeSubtotals[trade].toFixed(2)}`);
    lines.push("");
  });

  lines.push("═══════════════════════════════════════");
  lines.push(`GRAND TOTAL: $${report.grandTotal.toFixed(2)}`);
  lines.push("═══════════════════════════════════════");

  return lines.join("\n");
}
