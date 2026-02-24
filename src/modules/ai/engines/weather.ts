// ============================================================================
// AI WEATHER ENGINE
// ============================================================================
// Pulls real weather verification data from the database (weather_reports table)
// and formats it for the report builder's AI section system.
// Falls back to an empty state when no DB data is available.

import prisma from "@/lib/prisma";

import type { AIField, AISectionKey, AISectionState } from "../types";

export async function runWeather(
  reportId: string,
  sectionKey: AISectionKey,
  _context?: { claimId?: string }
): Promise<AISectionState> {
  const now = new Date().toISOString();

  // Attempt to resolve claimId from reportId
  let claimId = _context?.claimId;
  if (!claimId && reportId) {
    try {
      const report = await prisma.reports.findFirst({
        where: { id: reportId },
        select: { claimId: true },
      });
      claimId = report?.claimId || undefined;
    } catch {
      // Non-fatal
    }
  }

  // Pull real weather data from DB
  if (claimId) {
    try {
      const wr = await prisma.weather_reports.findFirst({
        where: { claimId },
        orderBy: { createdAt: "desc" },
      });

      if (wr) {
        // Extract hail/wind from the events JSON
        const events = (wr.events as Record<string, unknown>[] | null) ?? [];
        let hailSize = "";
        let windSpeed = "";
        for (const ev of events) {
          if (typeof ev === "object" && ev !== null) {
            if ("hailSize" in ev && ev.hailSize) hailSize = String(ev.hailSize);
            if ("windSpeed" in ev && ev.windSpeed) windSpeed = String(ev.windSpeed);
          }
        }

        const fmtDate = (d: Date | string | null) => {
          if (!d) return "";
          const dt = typeof d === "string" ? new Date(d) : d;
          return dt.toISOString().split("T")[0];
        };

        const fields: Record<string, AIField> = {
          hailSize: {
            value: hailSize || "Not detected",
            aiGenerated: false,
            approved: true,
            source: "weather_reports",
            confidence: 0.95,
            generatedAt: now,
          },
          windSpeed: {
            value: windSpeed || "Not detected",
            aiGenerated: false,
            approved: true,
            source: "weather_reports",
            confidence: 0.95,
            generatedAt: now,
          },
          eventDate: {
            value: fmtDate(wr.dol),
            aiGenerated: false,
            approved: true,
            source: "weather_reports",
            confidence: 1.0,
            generatedAt: now,
          },
          verificationSummary: {
            value:
              wr.overallAssessment ||
              `Weather verification completed for ${fmtDate(wr.dol)} at ${wr.address || "property address"}.`,
            aiGenerated: false,
            approved: true,
            source: "weather_reports",
            confidence: 0.93,
            generatedAt: now,
          },
          dataSource: {
            value: "NOAA / SkaiScraper Weather Intelligence",
            aiGenerated: false,
            approved: true,
            source: "weather_reports",
            confidence: 1.0,
            generatedAt: now,
          },
        };

        return {
          sectionKey,
          status: "succeeded",
          fields,
          updatedAt: now,
        };
      }
    } catch (err) {
      console.warn("[AI Weather Engine] DB query failed:", err);
    }
  }

  // Fallback: no weather data on file — return empty with guidance
  const fields: Record<string, AIField> = {
    hailSize: {
      value: "Not yet verified",
      aiGenerated: true,
      approved: false,
      source: "weather",
      confidence: 0,
      generatedAt: now,
    },
    windSpeed: {
      value: "Not yet verified",
      aiGenerated: true,
      approved: false,
      source: "weather",
      confidence: 0,
      generatedAt: now,
    },
    eventDate: {
      value: "",
      aiGenerated: true,
      approved: false,
      source: "weather",
      confidence: 0,
      generatedAt: now,
    },
    verificationSummary: {
      value:
        "Weather verification has not been run for this claim. " +
        "Use the Quick DOL Pull button to fetch weather data from NOAA and storm databases.",
      aiGenerated: true,
      approved: false,
      source: "weather",
      confidence: 0,
      generatedAt: now,
    },
    dataSource: {
      value: "Pending — run weather verification",
      aiGenerated: true,
      approved: false,
      source: "weather",
      confidence: 0,
      generatedAt: now,
    },
  };

  return {
    sectionKey,
    status: "succeeded",
    fields,
    updatedAt: now,
  };
}
