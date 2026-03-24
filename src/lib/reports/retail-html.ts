/**
 * Retail estimate HTML template builder
 * Generates formatted HTML for retail estimate PDF reports
 */

import { AZ_DEFAULT_TAX_RATE } from "@/lib/constants/taxRates";

interface RetailEstimateItem {
  id: string;
  quantity: number;
  unitPrice?: number | null;
  lineTotal?: number | null;
  product?: {
    id: string;
    name: string;
    spec?: string | null;
    dataSheetUrl?: string | null;
  } | null;
}

interface RetailHtmlParams {
  estimateId: string;
  items: RetailEstimateItem[];
  customerName?: string;
  customerAddress?: string;
  orgName?: string;
  generatedAt?: Date;
}

/**
 * Format cents to dollar string
 */
function formatCurrency(cents: number | null | undefined): string {
  if (cents === null || cents === undefined) return "$0.00";
  return `$${(cents / 100).toFixed(2)}`;
}

/**
 * Build HTML for retail estimate
 * @param params - Estimate parameters
 * @returns Formatted HTML string
 */
export async function buildRetailHtml({
  estimateId,
  items,
  customerName = "Customer",
  customerAddress,
  orgName = "SkaiScraper",
  generatedAt = new Date(),
}: RetailHtmlParams): Promise<string> {
  let subtotal = 0;

  const rows = items
    .map((item) => {
      const unitPrice = item.unitPrice ?? 0;
      const lineTotal = item.lineTotal ?? unitPrice * item.quantity;
      subtotal += lineTotal;

      return `
    <tr>
      <td>${item.product?.name ?? "Unknown Product"}</td>
      <td class="center">${item.quantity}</td>
      <td class="right">${formatCurrency(unitPrice)}</td>
      <td class="right total">${formatCurrency(lineTotal)}</td>
    </tr>
  `;
    })
    .join("");

  const tax = Math.round(subtotal * AZ_DEFAULT_TAX_RATE); // canonical AZ default
  const total = subtotal + tax;

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Retail Estimate - ${estimateId}</title>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 
                   'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
      padding: 32px;
      background: #ffffff;
      color: #1e293b;
      line-height: 1.6;
    }
    
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      border-bottom: 3px solid #10b981;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    
    .header-left h1 {
      font-size: 32px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 4px;
    }
    
    .company-name {
      color: #64748b;
      font-size: 16px;
    }
    
    .header-right {
      text-align: right;
    }
    
    .estimate-id {
      font-family: 'Courier New', monospace;
      background: #f1f5f9;
      padding: 6px 12px;
      border-radius: 4px;
      font-size: 14px;
      color: #475569;
      margin-bottom: 8px;
      display: inline-block;
    }
    
    .date {
      color: #64748b;
      font-size: 12px;
    }
    
    .customer-info {
      background: #f8fafc;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    
    .customer-info h2 {
      font-size: 14px;
      font-weight: 600;
      color: #475569;
      margin-bottom: 8px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    
    .customer-info p {
      font-size: 14px;
      color: #334155;
      line-height: 1.6;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 24px;
      box-shadow: 0 1px 3px rgba(0,0,0,0.1);
    }
    
    thead {
      background: #f8fafc;
      border-bottom: 2px solid #e2e8f0;
    }
    
    th {
      padding: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      text-align: left;
    }
    
    th.center, td.center {
      text-align: center;
    }
    
    th.right, td.right {
      text-align: right;
    }
    
    tbody tr {
      border-bottom: 1px solid #e2e8f0;
    }
    
    tbody tr:hover {
      background: #f8fafc;
    }
    
    td {
      padding: 12px;
      font-size: 13px;
      color: #334155;
    }
    
    td.total {
      font-weight: 600;
      color: #0f172a;
    }
    
    .summary {
      margin-top: 32px;
      display: flex;
      justify-content: flex-end;
    }
    
    .summary-box {
      width: 300px;
      border: 2px solid #e2e8f0;
      border-radius: 8px;
      overflow: hidden;
    }
    
    .summary-row {
      display: flex;
      justify-content: space-between;
      padding: 12px 16px;
      font-size: 14px;
    }
    
    .summary-row:not(:last-child) {
      border-bottom: 1px solid #e2e8f0;
    }
    
    .summary-row.subtotal {
      color: #475569;
    }
    
    .summary-row.tax {
      color: #64748b;
      font-size: 13px;
    }
    
    .summary-row.total {
      background: #10b981;
      color: white;
      font-weight: 700;
      font-size: 18px;
    }
    
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
      text-align: center;
    }
    
    @media print {
      body {
        padding: 16px;
      }
      
      table {
        page-break-inside: auto;
      }
      
      tr {
        page-break-inside: avoid;
        page-break-after: auto;
      }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-left">
      <h1>Retail Estimate</h1>
      <p class="company-name">${orgName}</p>
    </div>
    <div class="header-right">
      <div class="estimate-id">EST-${estimateId.slice(0, 8).toUpperCase()}</div>
      <p class="date">${generatedAt.toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })}</p>
    </div>
  </div>

  <div class="customer-info">
    <h2>Prepared For</h2>
    <p><strong>${customerName}</strong></p>
    ${customerAddress ? `<p>${customerAddress}</p>` : ""}
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th class="center">Quantity</th>
        <th class="right">Unit Price</th>
        <th class="right">Line Total</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="4" style="text-align: center; color: #94a3b8; padding: 24px;">No items in this estimate</td></tr>'}
    </tbody>
  </table>

  <div class="summary">
    <div class="summary-box">
      <div class="summary-row subtotal">
        <span>Subtotal</span>
        <span>${formatCurrency(subtotal)}</span>
      </div>
      <div class="summary-row tax">
        <span>Tax (8.25%)</span>
        <span>${formatCurrency(tax)}</span>
      </div>
      <div class="summary-row total">
        <span>Total</span>
        <span>${formatCurrency(total)}</span>
      </div>
    </div>
  </div>

  <div class="footer">
    <p>This estimate is valid for 30 days from the date of issue.</p>
    <p>Thank you for your business!</p>
  </div>
</body>
</html>
  `.trim();
}
