/**
 * PHASE 44: STORM OVERLAY GENERATOR
 *
 * AI-powered heatmap generation showing storm impact zones
 * Uses property coordinates, storm data, and AI to create visual overlays
 *
 * Features:
 * - Static map generation with Mapbox
 * - Heatmap overlay for hail/wind intensity
 * - Property marker with damage likelihood
 * - Storm path visualization
 */

import sharp from "sharp";

import { logger } from "@/lib/logger";

import { StormEvent } from "./fetchStormData";

// ===========================
// TYPE DEFINITIONS
// ===========================

export interface HeatmapZone {
  lat: number;
  lng: number;
  radius: number; // Miles
  intensity: number; // 0-100
  color: string; // Hex color
  label: string;
}

export interface StormOverlay {
  mapImageUrl: string; // Base Mapbox static map
  heatmapUrl: string; // Combined map + heatmap overlay
  zones: HeatmapZone[];
  propertyMarker: {
    lat: number;
    lng: number;
    riskLevel: "low" | "medium" | "high" | "critical";
  };
}

// ===========================
// 1. MAPBOX STATIC MAP
// ===========================

/**
 * Generate base map using Mapbox Static Images API
 * Docs: https://docs.mapbox.com/api/maps/static-images/
 */
export async function generateBaseMap(
  centerLat: number,
  centerLng: number,
  zoom: number = 12,
  width: number = 1280,
  height: number = 720
): Promise<string> {
  const mapboxToken =
    process.env.MAPBOX_ACCESS_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
    process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN;

  if (!mapboxToken) {
    logger.warn("[MAPBOX] No token configured. Static map generation disabled.");
    return "https://via.placeholder.com/1280x720/4A90E2/FFFFFF?text=Storm+Map";
  }

  // Mapbox static image URL
  const mapUrl = `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/static/${centerLng},${centerLat},${zoom},0/${width}x${height}?access_token=${mapboxToken}`;

  try {
    const response = await fetch(mapUrl);
    if (!response.ok) {
      throw new Error("Mapbox API error");
    }

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const imageBuffer = await response.arrayBuffer();

    // Upload to storage (mock for now)
    const uploadedUrl = `https://storage.example.com/maps/base-${Date.now()}.png`;
    return uploadedUrl;
  } catch (error) {
    logger.error("[MAPBOX ERROR]", error);
    return "https://via.placeholder.com/1280x720/4A90E2/FFFFFF?text=Storm+Map";
  }
}

// ===========================
// 2. HEATMAP GENERATION
// ===========================

/**
 * Generate heatmap overlay showing storm intensity zones
 */
export async function generateStormHeatmap(
  propertyLat: number,
  propertyLng: number,
  storms: StormEvent[]
): Promise<HeatmapZone[]> {
  const zones: HeatmapZone[] = [];

  for (const storm of storms) {
    // Mock storm coordinates (in production, extract from storm data)
    const stormLat = propertyLat + (Math.random() - 0.5) * 0.2;
    const stormLng = propertyLng + (Math.random() - 0.5) * 0.2;

    // Calculate intensity based on magnitude
    const intensity = Math.min(100, (storm.magnitude / 3.0) * 100); // 3" hail = 100%

    // Determine color based on intensity
    const color = getHeatmapColor(intensity);

    zones.push({
      lat: stormLat,
      lng: stormLng,
      radius: 10, // 10 mile radius
      intensity,
      color,
      label: `${storm.eventType} - ${storm.magnitude}${storm.eventType === "Hail" ? '"' : " MPH"}`,
    });
  }

  return zones;
}

function getHeatmapColor(intensity: number): string {
  if (intensity >= 80) return "#8B0000"; // Dark red (critical)
  if (intensity >= 60) return "#FF0000"; // Red (severe)
  if (intensity >= 40) return "#FFA500"; // Orange (moderate)
  if (intensity >= 20) return "#FFFF00"; // Yellow (minor)
  return "#00FF00"; // Green (minimal)
}

// ===========================
// 3. OVERLAY COMPOSITION
// ===========================

/**
 * Combine base map with heatmap overlay using sharp
 */
