"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { Cloud, CloudRain, RefreshCw, Wind, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

/* ─── Types ─── */
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

interface Props {
  markers: WeatherClaimMarker[];
  center: [number, number];
  mapboxToken: string;
}

function severityColor(s: string | null): string {
  switch (s) {
    case "extreme":
      return "#dc2626";
    case "severe":
      return "#ea580c";
    case "moderate":
      return "#f59e0b";
    case "low":
      return "#22c55e";
    default:
      return "#6b7280";
  }
}

function severityLabel(s: string | null): string {
  if (!s) return "Unknown";
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export default function WeatherMapClient({ markers, center, mapboxToken }: Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapboxRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);
  const [selected, setSelected] = useState<WeatherClaimMarker | null>(null);
  const [layer, setLayer] = useState<"claims" | "heatmap">("claims");

  /* ─── Initialize Mapbox ─── */
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
        attributionControl: true,
      });

      mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

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

  /* ─── Add markers + heatmap sources ─── */
  const renderMarkers = useCallback(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!map || !mapboxgl || !mapReady) return;

    // Clean up existing layers + sources
    ["weather-claims-layer", "weather-heatmap-layer"].forEach((id) => {
      if (map.getLayer(id)) map.removeLayer(id);
    });
    if (map.getSource("weather-claims")) map.removeSource("weather-claims");

    // Build GeoJSON source
    const geojson = {
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

    map.addSource("weather-claims", { type: "geojson", data: geojson });

    // Circle layer (claims view)
    map.addLayer({
      id: "weather-claims-layer",
      type: "circle",
      source: "weather-claims",
      layout: { visibility: layer === "claims" ? "visible" : "none" },
      paint: {
        "circle-radius": ["interpolate", ["linear"], ["zoom"], 8, 5, 14, 12],
        "circle-color": ["get", "color"],
        "circle-stroke-color": "#fff",
        "circle-stroke-width": 2,
        "circle-opacity": 0.85,
      },
    });

    // Heatmap layer
    map.addLayer({
      id: "weather-heatmap-layer",
      type: "heatmap",
      source: "weather-claims",
      layout: { visibility: layer === "heatmap" ? "visible" : "none" },
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
        "heatmap-opacity": 0.8,
      },
    });

    // Click handler
    map.on("click", "weather-claims-layer", (e: any) => {
      const feature = e.features?.[0];
      if (!feature) return;
      const marker = markers.find((m) => m.id === feature.properties.id);
      if (marker) setSelected(marker);
    });

    map.on("mouseenter", "weather-claims-layer", () => {
      map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", "weather-claims-layer", () => {
      map.getCanvas().style.cursor = "";
    });
  }, [markers, mapReady, layer]);

  useEffect(() => {
    renderMarkers();
  }, [renderMarkers]);

  /* ─── Toggle layer visibility ─── */
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    if (map.getLayer("weather-claims-layer")) {
      map.setLayoutProperty(
        "weather-claims-layer",
        "visibility",
        layer === "claims" ? "visible" : "none"
      );
    }
    if (map.getLayer("weather-heatmap-layer")) {
      map.setLayoutProperty(
        "weather-heatmap-layer",
        "visibility",
        layer === "heatmap" ? "visible" : "none"
      );
    }
  }, [layer, mapReady]);

  /* ─── Stats ─── */
  const severeCount = markers.filter(
    (m) => m.severity === "severe" || m.severity === "extreme"
  ).length;
  const withWeather = markers.filter((m) => m.weatherSummary).length;

  return (
    <div className="space-y-4">
      {/* Controls bar */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg border border-border bg-surface-panel p-0.5">
          <button
            onClick={() => setLayer("claims")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              layer === "claims"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <Zap className="mr-1.5 inline-block h-3.5 w-3.5" />
            Claims
          </button>
          <button
            onClick={() => setLayer("heatmap")}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
              layer === "heatmap"
                ? "bg-primary text-primary-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <CloudRain className="mr-1.5 inline-block h-3.5 w-3.5" />
            Heatmap
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-muted-foreground">
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
        </div>

        <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
          <span>{markers.length} claims mapped</span>
          <span>·</span>
          <span>{severeCount} severe/extreme</span>
          <span>·</span>
          <span>{withWeather} with weather data</span>
        </div>
      </div>

      {/* Map + detail panel */}
      <div className="flex gap-4">
        <div className="relative min-h-[60vh] flex-1 overflow-hidden rounded-xl border border-border">
          <div ref={mapContainer} className="h-full w-full" style={{ minHeight: "60vh" }} />
          {!mapReady && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted/30">
              <div className="text-center">
                <RefreshCw className="mx-auto mb-2 h-6 w-6 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading map…</p>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar detail card */}
        {selected && (
          <Card className="w-80 shrink-0 self-start">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-semibold">
                  Claim #{selected.claimNumber}
                </CardTitle>
                <Badge
                  variant="outline"
                  className="text-[10px]"
                  style={{
                    borderColor: severityColor(selected.severity),
                    color: severityColor(selected.severity),
                  }}
                >
                  {severityLabel(selected.severity)}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">{selected.address}</p>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {selected.dolDate && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Cloud className="h-4 w-4" />
                  <span>DOL: {new Date(selected.dolDate).toLocaleDateString()}</span>
                </div>
              )}
              {selected.hailSize && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CloudRain className="h-4 w-4" />
                  <span>Hail: {selected.hailSize}</span>
                </div>
              )}
              {selected.windSpeed && (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Wind className="h-4 w-4" />
                  <span>Wind: {selected.windSpeed}</span>
                </div>
              )}
              {selected.weatherSummary && (
                <div className="rounded-lg bg-muted/50 p-3 text-xs leading-relaxed">
                  {selected.weatherSummary}
                </div>
              )}
              {!selected.weatherSummary && (
                <p className="text-xs italic text-muted-foreground">
                  No weather report generated yet. Run a weather scan from the claim detail page.
                </p>
              )}
              <Button
                variant="outline"
                size="sm"
                className="w-full"
                onClick={() => window.open(`/claims/${selected.id}`, "_blank")}
              >
                View Claim →
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full text-muted-foreground"
                onClick={() => setSelected(null)}
              >
                Close
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
