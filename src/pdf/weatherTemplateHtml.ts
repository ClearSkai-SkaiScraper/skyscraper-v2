// src/pdf/weatherTemplateHtml.ts

export function htmlTemplate({
  lat,
  lon,
  dol,
  scored,
  summary,
  branding = {},
}: {
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
  const brand = {
    primary: branding.primary || "#117CFF",
    secondary: branding.secondary || "#FFC838",
    background: branding.background || "#0A1A2F",
    logoUrl: branding.logoUrl || "https://skaiscrape.com/logo-dark.png",
    companyName: branding.companyName || "SkaiScraper™ Weather Intelligence",
  };

  return `
  <!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="UTF-8" />
    <title>Weather Verification Report</title>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;600;700&display=swap');
      body {
        font-family: 'Inter', sans-serif;
        margin: 0;
        padding: 0;
        color: white;
        background: ${brand.background};
      }
      h1, h2, h3 { color: ${brand.primary}; margin: 0 0 8px; }
      .section { padding: 24px 36px; }
      .header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        border-bottom: 2px solid ${brand.primary};
        padding: 24px 36px;
        background: #0f172a;
      }
      .logo {
        height: 50px;
        width: auto;
      }
      .table {
        width: 100%;
        border-collapse: collapse;
        margin-top: 16px;
      }
      .table th, .table td {
        border: 1px solid #444;
        padding: 8px 12px;
        font-size: 13px;
      }
      .table th {
        background: #1e293b;
        color: ${brand.secondary};
      }
      .pill {
        display: inline-block;
        background: ${brand.primary};
        padding: 6px 12px;
        border-radius: 6px;
        font-size: 12px;
        color: white;
        margin-right: 6px;
      }
    </style>
  </head>
  <body>

    <div class="header">
      <img src="${brand.logoUrl}" class="logo" />
      <div style="text-align:right">
        <h2>${brand.companyName}</h2>
        <p style="font-size:13px; opacity:.7">Claims-Ready Weather Verification</p>
      </div>
    </div>

    <div class="section">
      <h1>Weather Verification Report</h1>
      <p><strong>Property:</strong> ${lat}, ${lon}</p>
      <p><strong>Recommended Date of Loss:</strong> ${dol?.recommended_date_utc || "N/A"}</p>
      <p><strong>Confidence:</strong> ${((dol?.confidence || 0) * 100).toFixed(1)}%</p>
    </div>

    <div class="section">
      <h2>AI Summary</h2>
      <p>${summary}</p>
    </div>

    <div class="section">
      <h2>Event Proximity Table</h2>
      <table class="table">
        <tr>
          <th>Type</th>
          <th>Magnitude</th>
          <th>Distance (mi)</th>
          <th>Time (UTC)</th>
          <th>Source</th>
        </tr>
        ${scored
          .slice(0, 10)
          .map(
            (ev) => `
          <tr>
            <td>${ev.type}</td>
            <td>${ev.magnitude ?? "-"}</td>
            <td>${ev.distance_miles.toFixed(2)}</td>
            <td>${ev.time_utc}</td>
            <td>${ev.source}</td>
          </tr>`
          )
          .join("")}
      </table>
    </div>

    <div class="section">
      <h2>Data Sources</h2>
      <p class="pill">NWS CAP Alerts</p>
      <p class="pill">Iowa Mesonet</p>
      <p class="pill">Derived Radar Intelligence</p>
    </div>

  </body>
  </html>
  `;
}
