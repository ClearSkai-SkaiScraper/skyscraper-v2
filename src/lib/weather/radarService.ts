/**
 * Radar Image Service
 *
 * Fetches historical NEXRAD radar imagery from Iowa Environmental Mesonet (IEM)
 * and current/recent radar from NWS RIDGE.
 * Also fetches weather condition icons from Visual Crossing when available.
 *
 * Sources (all FREE, no API key needed for radar):
 * - IEM NEXRAD Archive: Historical radar composites by date
 * - NWS RIDGE: Current/recent radar station imagery
 * - RainViewer: Recent 2-hour radar tiles (free tier)
 * - Visual Crossing: Weather condition icons (API key required)
 */
import { logger } from "@/lib/logger";

export interface RadarImage {
  url: string;
  timestamp: string;
  source: "iem_nexrad" | "nws_ridge" | "rainviewer" | "visualcrossing";
  stationId?: string;
  label: string;
}

export interface WeatherCondition {
  datetime: string;
  tempmax: number;
  tempmin: number;
  precip: number;
  precipprob: number;
  windspeed: number;
  windgust?: number;
  conditions: string;
  icon: string;
  description?: string;
}

/**
 * Get the nearest NWS radar station for a lat/lng
 */
async function getNearestRadarStation(lat: number, lng: number): Promise<string> {
  try {
    const res = await fetch(`https://api.weather.gov/points/${lat},${lng}`, {
      headers: { "User-Agent": "(SkaiScraper, support@skaiscrape.com)" },
    });
    if (!res.ok) throw new Error(`NWS points API: ${res.status}`);
    const data = await res.json();
    return data.properties?.radarStation || "KFWS";
  } catch (err) {
    logger.error("[RADAR] Failed to get nearest station:", err);
    return "KFWS"; // Default fallback
  }
}

/**
 * Fetch historical NEXRAD radar composite images from IEM
 *
 * IEM provides archived NEXRAD composites at:
 * https://mesonet.agron.iastate.edu/archive/data/YYYY/MM/DD/GIS/uscomp/
 *
 * These are national composite images. For station-specific:
 * https://mesonet.agron.iastate.edu/archive/data/YYYY/MM/DD/GIS/ridge/STATION/
 */
export async function fetchHistoricalRadar(
  lat: number,
  lng: number,
  date: string // YYYY-MM-DD
): Promise<RadarImage[]> {
  const images: RadarImage[] = [];
  const stationId = await getNearestRadarStation(lat, lng);

  try {
    const d = new Date(date);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");

    // IEM NEXRAD composites — national composite (n0q = base reflectivity)
    // Use both timestamped files AND the station-level archive for better coverage
    const timeSlots = ["0000", "0600", "1200", "1500", "1800", "2100", "2359"];

    for (const time of timeSlots) {
      const url = `https://mesonet.agron.iastate.edu/archive/data/${yyyy}/${mm}/${dd}/GIS/uscomp/n0q_${yyyy}${mm}${dd}${time}.png`;
      const hour = parseInt(time.slice(0, 2));
      const label = `${hour === 0 ? "12" : hour > 12 ? hour - 12 : hour}:${time.slice(2)} ${hour >= 12 ? "PM" : "AM"} UTC`;

      images.push({
        url,
        timestamp: `${date}T${time.slice(0, 2)}:${time.slice(2)}:00Z`,
        source: "iem_nexrad",
        stationId,
        label: `NEXRAD Composite — ${label}`,
      });
    }

    // Also add station-specific RIDGE archive images (historical, not current)
    // IEM archives station-level images at these paths
    const ridgeArchiveUrl = `https://mesonet.agron.iastate.edu/archive/data/${yyyy}/${mm}/${dd}/GIS/ridge/${stationId}/N0Q_${yyyy}${mm}${dd}1200.png`;
    images.push({
      url: ridgeArchiveUrl,
      timestamp: `${date}T12:00:00Z`,
      source: "iem_nexrad",
      stationId,
      label: `${stationId} Station Radar — Noon`,
    });

    // Alternative: IEM WMS-based single-frame tile (more reliable for older dates)
    const wmsUrl = `https://mesonet.agron.iastate.edu/cgi-bin/wms/nexrad/n0q.cgi?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&FORMAT=image/png&TRANSPARENT=true&LAYERS=nexrad-n0q-900913&SRS=EPSG:4326&BBOX=${lng - 2},${lat - 2},${lng + 2},${lat + 2}&WIDTH=512&HEIGHT=512&TIME=${yyyy}-${mm}-${dd}T18:00:00Z`;
    images.push({
      url: wmsUrl,
      timestamp: `${date}T18:00:00Z`,
      source: "iem_nexrad",
      stationId,
      label: `NEXRAD WMS — ${stationId} Area`,
    });

    logger.info("[RADAR] Fetched radar image URLs", { date, stationId, count: images.length });
  } catch (err) {
    logger.error("[RADAR] Error building radar URLs:", err);
  }

  return images;
}

