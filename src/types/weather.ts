/**
 * FREE WEATHER STACK - Type Definitions
 * 100% free data sources: NWS CAP, Iowa State Mesonet, NOAA NEXRAD
 */

import type { GeoJSON } from "geojson";

export type WeatherSource = "cap" | "mesonet" | "nexrad";

export type WeatherEventType =
  | "svr_warning" // Severe thunderstorm warning (CAP)
  | "tor_warning" // Tornado warning (CAP)
  | "ff_warning" // Flash flood warning (CAP)
  | "smw_warning" // Special marine warning (CAP)
  | "hail_report" // Hail report (Mesonet)
  | "wind_report" // Wind report (Mesonet)
  | "radar_core"; // Derived radar core (NEXRAD)

export interface WeatherEvent {
  id: string;
  source: WeatherSource;
  type: WeatherEventType;
  time_utc: string; // ISO 8601
  magnitude?: number; // Hail inches or wind mph
  geometry: GeoJSON.Geometry; // Point or Polygon
  raw_ref?: string; // CAP id / Mesonet id / radar key
  quality_score?: number; // 0..1 confidence
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadata?: Record<string, any>; // Additional fields (warning text, etc)
}

export interface PropertyContext {
  lat: number;
  lon: number;
  address?: string;
  name?: string; // Property/client name
}

export interface ScoredEvent extends WeatherEvent {
  distance_miles: number;
  bearing_deg: number;
  direction_cardinal: string; // N, NE, E, SE, S, SW, W, NW
  score: number; // Computed benefit score (magnitude + proximity)
}

export interface DOLResult {
  recommended_date_utc: string; // Best date of loss (YYYY-MM-DD)
  top_events: Array<{
    eventId: string;
    type: WeatherEventType;
    magnitude?: number;
    distance_miles: number;
    direction_cardinal: string;
    time_utc: string;
    source: WeatherSource;
  }>;
  confidence: number; // 0..1 confidence in recommendation
  total_events_scanned: number;
}

export interface WeatherVerificationRequest {
  lat: number;
  lon: number;
  dateRange?: {
    start: string; // ISO 8601
    end: string; // ISO 8601
  };
  daysBack?: number; // Default 120
  address?: string;
  propertyName?: string;
}

export interface WeatherVerificationResponse {
  dol: DOLResult;
  aiSummary: string; // Claims-ready impact paragraph
  pdfUrl?: string; // Firebase Storage signed URL
  events: ScoredEvent[]; // All scored events (for debugging)
  citations: string[]; // NWS/Mesonet source citations
}

export interface RenderOptions {
  includeRadar?: boolean;
  includeCAPText?: boolean;
  includeEventTable?: boolean;
  brandingOverride?: {
    orgName?: string;
    logoUrl?: string;
    primaryColor?: string;
  };
}
