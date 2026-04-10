"use client";
import "mapbox-gl/dist/mapbox-gl.css";

import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";

import { getMapboxToken, logMapboxDebugContext } from "@/lib/debug/mapboxDebug";
import { logger } from "@/lib/logger";

export default function MapClient() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    logMapboxDebugContext("MapClient mount");

    // Get token from environment
    // eslint-disable-next-line no-restricted-syntax
    const token = getMapboxToken() || process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null;

    if (!token) {
      setError("Mapbox token not configured");
      setIsLoading(false);
      return;
    }

    // Prevent duplicate initialization
    if (map.current) return;

    // Removed hard timeout - let Mapbox handle load events naturally
    // If map fails to load, the 'error' event will handle it
    let loadTimeout: NodeJS.Timeout | null = null;

    // Wait for container to be ready in DOM
    const initMap = () => {
      if (!mapContainer.current) {
        logger.warn("[MapClient] Container not ready, retrying...");
        setTimeout(initMap, 100);
        return;
      }

      try {
        mapboxgl.accessToken = token;

        map.current = new mapboxgl.Map({
          container: mapContainer.current,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [-112.074, 33.4484], // Phoenix, AZ
          zoom: 10,
          attributionControl: true,
        });

        // Add navigation controls
        map.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        // Add fullscreen control
        map.current.addControl(new mapboxgl.FullscreenControl());

        map.current.on("load", () => {
          if (loadTimeout) clearTimeout(loadTimeout);
          setIsLoading(false);
          logger.debug("[MapClient] Mapbox GL map loaded successfully");
        });

        map.current.on("error", (e) => {
          logger.error("[MapClient] Mapbox error:", e);
          if (loadTimeout) clearTimeout(loadTimeout);
          setError("Failed to load map. Please check your internet connection and try again.");
          setIsLoading(false);
        });
      } catch (err) {
        logger.error("[MapClient] Initialization error:", err);
        if (loadTimeout) clearTimeout(loadTimeout);
        setError("Failed to initialize map. Please refresh the page.");
        setIsLoading(false);
      }
    };

    // Start initialization
    initMap();

    // Cleanup
    return () => {
      if (loadTimeout) clearTimeout(loadTimeout);
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, []); // Remove isLoading from dependencies to prevent infinite loop

  const handleRetry = () => {
    setError(null);
    setIsLoading(true);
    window.location.reload();
  };

  if (error) {
    return (
      <div className="flex h-[600px] w-full items-center justify-center rounded-2xl border border-[#117CFF]/20 bg-gradient-to-br from-white to-slate-50 p-8 dark:from-slate-900 dark:to-slate-800">
        <div className="max-w-md space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/20">
            <svg
              className="h-8 w-8 text-red-600"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <p className="text-lg font-semibold text-[#117CFF]">Map Unavailable</p>
          <p className="text-sm text-muted-foreground">{error}</p>
          <button
            onClick={handleRetry}
            className="rounded-lg bg-gradient-to-r from-[#117CFF] to-[#0066DD] px-6 py-2 text-sm font-medium text-white transition-all hover:shadow-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="relative h-[600px] w-full overflow-hidden rounded-2xl border border-[#117CFF]/20 bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="space-y-4 text-center">
            <div className="mx-auto h-16 w-16 animate-spin rounded-full border-4 border-[#117CFF]/20 border-t-[#117CFF]" />
            <div className="space-y-2">
              <p className="text-lg font-semibold text-[#117CFF]">Loading Map</p>
              <p className="text-sm text-muted-foreground">Initializing Mapbox GL...</p>
            </div>
          </div>
        </div>
        {/* Shimmer effect */}
        <div className="animate-shimmer absolute inset-0 bg-gradient-to-r from-transparent via-white/20 to-transparent" />
      </div>
    );
  }

  return (
    <div
      ref={mapContainer}
      className="relative h-[600px] w-full overflow-hidden rounded-2xl border border-[#117CFF]/20 shadow-lg"
    />
  );
}
