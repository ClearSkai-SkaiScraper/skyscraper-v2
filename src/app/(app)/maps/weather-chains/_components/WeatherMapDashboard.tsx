/**
 * WeatherMapDashboard — Apple Weather–inspired map + data experience
 *
 * Layout:
 *   ┌──────────────────────────┬──────────────────┐
 *   │                          │  Data Sets        │
 *   │   Mapbox GL Map          │  (storm events,   │
 *   │   + overlay layers       │   weather reports, │
 *   │                          │   DOL pulls,      │
 *   │                          │   NWS alerts)     │
 *   │                          │                   │
 *   ├──────────────────────────┴──────────────────-│
 *   │   7-Day Forecast Strip                       │
 *   ├──────────────────────────────────────────────│
 *   │   Active Alerts Banner                       │
 *   └─────────────────────────────────────────────-┘
 */
"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import {
  AlertTriangle,
  ArrowRight,
  Cloud,
  CloudDrizzle,
  CloudLightning,
  CloudRain,
  CloudSnow,
  Droplets,
  ExternalLink,
  Eye,
  FileWarning,
  Info,
  Layers,
  Loader2,
  MapPin,
  RefreshCw,
  ShieldAlert,
  Sun,
  Sunrise,
  Thermometer,
  Wind,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface WeatherClaimMarker {
  id: string;
  claimNumber: string;
  address: string;
  lat: number;
  lng: number;
  status: string;
  dolDate: string | null;
  weatherSummary: string | null;
  hailSize: string | null;
  windSpeed: string | null;
  severity: "low" | "moderate" | "severe" | "extreme" | null;
}

interface StormEvent {
  id: string;
  date: string;
  type: string;
  severity: string;
  location: string;
  hailSize: number | null;
  windSpeed: number | null;
  impactedProperties: number;
  latitude?: number;
  longitude?: number;
}

interface WeatherAlert {
  id: string;
  event: string;
  headline: string;
  severity: string;
  urgency: string;
  certainty: string;
  effective: string;
  expires: string;
  areas: string;
  instruction: string | null;
}

interface ForecastDay {
  date: string;
  tempMax: number;
  tempMin: number;
  temp: number;
  humidity: number;
  precip: number;
  precipProb: number;
  windSpeed: number;
  windGust: number;
  uvIndex: number;
  conditions: string;
  icon: string;
  sunrise: string;
  sunset: string;
}

interface CurrentConditions {
  temp: number;
  feelsLike: number;
  humidity: number;
  windSpeed: number;
  windGust: number;
  pressure: number;
  uvIndex: number;
  visibility: number;
  conditions: string;
  icon: string;
  precip: number;
}

interface WeatherReport {
  id: string;
  address: string | null;
  primaryPeril: string | null;
  overallAssessment: string | null;
  createdAt: string;
  dateOfLoss: string | null;
  confidence: number | null;
  lat: number | null;
  lng: number | null;
}

// Active overlay layers the user can toggle
type OverlayLayer = "claims" | "heatmap" | "storms" | "none";

// Common cities for the forecast location selector
// The API will auto-resolve from the user's Trades Network profile if no override
const FORECAST_CITIES = [
  { label: "Auto (Trades Profile)", value: "" },
  { label: "Phoenix, AZ", value: "Phoenix, AZ" },
  { label: "Tucson, AZ", value: "Tucson, AZ" },
  { label: "Scottsdale, AZ", value: "Scottsdale, AZ" },
  { label: "Mesa, AZ", value: "Mesa, AZ" },
  { label: "Chandler, AZ", value: "Chandler, AZ" },
  { label: "Tempe, AZ", value: "Tempe, AZ" },
  { label: "Gilbert, AZ", value: "Gilbert, AZ" },
  { label: "Glendale, AZ", value: "Glendale, AZ" },
  { label: "Peoria, AZ", value: "Peoria, AZ" },
  { label: "Surprise, AZ", value: "Surprise, AZ" },
  { label: "Prescott, AZ", value: "Prescott, AZ" },
  { label: "Flagstaff, AZ", value: "Flagstaff, AZ" },
  { label: "Sedona, AZ", value: "Sedona, AZ" },
  { label: "Lake Havasu City, AZ", value: "Lake Havasu City, AZ" },
  { label: "Sierra Vista, AZ", value: "Sierra Vista, AZ" },
  { label: "Yuma, AZ", value: "Yuma, AZ" },
  { label: "Bullhead City, AZ", value: "Bullhead City, AZ" },
  { label: "Kingman, AZ", value: "Kingman, AZ" },
  { label: "Casa Grande, AZ", value: "Casa Grande, AZ" },
  { label: "Maricopa, AZ", value: "Maricopa, AZ" },
];

