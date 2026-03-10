/**
 * ============================================================================
 * QUICK WEATHER VERIFICATION — ONE-PAGE PDF
 * ============================================================================
 *
 * POST /api/claims/[claimId]/weather/quick-verify
 *
 * Pulls the biggest hail & wind events within 12 months of the property,
 * scores them by proximity + magnitude, then generates a branded one-page
 * PDF that verifies and justifies the loss.
 *
 * Data sources (100% free, no API keys):
 *   - Iowa State Mesonet  → hail & wind storm reports
 *   - NWS CAP Alerts      → severe weather warnings
 *
 * ============================================================================
 */

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

import { getOrgClaimOrThrow, OrgScopeError } from "@/lib/auth/orgScope";
import { withAuth } from "@/lib/auth/withAuth";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { htmlToPdfBuffer } from "@/lib/reports/pdf-utils";
import { capToEvents, fetchCAPAlerts } from "@/lib/weather/cap";
import { fetchMesonetReports, mesonetToEvents } from "@/lib/weather/mesonet";
import { pickQuickDOL, scoreEventsForProperty } from "@/lib/weather/score";
import type { DOLResult, ScoredEvent } from "@/types/weather";

export const POST = withAuth(
  async (
    req: NextRequest,
    { orgId, userId },
    routeParams: { params: Promise<{ claimId: string }> }
  ) => {
    try {
      const { claimId } = await routeParams.params;
      await getOrgClaimOrThrow(orgId, claimId);

      // Fetch claim + property for geo data
      const claim = await prisma.claims.findUnique({
        where: { id: claimId },
        select: {
          claimNumber: true,
          title: true,
          damageType: true,
          dateOfLoss: true,
          insured_name: true,
          carrier: true,
          policy_number: true,
          adjusterName: true,
          adjusterPhone: true,
          adjusterEmail: true,
          properties: {
            select: {
              street: true,
              city: true,
              state: true,
              zipCode: true,
            },
          },
        },
      });

      if (!claim) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }

      // Geocode property address to get lat/lon
      const address = claim.properties
        ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`
        : null;

      if (!address) {
        return NextResponse.json({ error: "No property address available" }, { status: 400 });
      }

      const geo = await geocodeAddress(address);
      if (!geo) {
        return NextResponse.json({ error: "Could not geocode property address" }, { status: 400 });
      }
      const { lat, lon } = geo;

      // Scan window: 12 months back from now (or from date of loss if set)
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - 12);

      const bbox = `${lon - 1.5},${lat - 1.5},${lon + 1.5},${lat + 1.5}`;
      const startIso = startDate.toISOString();
      const endIso = endDate.toISOString();

      // Fetch events from free sources in parallel
      const [mesonetReports, capAlerts] = await Promise.all([
        fetchMesonetReports({ bbox, startIso, endIso }).catch((err) => {
          logger.warn("[quick-verify] Mesonet fetch failed:", err);
          return [];
        }),
        fetchCAPAlerts({ bbox, startIso, endIso }).catch((err) => {
          logger.warn("[quick-verify] CAP fetch failed:", err);
          return [];
        }),
      ]);

      // Convert to WeatherEvents and score
      const allEvents = [...mesonetToEvents(mesonetReports), ...capToEvents(capAlerts)];
      const { scored, byDate } = scoreEventsForProperty(allEvents, { lat, lon });

      // Get top hail events (sorted by magnitude desc)
      const topHail = scored
        .filter((e) => e.type === "hail_report" && (e.magnitude ?? 0) > 0)
        .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))
        .slice(0, 5);

      // Get top wind events (sorted by magnitude desc)
      const topWind = scored
        .filter((e) => e.type === "wind_report" && (e.magnitude ?? 0) > 0)
        .sort((a, b) => (b.magnitude ?? 0) - (a.magnitude ?? 0))
        .slice(0, 5);

      // Get severe warnings
      const warnings = scored
        .filter((e) => e.type === "svr_warning" || e.type === "tor_warning")
        .sort((a, b) => b.score - a.score)
        .slice(0, 3);

      // Best DOL recommendation
      const dol = pickQuickDOL(scored, byDate);

      // Fetch org branding
      const [org, branding] = await Promise.all([
        prisma.org.findUnique({ where: { id: orgId }, select: { name: true } }).catch(() => null),
        prisma.org_branding
          .findFirst({
            where: { orgId },
            select: {
              logoUrl: true,
              colorPrimary: true,
              phone: true,
              email: true,
              website: true,
              license: true,
            },
          })
          .catch(() => null),
      ]);

      const propertyAddress = claim.properties
        ? `${claim.properties.street}, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`
        : "N/A";

      const companyName = org?.name || "SkaiScraper";
      const primaryColor = branding?.colorPrimary || "#1e3a8a";

      // Generate one-page branded HTML
      const html = buildQuickVerifyHTML({
        companyName,
        primaryColor,
        logoUrl: branding?.logoUrl || undefined,
        phone: branding?.phone || undefined,
        email: branding?.email || undefined,
        website: branding?.website || undefined,
        license: branding?.license || undefined,
        claimNumber: claim.claimNumber,
        insuredName: claim.insured_name || "N/A",
        propertyAddress,
        dateOfLoss: claim.dateOfLoss
          ? new Date(claim.dateOfLoss).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })
          : "Not set",
        carrier: claim.carrier || "N/A",
        policyNumber: claim.policy_number || "N/A",
        damageType: claim.damageType || "N/A",
        adjusterName: claim.adjusterName || undefined,
        topHail,
        topWind,
        warnings,
        dol,
        totalEventsScanned: scored.length,
        scanWindow: {
          start: startDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
          end: endDate.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        },
        lat,
        lon,
      });

      // Generate PDF
      const pdfBuffer = await htmlToPdfBuffer(html, {
        format: "Letter",
        margin: { top: "0.3in", right: "0.4in", bottom: "0.3in", left: "0.4in" },
      });

      // Return PDF as download
      return new NextResponse(pdfBuffer as unknown as BodyInit, {
        status: 200,
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": `attachment; filename="Weather-Verification-${claim.claimNumber}.pdf"`,
          "Content-Length": pdfBuffer.length.toString(),
        },
      });
    } catch (error) {
      if (error instanceof OrgScopeError) {
        return NextResponse.json({ error: "Claim not found" }, { status: 404 });
      }
      logger.error("[quick-verify] Error:", error);
      return NextResponse.json(
        { error: "Failed to generate weather verification" },
        { status: 500 }
      );
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GEOCODE (free Open-Meteo geocoding, no API key)
// ─────────────────────────────────────────────────────────────────────────────

async function geocodeAddress(address: string): Promise<{ lat: number; lon: number } | null> {
  try {
    const res = await fetch(
      `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(address)}&count=1&language=en&format=json`
    );
    if (!res.ok) return null;
    const data = await res.json();
    if (data.results?.[0]) {
      return { lat: data.results[0].latitude, lon: data.results[0].longitude };
    }
    return null;
  } catch {
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ONE-PAGE PDF HTML TEMPLATE
// ─────────────────────────────────────────────────────────────────────────────

interface QuickVerifyHTMLInput {
  companyName: string;
  primaryColor: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  website?: string;
  license?: string;
  claimNumber: string;
  insuredName: string;
  propertyAddress: string;
  dateOfLoss: string;
  carrier: string;
  policyNumber: string;
  damageType: string;
  adjusterName?: string;
  topHail: ScoredEvent[];
  topWind: ScoredEvent[];
  warnings: ScoredEvent[];
  dol: DOLResult;
  totalEventsScanned: number;
  scanWindow: { start: string; end: string };
  lat: number;
  lon: number;
}

function buildQuickVerifyHTML(input: QuickVerifyHTMLInput): string {
  const maxHail = input.topHail[0]?.magnitude ?? 0;
  const maxWind = input.topWind[0]?.magnitude ?? 0;
  const dolConfidencePct = Math.round(input.dol.confidence * 100);

  // Determine damage justification narrative
  const justification = buildJustification(maxHail, maxWind, input.damageType);

  const hailRows = input.topHail
    .map(
      (e) => `
      <tr>
        <td>${new Date(e.time_utc).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
        <td style="font-weight:700;color:#dc2626;">${e.magnitude?.toFixed(2)}"</td>
        <td>${e.distance_miles.toFixed(1)} mi ${e.direction_cardinal}</td>
        <td>${e.score.toFixed(0)}</td>
      </tr>`
    )
    .join("");

  const windRows = input.topWind
    .map(
      (e) => `
      <tr>
        <td>${new Date(e.time_utc).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
        <td style="font-weight:700;color:#2563eb;">${e.magnitude?.toFixed(0)} mph</td>
        <td>${e.distance_miles.toFixed(1)} mi ${e.direction_cardinal}</td>
        <td>${e.score.toFixed(0)}</td>
      </tr>`
    )
    .join("");

  const contactLine = [
    input.phone,
    input.email,
    input.website,
    input.license ? `Lic #${input.license}` : "",
  ]
    .filter(Boolean)
    .join("  •  ");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    @page { size: Letter; margin: 0; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Helvetica Neue', Arial, sans-serif;
      color: #1f2937;
      font-size: 11px;
      line-height: 1.4;
      padding: 28px 32px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 3px solid ${input.primaryColor};
      padding-bottom: 10px;
      margin-bottom: 14px;
    }
    .header-left { display: flex; align-items: center; gap: 12px; }
    .logo { max-height: 44px; max-width: 160px; }
    .company-name { font-size: 16px; font-weight: 800; color: ${input.primaryColor}; }
    .contact-line { font-size: 8px; color: #6b7280; margin-top: 2px; }
    .badge {
      display: inline-block;
      background: ${input.primaryColor};
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }

    .meta-grid {
      display: grid;
      grid-template-columns: 1fr 1fr 1fr;
      gap: 6px 16px;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 10px 14px;
      margin-bottom: 12px;
      font-size: 10px;
    }
    .meta-grid .label { color: #64748b; font-weight: 600; font-size: 8px; text-transform: uppercase; }
    .meta-grid .value { font-weight: 600; color: #0f172a; }

    .section-title {
      font-size: 12px;
      font-weight: 700;
      color: ${input.primaryColor};
      margin: 10px 0 6px;
      padding-bottom: 3px;
      border-bottom: 1px solid #e2e8f0;
    }

    .stats-row {
      display: flex;
      gap: 10px;
      margin-bottom: 10px;
    }
    .stat-card {
      flex: 1;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 6px;
      padding: 8px 12px;
      text-align: center;
    }
    .stat-card.hail { border-left: 3px solid #dc2626; }
    .stat-card.wind { border-left: 3px solid #2563eb; }
    .stat-card.events { border-left: 3px solid #059669; }
    .stat-card.confidence { border-left: 3px solid #d97706; }
    .stat-value { font-size: 20px; font-weight: 800; }
    .stat-value.hail { color: #dc2626; }
    .stat-value.wind { color: #2563eb; }
    .stat-value.events { color: #059669; }
    .stat-value.confidence { color: #d97706; }
    .stat-label { font-size: 8px; color: #64748b; font-weight: 600; text-transform: uppercase; }

    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 10px;
      margin-bottom: 4px;
    }
    th {
      background: ${input.primaryColor};
      color: white;
      padding: 5px 8px;
      text-align: left;
      font-size: 9px;
      font-weight: 600;
    }
    td { padding: 4px 8px; border-bottom: 1px solid #e5e7eb; }
    tr:nth-child(even) { background: #f9fafb; }
    .no-data { color: #9ca3af; font-style: italic; padding: 10px; text-align: center; }

    .justification {
      background: linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%);
      border: 1px solid #bfdbfe;
      border-left: 4px solid ${input.primaryColor};
      border-radius: 6px;
      padding: 10px 14px;
      margin: 10px 0;
      font-size: 10px;
      line-height: 1.5;
    }
    .justification h4 {
      font-size: 11px;
      color: ${input.primaryColor};
      margin-bottom: 4px;
    }

    .footer {
      margin-top: 8px;
      padding-top: 6px;
      border-top: 1px solid #e2e8f0;
      font-size: 8px;
      color: #94a3b8;
      display: flex;
      justify-content: space-between;
    }
  </style>
</head>
<body>
  <!-- HEADER -->
  <div class="header">
    <div class="header-left">
      ${input.logoUrl ? `<img src="${input.logoUrl}" alt="${input.companyName}" class="logo" />` : ""}
      <div>
        <div class="company-name">${input.companyName}</div>
        ${contactLine ? `<div class="contact-line">${contactLine}</div>` : ""}
      </div>
    </div>
    <div class="badge">Weather Verification Report</div>
  </div>

  <!-- CLAIM META GRID -->
  <div class="meta-grid">
    <div><div class="label">Claim Number</div><div class="value">${input.claimNumber}</div></div>
    <div><div class="label">Insured</div><div class="value">${input.insuredName}</div></div>
    <div><div class="label">Date of Loss</div><div class="value">${input.dateOfLoss}</div></div>
    <div><div class="label">Property</div><div class="value">${input.propertyAddress}</div></div>
    <div><div class="label">Carrier</div><div class="value">${input.carrier}${input.policyNumber !== "N/A" ? ` — ${input.policyNumber}` : ""}</div></div>
    <div><div class="label">Damage Type</div><div class="value">${input.damageType}</div></div>
  </div>

  <!-- KEY METRICS -->
  <div class="stats-row">
    <div class="stat-card hail">
      <div class="stat-value hail">${maxHail > 0 ? maxHail.toFixed(2) + '"' : "—"}</div>
      <div class="stat-label">Largest Hail</div>
    </div>
    <div class="stat-card wind">
      <div class="stat-value wind">${maxWind > 0 ? maxWind.toFixed(0) + " mph" : "—"}</div>
      <div class="stat-label">Peak Wind</div>
    </div>
    <div class="stat-card events">
      <div class="stat-value events">${input.totalEventsScanned}</div>
      <div class="stat-label">Events Scanned</div>
    </div>
    <div class="stat-card confidence">
      <div class="stat-value confidence">${dolConfidencePct}%</div>
      <div class="stat-label">DOL Confidence</div>
    </div>
  </div>

  <!-- EVENT TABLES -->
  <div class="two-col">
    <div>
      <div class="section-title">🧊 Top Hail Events (12 months)</div>
      ${
        hailRows
          ? `<table>
              <thead><tr><th>Date</th><th>Size</th><th>Proximity</th><th>Score</th></tr></thead>
              <tbody>${hailRows}</tbody>
            </table>`
          : '<div class="no-data">No hail reports found within scan radius</div>'
      }
    </div>
    <div>
      <div class="section-title">💨 Top Wind Events (12 months)</div>
      ${
        windRows
          ? `<table>
              <thead><tr><th>Date</th><th>Speed</th><th>Proximity</th><th>Score</th></tr></thead>
              <tbody>${windRows}</tbody>
            </table>`
          : '<div class="no-data">No wind reports found within scan radius</div>'
      }
    </div>
  </div>

  <!-- JUSTIFICATION -->
  <div class="justification">
    <h4>🔍 Weather Verification & Loss Justification</h4>
    <p>${justification}</p>
  </div>

  ${
    input.dol.recommended_date_utc
      ? `
  <div style="background:#f0f9ff;border:1px solid #bae6fd;border-radius:6px;padding:8px 14px;font-size:10px;margin-bottom:6px;">
    <strong style="color:${input.primaryColor};">📅 Recommended Date of Loss:</strong>
    ${new Date(input.dol.recommended_date_utc).toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
    — ${input.dol.top_events.length} corroborating event(s) at ${dolConfidencePct}% confidence
  </div>`
      : ""
  }

  <!-- FOOTER -->
  <div class="footer">
    <span>Generated by ${input.companyName} via SkaiScraper • ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</span>
    <span>Sources: Iowa State Mesonet (LSR), NWS CAP Alerts • Scan: ${input.scanWindow.start} – ${input.scanWindow.end} • Coords: ${input.lat.toFixed(4)}, ${input.lon.toFixed(4)}</span>
  </div>
</body>
</html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// JUSTIFICATION NARRATIVE BUILDER
// ─────────────────────────────────────────────────────────────────────────────

function buildJustification(maxHailInches: number, maxWindMph: number, damageType: string): string {
  const parts: string[] = [];

  // Hail justification
  if (maxHailInches >= 2.0) {
    parts.push(
      `Significant hail measuring ${maxHailInches.toFixed(2)}" was reported in the vicinity of this property. Hail of this size (≥2") is classified as "destructive" by the National Weather Service and is capable of causing severe damage to roofing materials, siding, gutters, HVAC condensers, and vehicle exteriors. Industry data shows hailstones ≥1.5" diameter exceed the impact threshold for standard architectural shingles per ASTM D3462.`
    );
  } else if (maxHailInches >= 1.0) {
    parts.push(
      `Hail measuring ${maxHailInches.toFixed(2)}" was documented near this property. Hail at or above 1" (quarter-sized) is the industry-standard threshold for roof damage assessment and commonly results in granule loss, bruising, and fractures in asphalt roofing systems. Per IBHS research, hail ≥1" can compromise the protective granule layer, accelerating material deterioration and reducing service life by 5-10 years.`
    );
  } else if (maxHailInches > 0) {
    parts.push(
      `Hail of ${maxHailInches.toFixed(2)}" was observed in proximity to the property. While below the 1" severe threshold, repeated sub-severe hail events cause cumulative granule erosion that weakens roofing systems over time, particularly on aged materials.`
    );
  }

  // Wind justification
  if (maxWindMph >= 90) {
    parts.push(
      `Extreme winds reaching ${maxWindMph.toFixed(0)} mph were recorded nearby. Wind speeds of this magnitude meet or exceed the design capacity of most residential roofing systems (IRC 2018 §R905 specifies 90 mph as the baseline wind design speed). These winds can cause shingle uplift, tab detachment, flashing failure, and ridge cap displacement — consistent with the damage type reported.`
    );
  } else if (maxWindMph >= 58) {
    parts.push(
      `Severe winds of ${maxWindMph.toFixed(0)} mph (≥58 mph = NWS "severe" threshold) were recorded in proximity to this property. Winds at this level generate sufficient uplift force to compromise sealed shingle tabs, damage drip edge and fascia, and cause progressive loosening of roofing components — creating vulnerability to water intrusion in subsequent weather events.`
    );
  } else if (maxWindMph > 40) {
    parts.push(
      `Elevated winds of ${maxWindMph.toFixed(0)} mph were documented near the property. While below the NWS severe threshold (58 mph), sustained winds above 40 mph can exacerbate pre-existing vulnerabilities in aging roofing systems.`
    );
  }

  // No significant events
  if (parts.length === 0) {
    parts.push(
      `The weather scan covering a 12-month window identified ${maxHailInches > 0 || maxWindMph > 0 ? "minor" : "no significant"} severe weather events in the immediate vicinity of this property. Additional investigation (e.g., direct property inspection, satellite imagery analysis) may be required to substantiate the loss claim.`
    );
  }

  // Tie to damage type
  const dtLower = damageType.toLowerCase();
  if (dtLower.includes("hail") && maxHailInches >= 1.0) {
    parts.push(
      `The documented hail activity is directly consistent with the reported "${damageType}" damage type and provides meteorological verification supporting claim coverage.`
    );
  } else if (dtLower.includes("wind") && maxWindMph >= 58) {
    parts.push(
      `The recorded wind event(s) are directly consistent with the reported "${damageType}" damage type and provide verifiable meteorological evidence supporting claim payment.`
    );
  } else if (dtLower.includes("storm") && (maxHailInches >= 1.0 || maxWindMph >= 58)) {
    parts.push(
      `The combination of severe weather activity documented above is consistent with the reported "${damageType}" damage classification and provides strong meteorological basis for loss verification.`
    );
  }

  return parts.join(" ");
}
