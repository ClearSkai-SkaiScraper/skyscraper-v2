"use client";
/* eslint-disable react/jsx-no-comment-textnodes, no-restricted-syntax */

import "mapbox-gl/dist/mapbox-gl.css";

import { useEffect, useRef, useState } from "react";

import { logger } from "@/lib/logger";

export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  type?: string;
  color?: string;
}

interface MapboxMapProps {
  markers: MapMarker[];
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  className?: string;
}

export default function MapboxMap({
  markers,
  initialCenter = { lat: 33.4484, lng: -112.074 }, // Phoenix, AZ default
  initialZoom = 10,
  className = "h-full w-full",
}: MapboxMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapboxRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const map = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markersRef = useRef<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token =
      // eslint-disable-next-line no-restricted-syntax
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      // eslint-disable-next-line no-restricted-syntax
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
      // eslint-disable-next-line no-restricted-syntax
      process.env.NEXT_PUBLIC_MAPBOXGL_ACCESS_TOKEN;

    if (!token) {
      setError(
        "Mapbox token not configured. Add NEXT_PUBLIC_MAPBOX_TOKEN (or NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN) to your environment variables."
      );
      setIsLoading(false);
      logger.warn("[MapboxMap] NEXT_PUBLIC_MAPBOX_TOKEN not configured. Maps unavailable.");
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled) return;

        mapboxRef.current = mapboxgl;
        mapboxgl.accessToken = token;

        map.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [initialCenter.lng, initialCenter.lat],
          zoom: initialZoom,
          attributionControl: true,
        });

        // Add navigation controls (zoom in/out, compass)
        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
        map.current.addControl(new mapboxgl.FullscreenControl(), "top-left");

        map.current.on("load", () => {
          setIsLoading(false);
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        map.current.on("error", (e: any) => {
          logger.error("[MapboxMap] Map error:", e);
          setError("Map temporarily unavailable. Please refresh the page.");
          setIsLoading(false);
        });
      } catch (err) {
        logger.error("[MapboxMap] Initialization error:", err);
        setError("Map temporarily unavailable.");
        setIsLoading(false);
      }
    })();

    // Cleanup
    return () => {
      cancelled = true;
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom]);

  // Update markers when they change
  useEffect(() => {
    if (!map.current || isLoading || !mapboxRef.current) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    if (!markers || markers.length === 0) return;

    // Filter out any markers without valid coordinates to prevent Mapbox errors
    const validMarkers = markers.filter(
      (m) =>
        typeof m.lat === "number" &&
        typeof m.lng === "number" &&
        Number.isFinite(m.lat) &&
        Number.isFinite(m.lng)
    );

    if (validMarkers.length === 0) return;

    // Add new markers
    validMarkers.forEach((markerData) => {
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.backgroundColor = markerData.color || "#117CFF";
      el.style.width = "12px";
      el.style.height = "12px";
      el.style.borderRadius = "50%";
      el.style.border = "2px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.2)";
      el.style.cursor = "pointer";

      const marker = new mapboxRef.current.Marker(el)
        .setLngLat([markerData.lng, markerData.lat])
        .addTo(map.current!);

      // Add popup with label
      if (markerData.label) {
        const popup = new mapboxRef.current.Popup({ offset: 15 }).setHTML(
          `<div style="padding: 4px; font-size: 12px; color: #000;">${markerData.label}</div>`
        );
        marker.setPopup(popup);
      }

      markersRef.current.push(marker);
    });

    // Fit bounds to show all markers if there are any
    if (validMarkers.length > 0) {
      const bounds = new mapboxRef.current.LngLatBounds();
      validMarkers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.current.fitBounds(bounds, { padding: 50, maxZoom: 15 });
    }
  }, [markers, isLoading]);

  return (
    <div className={"relative " + className}>
      <div ref={mapContainer} className="h-full w-full" />

      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
          <div className="text-center">
            <div className="mb-3 text-4xl">🗺️</div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-muted/20 p-4">
          <div className="max-w-md rounded-lg border border-destructive/20 bg-destructive/5 p-6 text-center">
            <div className="mb-3 text-4xl">🗺️</div>
            <h3 className="mb-2 text-lg font-semibold text-foreground">Map Unavailable</h3>
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <p className="text-sm text-muted-foreground">{error}</p>
            // eslint-disable-next-line no-restricted-syntax
            // eslint-disable-next-line no-restricted-syntax
            {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN &&
              // eslint-disable-next-line no-restricted-syntax
              !process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN &&
              // eslint-disable-next-line no-restricted-syntax
              !process.env.NEXT_PUBLIC_MAPBOXGL_ACCESS_TOKEN && (
                <div className="mt-4 rounded border border-border bg-muted/50 p-3 text-left">
                  <p className="text-xs text-muted-foreground">
                    <strong>For developers:</strong>
                    <br />
                    Add{" "}
                    <code className="rounded bg-background px-1 py-0.5">
                      NEXT_PUBLIC_MAPBOX_TOKEN
                    </code>{" "}
                    (or{" "}
                    <code className="rounded bg-background px-1 py-0.5">
                      NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN
                    </code>
                    ) to your <code className="rounded bg-background px-1 py-0.5">.env.local</code>{" "}
                    file.
                  </p>
                </div>
              )}
          </div>
        </div>
      )}
    </div>
  );
}