const FORECAST_LOCATION_KEY = "skai_forecast_location";

interface Props {
  markers: WeatherClaimMarker[];
  center: [number, number];
  mapboxToken: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function severityColor(s: string | null): string {
  switch (s) {
    case "extreme":
    case "Extreme":
      return "#dc2626";
    case "severe":
    case "Severe":
      return "#ea580c";
    case "moderate":
    case "Moderate":
      return "#f59e0b";
    case "low":
    case "Minor":
      return "#22c55e";
    default:
      return "#6b7280";
  }
}

function getWeatherIcon(icon: string, className = "h-5 w-5") {
  const lc = icon.toLowerCase();
  if (lc.includes("clear") || lc.includes("sun"))
    return <Sun className={cn(className, "text-amber-400")} />;
  if (lc.includes("snow") || lc.includes("ice"))
    return <CloudSnow className={cn(className, "text-blue-300")} />;
  if (lc.includes("thunder") || lc.includes("storm"))
    return <CloudLightning className={cn(className, "text-purple-400")} />;
  if (lc.includes("rain") || lc.includes("shower"))
    return <CloudRain className={cn(className, "text-blue-400")} />;
  if (lc.includes("drizzle")) return <CloudDrizzle className={cn(className, "text-blue-300")} />;
  if (lc.includes("cloud") || lc.includes("overcast"))
    return <Cloud className={cn(className, "text-slate-400")} />;
  if (lc.includes("fog") || lc.includes("mist"))
    return <Cloud className={cn(className, "text-slate-300")} />;
  if (lc.includes("wind")) return <Wind className={cn(className, "text-cyan-400")} />;
  return <Cloud className={cn(className, "text-slate-400")} />;
}

function dayName(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(today.getDate() + 1);
  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === tomorrow.toDateString()) return "Tomorrow";
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

function alertSeverityStyle(severity: string) {
  switch (severity) {
    case "Extreme":
      return "border-red-500 bg-red-950/80 text-red-200";
    case "Severe":
      return "border-orange-500 bg-orange-950/80 text-orange-200";
    case "Moderate":
      return "border-amber-500 bg-amber-950/60 text-amber-200";
    default:
      return "border-blue-500 bg-blue-950/60 text-blue-200";
  }
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function WeatherMapDashboard({ markers, center, mapboxToken }: Props) {
  // Map state
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapboxRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [activeOverlay, setActiveOverlay] = useState<OverlayLayer>("claims");

  // Data state
  const [storms, setStorms] = useState<StormEvent[]>([]);
  const [alerts, setAlerts] = useState<WeatherAlert[]>([]);
  const [forecast, setForecast] = useState<ForecastDay[]>([]);
  const [currentWeather, setCurrentWeather] = useState<CurrentConditions | null>(null);
  const [weatherReports, setWeatherReports] = useState<WeatherReport[]>([]);
  const [resolvedLocation, setResolvedLocation] = useState("");
  const [loadingData, setLoadingData] = useState(true);
  const [selectedClaim, setSelectedClaim] = useState<WeatherClaimMarker | null>(null);
  const [attachingEvidence, setAttachingEvidence] = useState<string | null>(null);

  // City selector — persisted in localStorage
  const [forecastCity, setForecastCity] = useState<string>(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem(FORECAST_LOCATION_KEY) || "";
    }
    return "";
  });

  const handleCityChange = useCallback((city: string) => {
    setForecastCity(city);
    if (typeof window !== "undefined") {
      if (city) {
        localStorage.setItem(FORECAST_LOCATION_KEY, city);
      } else {
        localStorage.removeItem(FORECAST_LOCATION_KEY);
      }
    }
  }, []);

