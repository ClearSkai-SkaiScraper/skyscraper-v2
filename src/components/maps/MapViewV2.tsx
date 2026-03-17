"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

import { logger } from "@/lib/logger";

// Clean marker interface - no business logic
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  label?: string;
  type?: string;
  color?: string;
}

interface MapViewV2Props {
  markers: MapMarker[];
  initialCenter?: { lat: number; lng: number };
  initialZoom?: number;
  routePolyline?: GeoJSON.LineString | null;
  className?: string;
}

export default function MapViewV2({
  markers,
  initialCenter = { lat: 33.4484, lng: -112.074 }, // Phoenix, AZ default
  initialZoom = 10,
  routePolyline,
  className = "h-full w-full",
}: MapViewV2Props) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Initialize map once
  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOXGL_ACCESS_TOKEN;

    if (!token) {
      setError(
        "Maps require Mapbox configuration. Contact your administrator to enable map features."
      );
      setIsLoading(false);
      logger.warn("[MapViewV2] NEXT_PUBLIC_MAPBOX_TOKEN not configured. Maps unavailable.");
      return;
    }

    try {
      mapboxgl.accessToken = token;

      map.current = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: [initialCenter.lng, initialCenter.lat],
        zoom: initialZoom,
        attributionControl: true,
      });

      // Add controls
      map.current.addControl(new mapboxgl.NavigationControl(), "top-right");
      map.current.addControl(new mapboxgl.FullscreenControl(), "top-left");

      map.current.on("load", () => {
        setIsLoading(false);
      });

      map.current.on("error", (e) => {
        logger.error("[MapViewV2] Map error:", e);
        setError("Map temporarily unavailable. Please refresh the page.");
        setIsLoading(false);
      });
    } catch (err) {
      logger.error("[MapViewV2] Initialization error:", err);
      setError("Failed to initialize map. Please refresh the page.");
      setIsLoading(false);
    }

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [initialCenter.lat, initialCenter.lng, initialZoom]);

  // Update markers when they change
  useEffect(() => {
    if (!map.current || isLoading) return;

    // Clear existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach((marker) => {
      if (!map.current) return;

      // Create custom marker element
      const el = document.createElement("div");
      el.className = "custom-marker";
      el.style.width = "30px";
      el.style.height = "30px";
      el.style.borderRadius = "50%";
      el.style.cursor = "pointer";
      el.style.backgroundColor = marker.color || "#117CFF";
      el.style.border = "3px solid white";
      el.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";

      // Create popup if label exists
      const popup = marker.label
        ? new mapboxgl.Popup({ offset: 25, closeButton: false }).setHTML(
            `<div style="padding: 8px; font-size: 14px; font-weight: 500;">${marker.label}</div>`
          )
        : undefined;

      const mapboxMarker = new mapboxgl.Marker(el)
        .setLngLat([marker.lng, marker.lat])
        .addTo(map.current);

      if (popup) {
        mapboxMarker.setPopup(popup);
      }

      markersRef.current.push(mapboxMarker);
    });

    // Auto-fit bounds if we have markers
    if (markers.length > 0 && map.current) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((marker) => {
        bounds.extend([marker.lng, marker.lat]);
      });

      map.current.fitBounds(bounds, {
        padding: 50,
        maxZoom: 15,
      });
    }
  }, [markers, isLoading]);

  // Draw route polyline if provided
  useEffect(() => {
    if (!map.current || isLoading || !routePolyline) return;

    const sourceId = "route-line";
    const layerId = "route-layer";

    map.current.on("load", () => {
      if (!map.current) return;

      // Remove existing route if any
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }

      // Add route source
      map.current.addSource(sourceId, {
        type: "geojson",
        data: {
          type: "Feature",
          properties: {},
          geometry: routePolyline,
        },
      });

      // Add route layer
      map.current.addLayer({
        id: layerId,
        type: "line",
        source: sourceId,
        layout: {
          "line-join": "round",
          "line-cap": "round",
        },
        paint: {
          "line-color": "#117CFF",
          "line-width": 4,
          "line-opacity": 0.8,
        },
      });
    });

    return () => {
      if (!map.current) return;
      if (map.current.getLayer(layerId)) {
        map.current.removeLayer(layerId);
      }
      if (map.current.getSource(sourceId)) {
        map.current.removeSource(sourceId);
      }
    };
  }, [routePolyline, isLoading]);

  if (error) {
    return (
      <div className={className}>
        <div className="flex h-full items-center justify-center rounded-lg border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950">
          <div className="max-w-md space-y-3 p-6 text-center">
            <svg
              className="mx-auto h-12 w-12 text-red-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
            <h3 className="text-lg font-semibold text-red-900 dark:text-red-100">
              Map Unavailable
            </h3>
            <p className="text-sm text-red-700 dark:text-red-300">{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={className}>
      {isLoading && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/80">
          <div className="space-y-3 text-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            <p className="text-sm text-muted-foreground">Loading map...</p>
          </div>
        </div>
      )}
      <div ref={mapContainer} className="h-full w-full rounded-lg" />
    </div>
  );
}
