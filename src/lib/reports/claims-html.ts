/**
 * Claims report HTML template builder
 * Generates formatted HTML for claims PDF reports
 */

interface ClaimMaterial {
  id: string;
  quantity: number;
  unitPrice?: number | null;
  spec?: string | null;
  warranty?: string | null;
  color?: string | null;
  product?: {
    id: string;
    name: string;
    spec?: string | null;
    warranty?: string | null;
    dataSheetUrl?: string | null;
  } | null;
}

interface ClaimHtmlParams {
  claimId: string;
  materials: ClaimMaterial[];
  orgName?: string;
  generatedAt?: Date;
}

/**
 * Build HTML for claims report
 * @param params - Report parameters
 * @returns Formatted HTML string
 */
export async function buildClaimHtml({
  claimId,
  materials,
  orgName = "SkaiScraper",
  generatedAt = new Date(),
}: ClaimHtmlParams): Promise<string> {
  const rows = materials
    .map(
      (m) => `
    <tr>
      <td>${m.product?.name ?? "Unknown Product"}</td>
      <td>${m.quantity}</td>
      <td>${m.spec ?? m.product?.spec ?? "-"}</td>
      <td>${m.warranty ?? m.product?.warranty ?? "-"}</td>
      <td>${m.color ?? "-"}</td>
      <td>${m.product?.dataSheetUrl ? `<a href="${m.product.dataSheetUrl}" target="_blank">View</a>` : "-"}</td>
    </tr>
  `
    )
    .join("");

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Claims Report - ${claimId}</title>
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
      border-bottom: 3px solid #2563eb;
      padding-bottom: 16px;
      margin-bottom: 24px;
    }
    
    h1 {
      font-size: 28px;
      font-weight: 700;
      color: #0f172a;
      margin-bottom: 8px;
    }
    
    .subtitle {
      color: #64748b;
      font-size: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    
    .claim-id {
      font-family: 'Courier New', monospace;
      background: #f1f5f9;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
      color: #475569;
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
      text-align: left;
      padding: 12px;
      font-size: 12px;
      font-weight: 600;
      color: #475569;
      text-transform: uppercase;
      letter-spacing: 0.5px;
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
    
    td a {
      color: #2563eb;
      text-decoration: none;
      font-weight: 500;
    }
    
    td a:hover {
      text-decoration: underline;
    }
    
    .footer {
      margin-top: 32px;
      padding-top: 16px;
      border-top: 1px solid #e2e8f0;
      color: #64748b;
      font-size: 12px;
    }
    
    .footer-note {
      margin-top: 8px;
      font-style: italic;
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
    <h1>Claims Materials Report</h1>
    <div class="subtitle">
      <span>${orgName}</span>
      <span class="claim-id">Claim ID: ${claimId}</span>
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th>Product</th>
        <th>Qty</th>
        <th>Specification</th>
        <th>Warranty</th>
        <th>Color</th>
        <th>Data Sheet</th>
      </tr>
    </thead>
    <tbody>
      ${rows || '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 24px;">No materials added to this claim</td></tr>'}
    </tbody>
  </table>

  <div class="footer">
    <p>Generated on ${generatedAt.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })}</p>
    <p class="footer-note">
      This report includes specification sheets and warranty references when available.
      For complete product details, refer to the data sheet links.
    </p>
  </div>
</body>
</html>
  `.trim();
}