/**
 * Fetch recent radar tiles from RainViewer (free, no key needed)
 * Only works for last ~2 hours
 */
export async function fetchRecentRadar(): Promise<RadarImage[]> {
  try {
    const res = await fetch("https://api.rainviewer.com/public/weather-maps.json");
    if (!res.ok) return [];
    const data = await res.json();

    const images: RadarImage[] = [];
    const radarFrames = data.radar?.past || [];

    for (const frame of radarFrames.slice(-4)) {
      // Last 4 frames
      const ts = new Date(frame.time * 1000);
      images.push({
        url: `https://tilecache.rainviewer.com${frame.path}/256/3/3/3/2/1_1.png`,
        timestamp: ts.toISOString(),
        source: "rainviewer",
        label: `RainViewer — ${ts.toLocaleTimeString()}`,
      });
    }

    return images;
  } catch (err) {
    logger.error("[RADAR] RainViewer fetch failed:", err);
    return [];
  }
}

/**
 * Get radar images for a specific event date + location
 * This is the main function used by the weather report generator
 */
export async function getRadarForEvent(
  lat: number,
  lng: number,
  eventDate: string // YYYY-MM-DD
): Promise<{ stationId: string; images: RadarImage[]; weatherData?: WeatherCondition[] }> {
  const stationId = await getNearestRadarStation(lat, lng);
  const historical = await fetchHistoricalRadar(lat, lng, eventDate);

  // Also try to fetch Visual Crossing weather data for the event
  let weatherData: WeatherCondition[] | undefined;
  try {
    weatherData = await fetchVisualCrossingWeather(lat, lng, eventDate);
  } catch (err) {
    logger.warn("[RADAR] Visual Crossing fetch failed (non-critical):", err);
  }

  return {
    stationId,
    images: historical,
    weatherData,
  };
}

/**
 * Fetch weather data from Visual Crossing Timeline API
 * Returns detailed hourly/daily weather conditions with icons
 */
export async function fetchVisualCrossingWeather(
  lat: number,
  lng: number,
  date: string
): Promise<WeatherCondition[]> {
  const apiKey = process.env.VISUALCROSSING_API_KEY || process.env.VISUAL_CROSSING_API_KEY;

  if (!apiKey) {
    logger.debug("[RADAR] Visual Crossing API key not configured, skipping");
    return [];
  }

  try {
    const location = `${lat},${lng}`;
    // Fetch 3 days around the event date for context
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 1);
    const endDate = new Date(date);
    endDate.setDate(endDate.getDate() + 1);

    const dateRange = `${startDate.toISOString().split("T")[0]}/${endDate.toISOString().split("T")[0]}`;

    const url = `https://weather.visualcrossing.com/VisualCrossingWebServices/rest/services/timeline/${encodeURIComponent(location)}/${dateRange}?key=${apiKey}&unitGroup=us&include=days,hours&contentType=json`;

    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Visual Crossing API error: ${response.status}`);
    }

    const data = await response.json();
    const days = data.days || [];

    const conditions: WeatherCondition[] = days.map((day: any) => ({
      datetime: day.datetime,
      tempmax: day.tempmax,
      tempmin: day.tempmin,
      precip: day.precip || 0,
      precipprob: day.precipprob || 0,
      windspeed: day.windspeed || 0,
      windgust: day.windgust,
      conditions: day.conditions || "",
      icon: day.icon || "",
      description: day.description || "",
    }));

    logger.info("[RADAR] Fetched Visual Crossing weather data", {
      date,
      daysCount: conditions.length,
      conditions: conditions.map((c) => c.conditions).join(", "),
    });

    return conditions;
  } catch (err) {
    logger.error("[RADAR] Visual Crossing fetch error:", err);
    return [];
  }
}
