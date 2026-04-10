import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

import { logger } from "@/lib/logger";

interface MapboxMapProps {
  properties: Array<{
    id: number;
    address: string;
    lat: number;
    lon: number;
    status: string;
    damage: number;
  }>;
}

export default function MapboxMap({ properties }: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // eslint-disable-next-line no-console
    console.log("[MapboxMap] Initializing map", {
      hasToken: !!process.env.NEXT_PUBLIC_MAPBOX_TOKEN,
      propertyCount: properties.length,
    });

    // Use token from environment
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null;

    if (!token) {
      logger.error("[MapboxMap] No token available");
      setError("Map temporarily unavailable");
      setIsLoading(false);
      return;
    }

    try {
      logger.debug("[MapboxMap] Setting up map instance");
      mapboxgl.accessToken = token;

      // Initialize map centered on Prescott, AZ (Phase 1 Rule: Use Prescott fallback)
      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [-112.4685, 34.61], // Prescott, AZ
        zoom: 11,
      });

      // Add navigation controls
      map.current.addControl(
        new mapboxgl.NavigationControl({
          visualizePitch: true,
        }),
        "top-right"
      );

      map.current.on("load", () => {
        logger.debug("[MapboxMap] Map loaded successfully");
        setMapLoaded(true);
        setIsLoading(false);
      });

      map.current.on("error", (e) => {
        logger.error("[MapboxMap] Map error:", e);
        setError("Map temporarily unavailable");
        setIsLoading(false);
      });
    } catch (err: any) {
      logger.error("[MapboxMap] Initialization failed:", err);
      setError("Map temporarily unavailable");
      setIsLoading(false);
    }

    return () => {
      map.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Add markers when map loads
  useEffect(() => {
    if (!map.current || !mapLoaded || properties.length === 0) return;

    // Clear existing markers
    const existingMarkers = document.querySelectorAll(".mapboxgl-marker");
    existingMarkers.forEach((marker) => marker.remove());

    // Add new markers
    properties.forEach((property) => {
      const markerColor =
        property.damage > 70 ? "#ef4444" : property.damage > 40 ? "#eab308" : "#22c55e";

      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.width = "32px";
      el.style.height = "32px";
      el.style.borderRadius = "50%";
      el.style.backgroundColor = markerColor;
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
      el.style.cursor = "pointer";

      const popup = new mapboxgl.Popup({ offset: 25 }).setHTML(
        `
          <div style="padding: 8px;">
            <strong style="font-size: 14px;">${property.address}</strong>
            <p style="margin: 4px 0; font-size: 12px;">Damage: ${property.damage}%</p>
            <span style="font-size: 11px; color: #666;">${property.status}</span>
          </div>
        `
      );

      new mapboxgl.Marker(el)
        .setLngLat([property.lon, property.lat])
        .setPopup(popup)
        .addTo(map.current!);
    });

    // Fit map to show all markers
    if (properties.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      properties.forEach((property) => {
        bounds.extend([property.lon, property.lat]);
      });
      map.current.fitBounds(bounds, { padding: 50 });
    }
  }, [mapLoaded, properties]);

  // Render error state with graceful fallback
  if (error) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-50 to-blue-50 p-8 dark:border-slate-700 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-blue-100 dark:bg-blue-900/30">
            <svg
              className="h-8 w-8 text-blue-600 dark:text-blue-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            Map Temporarily Unavailable
          </h3>
          <p className="text-sm text-slate-600 dark:text-slate-400">{error}</p>
          <div className="mt-4 space-y-2">
            <p className="text-xs text-slate-500 dark:text-slate-500">
              Showing property list instead:
            </p>
            <div className="max-h-64 overflow-y-auto rounded-lg border border-slate-200 bg-white p-4 text-left dark:border-slate-700 dark:bg-slate-800">
              {properties.length > 0 ? (
                <ul className="space-y-2">
                  {properties.map((prop) => (
                    <li key={prop.id} className="text-sm">
                      <p className="font-medium text-slate-900 dark:text-slate-100">
                        {prop.address}
                      </p>
                      <p className="text-xs text-slate-600 dark:text-slate-400">
                        Status: {prop.status} • Damage: {prop.damage}%
                      </p>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No properties to display</p>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render loading state
  if (isLoading || !mapLoaded) {
    return (
      <div className="relative h-[600px] w-full overflow-hidden rounded-2xl border border-[#117CFF]/20 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-[#117CFF]/20 border-t-[#117CFF]" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-[#117CFF]">Loading Map</p>
              <p className="text-sm text-muted-foreground">Preparing your map view...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-muted">
        <div className="p-6 text-center">
          <p className="mb-2 font-medium text-destructive">Map Error</p>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </div>
    );
  }

  return <div ref={mapContainer} className="h-full w-full rounded-lg" />;
}