  // ─── Fetch all data in parallel ────────────────────────────────────────────
  const fetchAllData = useCallback(
    async (locationOverride?: string) => {
      setLoadingData(true);
      const cityParam = locationOverride ?? forecastCity;
      const forecastUrl = cityParam
        ? `/api/weather/forecast?location=${encodeURIComponent(cityParam)}`
        : "/api/weather/forecast";
      try {
        const [stormsRes, alertsRes, forecastRes, reportsRes] = await Promise.all([
          fetch("/api/weather/storm-events?limit=30").then((r) =>
            r.ok ? r.json() : { events: [] }
          ),
          fetch("/api/weather-alerts").then((r) => (r.ok ? r.json() : { alerts: [] })),
          fetch(forecastUrl).then((r) =>
            r.ok ? r.json() : { days: [], current: null, location: "" }
          ),
          fetch("/api/weather/scans?limit=20").then((r) =>
            r.ok ? r.json() : { scans: [], reports: [] }
          ),
        ]);

        // Storm events
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stormEvents: StormEvent[] = (stormsRes.events || []).map((e: any, i: number) => ({
          id: e.id || `storm_${i}`,
          date: e.date || e.eventDate || new Date().toISOString(),
          type: (e.type || e.eventType || "mixed").toLowerCase(),
          severity:
            typeof e.severity === "number"
              ? e.severity >= 8
                ? "severe"
                : e.severity >= 5
                  ? "moderate"
                  : "light"
              : e.severity || "moderate",
          location: e.location || e.city || "Service Area",
          hailSize: e.hailSize ?? null,
          windSpeed: e.windSpeed ?? null,
          impactedProperties: e.impactedProperties || 0,
          latitude: e.latitude ?? null,
          longitude: e.longitude ?? null,
        }));
        setStorms(stormEvents);

        // Alerts
        setAlerts(alertsRes.alerts || []);

        // Forecast
        setForecast(forecastRes.days || []);
        setCurrentWeather(forecastRes.current || null);
        setResolvedLocation(forecastRes.location || "");

        // Weather reports (including DOL scans with lat/lng for map markers)
        const reports: WeatherReport[] = (reportsRes.scans || reportsRes.reports || [])
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((r: any) => ({
            id: r.id,
            address: r.address ?? r.location ?? null,
            primaryPeril: r.primaryPeril ?? r.peril ?? null,
            overallAssessment: r.overallAssessment ?? r.assessment ?? null,
            createdAt: r.createdAt || new Date().toISOString(),
            dateOfLoss: r.dateOfLoss ?? null,
            confidence: r.confidence ?? null,
            lat: r.lat ?? null,
            lng: r.lng ?? null,
          }));
        setWeatherReports(reports);
      } catch (err) {
        console.error("[WEATHER_MAP] Failed to fetch data:", err);
        toast.error("Failed to load weather data");
      } finally {
        setLoadingData(false);
      }
    },
    [forecastCity]
  );

  useEffect(() => {
    void fetchAllData();
  }, [fetchAllData]);

  // Re-fetch forecast when city selection changes
  const handleCitySelect = useCallback(
    (city: string) => {
      handleCityChange(city);
      void fetchAllData(city);
    },
    [fetchAllData, handleCityChange]
  );

  // ─── Initialize Mapbox ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;
    if (!mapboxToken) return;
    let cancelled = false;

