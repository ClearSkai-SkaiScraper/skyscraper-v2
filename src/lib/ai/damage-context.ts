/**
 * Contextual Intelligence for Damage Analysis
 *
 * Enriches AI prompts with weather data, property metadata,
 * and claim context for more accurate damage detection.
 *
 * @module damage-context
 */

import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

// =============================================================================
// TYPES
// =============================================================================

export interface DamageAnalysisContext {
  /** Weather context string to inject into prompts */
  weatherContext: string;
  /** Property context string */
  propertyContext: string;
  /** Claim context string */
  claimContext: string;
  /** Combined context for prompt injection */
  fullContext: string;
}

// =============================================================================
// CONTEXT BUILDER
// =============================================================================

/**
 * Build contextual intelligence for damage analysis prompts
 *
 * Pulls weather data, property info, and claim details from the database
 * and formats them as additional context for GPT-4o prompts.
 */
export async function buildDamageContext(params: {
  claimId?: string;
  orgId: string;
  propertyId?: string;
  dateOfLoss?: string;
  address?: string;
}): Promise<DamageAnalysisContext> {
  const { claimId, orgId, propertyId } = params;

  let weatherContext = "";
  let propertyContext = "";
  let claimContext = "";

  // ─── Fetch claim data ────────────────────────────────────────────────
  if (claimId) {
    try {
      const claim = await prisma.claims.findFirst({
        where: { id: claimId, orgId },
        select: {
          damageType: true,
          dateOfLoss: true,
          status: true,
          carrier: true,
          claimNumber: true,
        },
      });

      if (claim) {
        const parts: string[] = [];
        if (claim.damageType) parts.push(`Damage type: ${claim.damageType}`);
        if (claim.dateOfLoss) parts.push(`Date of loss: ${claim.dateOfLoss}`);
        if (claim.carrier) parts.push(`Carrier: ${claim.carrier}`);
        if (claim.status) parts.push(`Claim status: ${claim.status}`);

        claimContext = parts.length > 0 ? `CLAIM CONTEXT:\n${parts.join("\n")}` : "";
      }
    } catch (err) {
      logger.warn("[DAMAGE_CONTEXT] Failed to fetch claim data", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ─── Fetch property data ─────────────────────────────────────────────
  if (propertyId) {
    try {
      const property = await prisma.properties.findFirst({
        where: { id: propertyId, orgId },
        select: {
          propertyType: true,
          yearBuilt: true,
          roofType: true,
          street: true,
          city: true,
          state: true,
          zipCode: true,
          squareFootage: true,
        },
      });

      if (property) {
        const parts: string[] = [];
        if (property.propertyType) parts.push(`Property type: ${property.propertyType}`);
        if (property.yearBuilt) {
          const age = new Date().getFullYear() - property.yearBuilt;
          parts.push(`Year built: ${property.yearBuilt} (${age} years old)`);
        }
        if (property.roofType) parts.push(`Roof type: ${property.roofType}`);
        if (property.squareFootage) parts.push(`Square footage: ${property.squareFootage}`);

        const addr = [property.street, property.city, property.state, property.zipCode]
          .filter(Boolean)
          .join(", ");
        if (addr) parts.push(`Address: ${addr}`);

        propertyContext = parts.length > 0 ? `PROPERTY CONTEXT:\n${parts.join("\n")}` : "";

        // Regional adjustments
        if (property.state) {
          const coldStates = ["MN", "WI", "MI", "ND", "SD", "MT", "WY", "CO", "ME", "NH", "VT"];
          const hotStates = ["AZ", "NV", "TX", "FL", "LA", "MS", "AL", "GA"];
          const state = property.state.toUpperCase();

          if (coldStates.includes(state)) {
            propertyContext +=
              "\nREGIONAL NOTE: Cold climate region — check for ice dam evidence, freeze-thaw damage, and thermal shock patterns.";
          } else if (hotStates.includes(state)) {
            propertyContext +=
              "\nREGIONAL NOTE: Hot climate region — check for UV degradation, thermal expansion damage, and accelerated aging.";
          }
        }
      }
    } catch (err) {
      logger.warn("[DAMAGE_CONTEXT] Failed to fetch property data", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ─── Fetch weather data ──────────────────────────────────────────────
  if (claimId) {
    try {
      const weatherReport = await prisma.weather_reports.findFirst({
        where: { claimId },
        orderBy: { createdAt: "desc" },
        select: {
          mode: true,
          primaryPeril: true,
          overallAssessment: true,
          providerRaw: true,
          events: true,
        },
      });

      if (weatherReport) {
        const parts: string[] = [];
        if (weatherReport.primaryPeril) parts.push(`Primary peril: ${weatherReport.primaryPeril}`);
        if (weatherReport.overallAssessment) {
          parts.push(`Weather assessment: ${weatherReport.overallAssessment.substring(0, 300)}`);
        }

        // Extract specific weather data from provider raw response
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const meta = weatherReport.providerRaw as any;
        if (meta?.hailSize) parts.push(`Verified hail size: ${meta.hailSize} inches`);
        if (meta?.maxWindSpeed) parts.push(`Max wind speed: ${meta.maxWindSpeed} mph`);
        if (meta?.stormDate) parts.push(`Storm date: ${meta.stormDate}`);

        weatherContext =
          parts.length > 0
            ? `WEATHER CONTEXT:\n${parts.join("\n")}\n\nUse this weather data to attribute damage to the correct peril. Hail size helps estimate expected impact diameter. Wind speed helps assess likelihood of lifted/missing shingles.`
            : "";
      }
    } catch (err) {
      logger.warn("[DAMAGE_CONTEXT] Failed to fetch weather data", {
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }

  // ─── Combine all context ─────────────────────────────────────────────
  const sections = [weatherContext, propertyContext, claimContext].filter(Boolean);
  const fullContext =
    sections.length > 0
      ? `\n\n--- CONTEXTUAL INTELLIGENCE ---\n${sections.join("\n\n")}\n--- END CONTEXT ---`
      : "";

  return {
    weatherContext,
    propertyContext,
    claimContext,
    fullContext,
  };
}

/**
 * Quick context builder from inline data (no DB calls)
 */
export function buildInlineContext(params: {
  dateOfLoss?: string;
  lossType?: string;
  hailSize?: string;
  windSpeed?: string;
  roofType?: string;
  roofAge?: number;
  propertyType?: string;
  address?: string;
  state?: string;
}): string {
  const parts: string[] = [];

  if (params.dateOfLoss) parts.push(`Date of loss: ${params.dateOfLoss}`);
  if (params.lossType) parts.push(`Loss type: ${params.lossType}`);
  if (params.hailSize) parts.push(`Verified hail size: ${params.hailSize} inches`);
  if (params.windSpeed) parts.push(`Max wind speed: ${params.windSpeed} mph`);
  if (params.roofType) parts.push(`Roof type: ${params.roofType}`);
  if (params.roofAge) parts.push(`Roof age: ~${params.roofAge} years`);
  if (params.propertyType) parts.push(`Property type: ${params.propertyType}`);
  if (params.address) parts.push(`Address: ${params.address}`);

  if (parts.length === 0) return "";

  let context = `\nContextual information:\n${parts.join("\n")}`;

  // Regional adjustments
  if (params.state) {
    const coldStates = ["MN", "WI", "MI", "ND", "SD", "MT", "WY", "CO", "ME", "NH", "VT"];
    const hotStates = ["AZ", "NV", "TX", "FL", "LA", "MS", "AL", "GA"];
    const state = params.state.toUpperCase();

    if (coldStates.includes(state)) {
      context += "\nRegion: Cold climate — also check for ice dam evidence and freeze-thaw damage.";
    } else if (hotStates.includes(state)) {
      context += "\nRegion: Hot climate — also check for UV degradation and thermal damage.";
    }
  }

  return context;
}