export async function composeStormOverlay(
  baseMapUrl: string,
  zones: HeatmapZone[],
  propertyLat: number,
  propertyLng: number,
  width: number = 1280,
  height: number = 720
): Promise<string> {
  try {
    // Fetch base map
    const mapResponse = await fetch(baseMapUrl);
    const mapBuffer = Buffer.from(await mapResponse.arrayBuffer());

    // Create SVG overlay with heatmap zones
    const svgOverlay = generateHeatmapSVG(zones, propertyLat, propertyLng, width, height);

    // Composite using sharp
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const overlayBuffer = await sharp(mapBuffer)
      .composite([
        {
          input: Buffer.from(svgOverlay),
          top: 0,
          left: 0,
          blend: "over",
        },
      ])
      .jpeg({ quality: 90 })
      .toBuffer();

    // Upload to storage (mock)
    const uploadedUrl = `https://storage.example.com/overlays/heatmap-${Date.now()}.jpg`;
    return uploadedUrl;
  } catch (error) {
    logger.error("[OVERLAY COMPOSITION ERROR]", error);
    return baseMapUrl; // Fallback to base map
  }
}

function generateHeatmapSVG(
  zones: HeatmapZone[],
  propertyLat: number,
  propertyLng: number,
  width: number,
  height: number
): string {
  const centerLat = propertyLat;
  const centerLng = propertyLng;

  // Convert lat/lng to pixel coordinates (simplified projection)
  const latToY = (lat: number) => {
    const offset = (centerLat - lat) * 3000; // Rough pixels per degree
    return height / 2 + offset;
  };

  const lngToX = (lng: number) => {
    const offset = (lng - centerLng) * 3000;
    return width / 2 + offset;
  };

  // Generate SVG circles for each zone
  const zoneCircles = zones
    .map((zone) => {
      const x = lngToX(zone.lng);
      const y = latToY(zone.lat);
      const radius = (zone.radius / 25) * (width / 4); // Scale radius

      return `
      <circle 
        cx="${x}" 
        cy="${y}" 
        r="${radius}" 
        fill="${zone.color}" 
        fill-opacity="0.4" 
        stroke="${zone.color}" 
        stroke-width="3" 
        stroke-opacity="0.8"
      />
      <text 
        x="${x}" 
        y="${y - radius - 10}" 
        font-size="14" 
        font-weight="bold" 
        fill="#FFF" 
        text-anchor="middle"
        stroke="#000" 
        stroke-width="0.5"
      >${zone.label}</text>
    `;
    })
    .join("");

  // Property marker
  const propX = width / 2;
  const propY = height / 2;

  const svg = `
    <svg width="${width}" height="${height}" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <radialGradient id="heatGradient">
          <stop offset="0%" stop-color="#FF0000" stop-opacity="0.6"/>
          <stop offset="50%" stop-color="#FFA500" stop-opacity="0.4"/>
          <stop offset="100%" stop-color="#FFFF00" stop-opacity="0.2"/>
        </radialGradient>
      </defs>
      
      ${zoneCircles}
      
      <!-- Property Marker -->
      <g transform="translate(${propX}, ${propY})">
        <circle r="20" fill="#4A90E2" stroke="#FFF" stroke-width="3"/>
        <path d="M 0 -15 L 5 -5 L -5 -5 Z" fill="#FFF"/>
        <text y="35" font-size="16" font-weight="bold" fill="#FFF" text-anchor="middle" stroke="#000" stroke-width="0.5">Property</text>
      </g>
    </svg>
  `;

  return svg;
}

// ===========================
// 4. FULL OVERLAY PIPELINE
// ===========================

/**
 * Generate complete storm overlay with heatmap
 */
export async function generateFullStormOverlay(
  propertyLat: number,
  propertyLng: number,
  storms: StormEvent[]
): Promise<StormOverlay> {
  // Step 1: Generate base map
  const mapImageUrl = await generateBaseMap(propertyLat, propertyLng);

  // Step 2: Generate heatmap zones
  const zones = await generateStormHeatmap(propertyLat, propertyLng, storms);

  // Step 3: Determine property risk level
  const maxIntensity = Math.max(...zones.map((z) => z.intensity), 0);
  let riskLevel: "low" | "medium" | "high" | "critical";
  if (maxIntensity >= 80) riskLevel = "critical";
  else if (maxIntensity >= 60) riskLevel = "high";
  else if (maxIntensity >= 40) riskLevel = "medium";
  else riskLevel = "low";

  // Step 4: Compose final overlay
  const heatmapUrl = await composeStormOverlay(mapImageUrl, zones, propertyLat, propertyLng);

  return {
    mapImageUrl,
    heatmapUrl,
    zones,
    propertyMarker: {
      lat: propertyLat,
      lng: propertyLng,
      riskLevel,
    },
  };
}