    void (async () => {
      const mapboxgl = (await import("mapbox-gl")).default;
      if (cancelled) return;
      mapboxRef.current = mapboxgl;
      mapboxgl.accessToken = mapboxToken;

      mapRef.current = new mapboxgl.Map({
        container: mapContainer.current!,
        style: "mapbox://styles/mapbox/dark-v11",
        center,
        zoom: 10,
        attributionControl: false,
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-left");
      mapRef.current.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-left");

      mapRef.current.on("load", () => {
        if (!cancelled) setMapReady(true);
      });
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ─── Render map layers ─────────────────────────────────────────────────────
  const renderLayers = useCallback(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl || !mapReady) return;

    // Clean up
    ["claims-layer", "heatmap-layer", "storms-layer"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    ["claims-src", "storms-src"].forEach((id) => {
      if (map.getSource(id)) map.removeSource(id);
    });

    // Claims GeoJSON
    const claimsGeoJSON = {
      type: "FeatureCollection" as const,
      features: markers.map((m) => ({
        type: "Feature" as const,
        geometry: { type: "Point" as const, coordinates: [m.lng, m.lat] },
        properties: {
          id: m.id,
          claimNumber: m.claimNumber,
          severity: m.severity || "unknown",
          color: severityColor(m.severity),
        },
      })),
    };
    map.addSource("claims-src", { type: "geojson", data: claimsGeoJSON });

    // Claims circle layer
    map.addLayer({
      id: "claims-layer",
      type: "circle",
      source: "claims-src",
      layout: {
        visibility: activeOverlay === "claims" ? "visible" : "none",
      },
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 6, 14, 14],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#ffffff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.9,
      },
    });

    // Heatmap layer (same source)
    map.addLayer({
      id: "heatmap-layer",
      type: "heatmap",
      source: "claims-src",
      layout: {
        visibility: activeOverlay === "heatmap" ? "visible" : "none",
      },
      paint: {
        "heatmap-weight": 1,
        "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 3],
        "heatmap-color": [
          "interpolate",
          ["linear"],
          ["heatmap-density"],
          0,
          "rgba(33,102,172,0)",
          0.2,
          "rgb(103,169,207)",
          0.4,
          "rgb(209,229,240)",
          0.6,
          "rgb(253,219,199)",
          0.8,
          "rgb(239,138,98)",
          1,
          "rgb(178,24,43)",
        ],
        "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 20, 15, 40],
        "heatmap-opacity": 0.85,
      },
    });

    // Storm events layer (storm_events + DOL scan markers with coordinates)
    const stormFeatures = storms
      .filter((s) => s.latitude && s.longitude)
      .map((s) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [s.longitude!, s.latitude!],
        },
        properties: {
          id: s.id,
          severity: s.severity,
          type: s.type,
          color: severityColor(s.severity),
        },
      }));

    // Add DOL scan markers (weather_reports with lat/lng) as additional storm features
    const dolScanFeatures = weatherReports
      .filter((r) => r.lat && r.lng)
      .map((r) => ({
        type: "Feature" as const,
        geometry: {
          type: "Point" as const,
          coordinates: [r.lng!, r.lat!],
        },
        properties: {
          id: `dol_${r.id}`,
          severity: r.confidence && r.confidence >= 0.7 ? "severe" : "moderate",
          type: r.primaryPeril || "dol-scan",
          color: r.confidence && r.confidence >= 0.7 ? "#ea580c" : "#f59e0b",
        },
      }));

    const allStormFeatures = [...stormFeatures, ...dolScanFeatures];

    if (allStormFeatures.length > 0) {
      map.addSource("storms-src", {
        type: "geojson",
        data: { type: "FeatureCollection", features: allStormFeatures },
      });

      map.addLayer({
        id: "storms-layer",
        type: "circle",
        source: "storms-src",
        layout: {
          visibility: activeOverlay === "storms" ? "visible" : "none",
        },
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["zoom"], 6, 10, 14, 24],
          "circle-color": ["get", "color"],
          "circle-stroke-color": "#ffffff",
          "circle-stroke-width": 1.5,
          "circle-opacity": 0.6,
          "circle-blur": 0.4,
        },
      });
    }

    // Click on claims layer
    map.on("click", "claims-layer", (e: { features?: { properties: { id: string } }[] }) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const marker = markers.find((m) => m.id === feature.properties.id);
      if (marker) setSelectedClaim(marker);
    });

    map.on("mouseenter", "claims-layer", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "claims-layer", () => {
      map.getCanvas().style.cursor = "";
    });
  }, [markers, storms, weatherReports, mapReady, activeOverlay]);

  useEffect(() => {
    renderLayers();
  }, [renderLayers]);

  // Update layer visibility when overlay changes
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;
    const layers: Record<OverlayLayer, string[]> = {
      claims: ["claims-layer"],
      heatmap: ["heatmap-layer"],
      storms: ["storms-layer"],
      none: [],
    };
    Object.entries(layers).forEach(([key, layerIds]) => {
      layerIds.forEach((id) => {
        if (map.getLayer(id)) {
          map.setLayoutProperty(id, "visibility", key === activeOverlay ? "visible" : "none");
        }
      });
    });
  }, [activeOverlay, mapReady]);

  // ─── Use storm event as claim evidence ─────────────────────────────────────
  const useAsEvidence = async (item: { id: string; type: "storm" | "report" | "alert" }) => {
    setAttachingEvidence(item.id);
    try {
      // Navigate to claims list with evidence pre-selected
      const params = new URLSearchParams({
        attachEvidence: "true",
        evidenceType: item.type,
        evidenceId: item.id,
      });
      window.location.href = `/claims?${params.toString()}`;
    } catch {
      toast.error("Failed to prepare evidence");
    } finally {
      setAttachingEvidence(null);
    }
  };

  // ─── Fly to a storm on the map ──────────────────────────────────────────────
  const flyToStorm = (storm: StormEvent) => {
    if (!mapRef.current || !storm.latitude || !storm.longitude) return;
    mapRef.current.flyTo({
      center: [storm.longitude, storm.latitude],
      zoom: 12,
      duration: 1200,
    });
    setActiveOverlay("storms");
  };

  // ─── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col gap-4">
      {/* ── Current Conditions Bar ─── */}
      {currentWeather && (
        <div className="flex items-center gap-6 rounded-2xl border border-slate-200 bg-gradient-to-r from-blue-950/90 via-slate-900/90 to-indigo-950/90 px-6 py-4 text-white shadow-lg dark:border-slate-700">
          <div className="flex items-center gap-3">
            {getWeatherIcon(currentWeather.icon, "h-10 w-10")}
            <div>
              <div className="text-3xl font-bold">{currentWeather.temp}°F</div>
              <div className="text-xs text-white/60">Feels like {currentWeather.feelsLike}°F</div>
            </div>
          </div>
          <div className="text-sm font-medium text-white/80">{currentWeather.conditions}</div>
          <div className="ml-auto flex items-center gap-5 text-xs text-white/60">
            <span className="flex items-center gap-1.5">
              <Wind className="h-3.5 w-3.5" /> {currentWeather.windSpeed} mph
            </span>
            <span className="flex items-center gap-1.5">
              <Droplets className="h-3.5 w-3.5" /> {currentWeather.humidity}%
            </span>
            <span className="flex items-center gap-1.5">
              <Eye className="h-3.5 w-3.5" /> {currentWeather.visibility} mi
            </span>
            <span className="flex items-center gap-1.5">
              <Sun className="h-3.5 w-3.5" /> UV {currentWeather.uvIndex}
            </span>
            {resolvedLocation && (
              <span className="flex items-center gap-1.5 font-medium text-white/80">
                <MapPin className="h-3.5 w-3.5" /> {resolvedLocation}
              </span>
            )}
          </div>
        </div>
      )}

      {/* ── Map + Sidebar Layout ─── */}
      <div className="flex gap-4" style={{ height: "60vh", minHeight: 450 }}>
        {/* Map Area */}
        <div className="relative flex-1 overflow-hidden rounded-2xl border border-slate-200 shadow-lg dark:border-slate-700">
          <div ref={mapContainer} className="h-full w-full" />

          {/* Map loading state */}
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm">
              <div className="text-center">
                <Loader2 className="mx-auto mb-2 h-8 w-8 animate-spin text-blue-400" />
                <p className="text-sm text-white/60">Loading map…</p>
              </div>
            </div>
          )}

          {/* Overlay layer switcher (floating pill in top-right of map) */}
          <div className="absolute right-3 top-3 z-10 flex gap-1 rounded-xl border border-white/20 bg-slate-900/80 p-1 backdrop-blur-md">
            {(
              [
                { key: "claims", label: "Claims", icon: MapPin },
                { key: "heatmap", label: "Heat", icon: Layers },
                { key: "storms", label: "Storms", icon: CloudLightning },
              ] as const
            ).map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                onClick={() => setActiveOverlay(key)}
                className={cn(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all",
                  activeOverlay === key
                    ? "bg-blue-600 text-white shadow-md"
                    : "text-white/60 hover:bg-white/10 hover:text-white"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>

          {/* Map legend */}
          <div className="absolute bottom-3 right-3 z-10 flex items-center gap-3 rounded-lg border border-white/10 bg-slate-900/70 px-3 py-2 text-[10px] text-white/60 backdrop-blur-md">
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" /> Low
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" /> Moderate
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-orange-500" /> Severe
            </span>
            <span className="flex items-center gap-1">
              <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" /> Extreme
            </span>
            <span className="ml-2 text-white/40">{markers.length} claims</span>
          </div>

          {/* Claim detail popup (bottom-left) */}
          {selectedClaim && (
            <div className="absolute bottom-3 left-3 z-10 w-80 rounded-xl border border-white/20 bg-slate-900/90 p-4 text-sm text-white shadow-xl backdrop-blur-md">
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-semibold">Claim #{selectedClaim.claimNumber}</p>
                  <p className="mt-0.5 text-xs text-white/60">{selectedClaim.address}</p>
                </div>
                <button
                  onClick={() => setSelectedClaim(null)}
                  className="rounded-md px-2 py-0.5 text-xs text-white/40 hover:bg-white/10 hover:text-white"
                >
                  ✕
                </button>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 text-xs">
                {selectedClaim.dolDate && (
                  <span className="rounded-md bg-white/10 px-2 py-1">
                    DOL: {new Date(selectedClaim.dolDate).toLocaleDateString()}
                  </span>
                )}
                {selectedClaim.hailSize && (
                  <span className="rounded-md bg-white/10 px-2 py-1">
                    🧊 {selectedClaim.hailSize}&quot; hail
                  </span>
                )}
                {selectedClaim.windSpeed && (
                  <span className="rounded-md bg-white/10 px-2 py-1">
                    💨 {selectedClaim.windSpeed} mph
                  </span>
                )}
              </div>
              {selectedClaim.weatherSummary && (
                <p className="mt-2 text-xs leading-relaxed text-white/70">
                  {selectedClaim.weatherSummary.slice(0, 150)}
                  {selectedClaim.weatherSummary.length > 150 ? "…" : ""}
                </p>
              )}
              <div className="mt-3 flex gap-2">
                <Button size="sm" variant="secondary" className="flex-1 text-xs" asChild>
                  <Link href={`/claims/${selectedClaim.id}`}>
                    View Claim <ArrowRight className="ml-1 h-3 w-3" />
                  </Link>
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* ── Right Sidebar: Data Sets ─── */}
        <div className="flex w-80 shrink-0 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          <Tabs defaultValue="storms" className="flex h-full flex-col">
            <TabsList className="flex w-full shrink-0 rounded-none border-b bg-transparent p-0">
              <TabsTrigger
                value="storms"
                className="flex-1 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs data-[state=active]:border-blue-500 data-[state=active]:text-blue-500"
              >
                Storms ({storms.length})
              </TabsTrigger>
              <TabsTrigger
                value="reports"
                className="flex-1 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs data-[state=active]:border-blue-500 data-[state=active]:text-blue-500"
              >
                Reports ({weatherReports.length})
              </TabsTrigger>
              <TabsTrigger
                value="alerts"
                className="flex-1 rounded-none border-b-2 border-transparent px-3 py-2.5 text-xs data-[state=active]:border-blue-500 data-[state=active]:text-blue-500"
              >
                Alerts ({alerts.length})
              </TabsTrigger>
            </TabsList>

            {/* ── Storms Tab ─── */}
            <TabsContent value="storms" className="mt-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-2">
                  {loadingData ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : storms.length === 0 ? (
                    <div className="px-3 py-10 text-center text-xs text-muted-foreground">
                      No recent storm events
                    </div>
                  ) : (
                    storms.map((storm) => (
                      <div
                        key={storm.id}
                        className="group cursor-pointer rounded-lg p-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
                        onClick={() => flyToStorm(storm)}
                      >
                        <div className="flex items-center gap-2">
                          <CloudLightning className="h-4 w-4 shrink-0 text-amber-500" />
                          <span className="text-sm font-medium text-foreground">
                            {storm.location}
                          </span>
                          <Badge
                            variant="outline"
                            className="ml-auto text-[10px]"
                            style={{
                              borderColor: severityColor(storm.severity),
                              color: severityColor(storm.severity),
                            }}
                          >
                            {storm.severity}
                          </Badge>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-[11px] text-muted-foreground">
                          <span>{new Date(storm.date).toLocaleDateString()}</span>
                          {storm.hailSize && <span>🧊 {storm.hailSize}&quot;</span>}
                          {storm.windSpeed && <span>💨 {storm.windSpeed} mph</span>}
                          <span>{storm.impactedProperties} props</span>
                        </div>
                        <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={(e) => {
                              e.stopPropagation();
                              void useAsEvidence({ id: storm.id, type: "storm" });
                            }}
                            disabled={attachingEvidence === storm.id}
                          >
                            {attachingEvidence === storm.id ? (
                              <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                            ) : (
                              <FileWarning className="mr-1 h-3 w-3" />
                            )}
                            Use as Evidence
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Reports Tab ─── */}
            <TabsContent value="reports" className="mt-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-2">
                  {loadingData ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : weatherReports.length === 0 ? (
                    <div className="px-3 py-10 text-center text-xs text-muted-foreground">
                      <p>No weather reports yet</p>
                      <Button size="sm" variant="outline" className="mt-3" asChild>
                        <Link href="/weather">Generate Report</Link>
                      </Button>
                    </div>
                  ) : (
                    weatherReports.map((report) => (
                      <div
                        key={report.id}
                        className="group rounded-lg p-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-800"
                      >
                        <div className="flex items-center gap-2">
                          <CloudRain className="h-4 w-4 shrink-0 text-blue-500" />
                          <span className="text-sm font-medium text-foreground">
                            {report.address || "Weather Report"}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-2 text-[11px] text-muted-foreground">
                          {report.primaryPeril && (
                            <Badge variant="secondary" className="text-[10px]">
                              {report.primaryPeril}
                            </Badge>
                          )}
                          <span>{new Date(report.createdAt).toLocaleDateString()}</span>
                          {report.confidence != null && (
                            <span>{Math.round(report.confidence * 100)}% conf</span>
                          )}
                        </div>
                        {report.overallAssessment && (
                          <p className="mt-1 text-[11px] leading-relaxed text-muted-foreground">
                            {report.overallAssessment.slice(0, 100)}
                            {report.overallAssessment.length > 100 ? "…" : ""}
                          </p>
                        )}
                        <div className="mt-2 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            onClick={() => void useAsEvidence({ id: report.id, type: "report" })}
                            disabled={attachingEvidence === report.id}
                          >
                            <FileWarning className="mr-1 h-3 w-3" />
                            Use as Evidence
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px]"
                            asChild
                          >
                            <Link href={`/weather?reportId=${report.id}`}>
                              <ExternalLink className="mr-1 h-3 w-3" />
                              View
                            </Link>
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            {/* ── Alerts Tab ─── */}
            <TabsContent value="alerts" className="mt-0 flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="space-y-1 p-2">
                  {loadingData ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                  ) : alerts.length === 0 ? (
                    <div className="px-3 py-10 text-center text-xs text-muted-foreground">
                      <ShieldAlert className="mx-auto mb-2 h-8 w-8 text-green-400/40" />
                      <p className="font-medium text-foreground">All Clear</p>
                      <p className="mt-1">No active severe weather alerts</p>
                    </div>
                  ) : (
                    alerts.map((alert) => (
                      <div
                        key={alert.id}
                        className={cn("rounded-lg border p-3", alertSeverityStyle(alert.severity))}
                      >
                        <div className="flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 shrink-0" />
                          <span className="text-sm font-semibold">{alert.event}</span>
                        </div>
                        <p className="mt-1 text-[11px] leading-relaxed opacity-80">
                          {alert.headline?.slice(0, 120)}
                          {(alert.headline?.length || 0) > 120 ? "…" : ""}
                        </p>
                        <div className="mt-1.5 flex items-center gap-2 text-[10px] opacity-60">
                          <span>{alert.urgency}</span>
                          <span>·</span>
                          <span>{alert.areas?.split(";")[0]}</span>
                          <span>·</span>
                          <span>
                            Expires{" "}
                            {new Date(alert.expires).toLocaleString("en-US", {
                              month: "short",
                              day: "numeric",
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </span>
                        </div>
                        <div className="mt-2">
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-6 px-2 text-[10px] text-current hover:bg-white/10"
                            onClick={() => void useAsEvidence({ id: alert.id, type: "alert" })}
                          >
                            <FileWarning className="mr-1 h-3 w-3" />
                            Use as Evidence
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>
            </TabsContent>
          </Tabs>
        </div>
      </div>

      {/* ── 7-Day Forecast Strip ─── */}
      {forecast.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Thermometer className="h-4 w-4 text-blue-500" />
              7-Day Forecast
            </h3>
            <div className="flex items-center gap-2">
              {/* City selector dropdown */}
              <select
                value={forecastCity}
                onChange={(e) => handleCitySelect(e.target.value)}
                className="h-7 rounded-md border border-slate-200 bg-white px-2 text-xs text-foreground focus:border-blue-400 focus:outline-none focus:ring-1 focus:ring-blue-400 dark:border-slate-700 dark:bg-slate-800"
              >
                {FORECAST_CITIES.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button className="text-muted-foreground transition-colors hover:text-foreground">
                      <Info className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="bottom" className="max-w-[260px] text-xs">
                    <p>
                      Forecast defaults to your <strong>Trades Network profile</strong> location.
                      Update your city in{" "}
                      <Link href="/trades/profile" className="text-blue-400 underline">
                        Trades Profile
                      </Link>{" "}
                      to auto-set this.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
              {resolvedLocation && (
                <span className="flex items-center gap-1 text-xs text-muted-foreground">
                  <MapPin className="h-3 w-3" />
                  {resolvedLocation}
                </span>
              )}
            </div>
          </div>
          <div className="grid grid-cols-7 gap-2">
            {forecast.slice(0, 7).map((day, i) => (
              <div
                key={day.date}
                className={cn(
                  "flex flex-col items-center rounded-xl border px-2 py-3 transition-all hover:shadow-md",
                  i === 0
                    ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/30"
                    : "border-slate-100 bg-slate-50/50 dark:border-slate-800 dark:bg-slate-800/40"
                )}
              >
                <span
                  className={cn(
                    "text-xs font-semibold",
                    i === 0 ? "text-blue-600 dark:text-blue-400" : "text-foreground"
                  )}
                >
                  {dayName(day.date)}
                </span>
                <div className="my-2">{getWeatherIcon(day.icon, "h-7 w-7")}</div>
                <div className="text-center">
                  <span className="text-sm font-bold text-foreground">{day.tempMax}°</span>
                  <span className="mx-0.5 text-xs text-muted-foreground">/</span>
                  <span className="text-xs text-muted-foreground">{day.tempMin}°</span>
                </div>
                <div className="mt-1.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Droplets className="h-3 w-3 text-blue-400" />
                  <span>{day.precipProb}%</span>
                </div>
                <div className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                  <Wind className="h-3 w-3" />
                  <span>{day.windSpeed}</span>
                </div>
                <div className="mt-1 text-[9px] leading-tight text-muted-foreground">
                  {day.conditions.length > 15 ? day.conditions.slice(0, 15) + "…" : day.conditions}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Active Alerts Banner ─── */}
      {alerts.length > 0 && (
        <div className="space-y-2">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            Active Weather Alerts ({alerts.length})
          </h3>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {alerts.slice(0, 6).map((alert) => (
              <Card
                key={alert.id}
                className={cn(
                  "border transition-all hover:shadow-md",
                  alert.severity === "Extreme" || alert.severity === "Severe"
                    ? "border-red-300 dark:border-red-800"
                    : "border-amber-200 dark:border-amber-800"
                )}
              >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <AlertTriangle
                      className="h-4 w-4 shrink-0"
                      style={{ color: severityColor(alert.severity) }}
                    />
                    {alert.event}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-1.5 text-xs text-muted-foreground">
                  <p className="line-clamp-2">{alert.headline}</p>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant="outline"
                      className="text-[10px]"
                      style={{
                        borderColor: severityColor(alert.severity),
                        color: severityColor(alert.severity),
                      }}
                    >
                      {alert.severity}
                    </Badge>
                    <span>{alert.areas?.split(";")[0]}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
          {alerts.length > 6 && (
            <div className="text-center">
              <Button variant="outline" size="sm" asChild>
                <Link href="/storm-center">
                  View All Alerts <ArrowRight className="ml-1 h-3 w-3" />
                </Link>
              </Button>
            </div>
          )}
        </div>
      )}

      {/* ── Quick Actions Footer ─── */}
      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800/50">
        <span className="text-xs font-medium text-muted-foreground">Quick Actions:</span>
        <Button size="sm" variant="outline" asChild>
          <Link href="/weather">
            <CloudRain className="mr-1.5 h-3.5 w-3.5" />
            Generate Weather Report
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/quick-dol">
            <Sunrise className="mr-1.5 h-3.5 w-3.5" />
            Quick DOL Pull
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/storm-center">
            <CloudLightning className="mr-1.5 h-3.5 w-3.5" />
            Storm Center
          </Link>
        </Button>
        <Button size="sm" variant="outline" asChild>
          <Link href="/maps/door-knocking">
            <MapPin className="mr-1.5 h-3.5 w-3.5" />
            Door Knocking
          </Link>
        </Button>
        <Button size="sm" variant="ghost" onClick={() => void fetchAllData()} className="ml-auto">
          <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>
    </div>
  );
}
