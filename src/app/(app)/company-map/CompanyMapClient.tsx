"use client";
/* eslint-disable react/jsx-no-comment-textnodes, no-restricted-syntax */

import { MapPin, Navigation } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

import type { PropertyLocation } from "./actions";

export default function CompanyMapClient({ locations }: { locations: PropertyLocation[] }) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [selectedLocation, setSelectedLocation] = useState<PropertyLocation | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [mapInitialized, setMapInitialized] = useState(false);

  useEffect(() => {
    // Check if we already loaded the script
    if (mapInitialized || !mapContainer.current) return;

    // eslint-disable-next-line no-restricted-syntax
    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || null;

    if (!token) {
      logger.warn("Mapbox token not configured");
      setMapReady(true);
      return;
    }

    // Load Mapbox GL JS dynamically
    const loadMapbox = async () => {
      try {
        // Check if already loaded
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        if (typeof window !== "undefined" && (window as any).mapboxgl) {
          initializeMap(token);
          return;
        }

        // Load Mapbox CSS
        const link = document.createElement("link");
        link.rel = "stylesheet";
        link.href = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.css";
        document.head.appendChild(link);

        // Load Mapbox JS
        const script = document.createElement("script");
        script.src = "https://api.mapbox.com/mapbox-gl-js/v3.0.1/mapbox-gl.js";
        script.async = true;
        script.onload = () => initializeMap(token);
        document.head.appendChild(script);
      } catch (error) {
        logger.error("Failed to load Mapbox:", error);
        setMapReady(true);
      }
    };

    function initializeMap(token: string) {
      if (!mapContainer.current || mapInitialized) return;

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const mapboxgl = (window as any).mapboxgl;
      if (!mapboxgl) return;

      mapboxgl.accessToken = token;

      // Determine center point
      const center =
        locations[0] && locations[0].lng && locations[0].lat
          ? [locations[0].lng, locations[0].lat]
          : [-112.074, 33.4484]; // Phoenix, AZ default

      const map = new mapboxgl.Map({
        container: mapContainer.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: center,
        zoom: 10,
      });

      // Add markers for each location
      locations.forEach((loc) => {
        if (loc.lat && loc.lng) {
          const markerEl = document.createElement("div");
          markerEl.className = "custom-marker";
          markerEl.style.backgroundColor = getMarkerColor(loc.status);
          markerEl.style.width = "24px";
          markerEl.style.height = "24px";
          markerEl.style.borderRadius = "50%";
          markerEl.style.border = "3px solid white";
          markerEl.style.boxShadow = "0 2px 4px rgba(0,0,0,0.3)";
          markerEl.style.cursor = "pointer";

          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const marker = new mapboxgl.Marker(markerEl)
            .setLngLat([loc.lng, loc.lat])
            .setPopup(
              new mapboxgl.Popup({ offset: 25 }).setHTML(`
                <div style="padding: 8px;">
                  <strong style="font-size: 14px;">${loc.name}</strong><br>
                  <span style="font-size: 12px; color: #666;">${loc.street}</span><br>
                  <span style="font-size: 12px; color: #666;">${loc.city}, ${loc.state} ${loc.zipCode}</span><br>
                  ${loc.status ? `<span style="font-size: 11px; color: #999; margin-top: 4px; display: inline-block;">${loc.status}</span>` : ""}
                </div>
              `)
            )
            .addTo(map);

          markerEl.addEventListener("click", () => {
            setSelectedLocation(loc);
          });
        }
      });

      setMapInitialized(true);
      setMapReady(true);

      // Cleanup
      return () => {
        map.remove();
      };
    }

    void loadMapbox();
  }, [locations, mapInitialized]);

  function getMarkerColor(status?: string) {
    switch (status) {
      case "Active Claim":
        return "#ef4444"; // red
      case "Project":
        return "#3b82f6"; // blue
      default:
        return "#10b981"; // green
    }
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
      {/* Map */}
      <div className="lg:col-span-2">
        <div className="overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] shadow-sm">
          <div ref={mapContainer} className="h-[600px] w-full bg-[var(--surface-1)]">
            {/* Fallback: show empty state or config message */}
            {mapReady && (
              <div className="flex h-full items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 p-8">
                <div className="max-w-md text-center">
                  {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN ? (
                    <>
                      <MapPin className="mx-auto h-16 w-16 text-orange-600" />
                      <h3 className="mt-4 text-lg font-medium text-[color:var(--text)]">
                        Mapbox Token Required
                      </h3>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        Add{" "}
                        <code className="rounded bg-[var(--surface-1)] px-2 py-1 font-mono text-xs">
                          NEXT_PUBLIC_MAPBOX_TOKEN
                        </code>{" "}
                        to your Vercel environment variables to enable interactive maps.
                      </p>
                      <a
                        href="https://vercel.com/docs/projects/environment-variables"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-4 inline-block text-sm text-blue-600 hover:underline"
                      >
                        Learn how to add environment variables →
                      </a>
                    </>
                  ) : locations.length === 0 ? (
                    <>
                      <MapPin className="mx-auto h-16 w-16 text-slate-700 dark:text-slate-300" />
                      <h3 className="mt-4 text-lg font-medium text-[color:var(--text)]">
                        No Locations Yet
                      </h3>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        Add properties with addresses to see them plotted on the map.
                      </p>
                    </>
                  ) : (
                    <>
                      <MapPin className="mx-auto h-16 w-16 text-blue-600" />
                      <h3 className="mt-4 text-lg font-medium text-[color:var(--text)]">
                        Map Ready
                      </h3>
                      <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                        {locations.length} locations ready to display.
                      </p>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sidebar: Location List */}
      <div className="lg:col-span-1">
        <div className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
          <h3 className="mb-4 text-lg font-semibold text-[color:var(--text)]">
            Locations ({locations.length})
          </h3>

          <div className="max-h-[540px] space-y-3 overflow-y-auto">
            {locations.map((loc) => (
              <button
                key={loc.id}
                onClick={() => setSelectedLocation(loc)}
                className={`w-full rounded-lg border p-3 text-left transition-all hover:shadow-md ${
                  selectedLocation?.id === loc.id
                    ? "border-blue-500 bg-blue-50"
                    : "border-[color:var(--border)] bg-[var(--surface-1)] hover:border-[color:var(--border)]"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`mt-1 h-3 w-3 flex-shrink-0 rounded-full ${
                      loc.status === "Active Claim"
                        ? "bg-red-500"
                        : loc.status === "Project"
                          ? "bg-blue-500"
                          : "bg-green-500"
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-[color:var(--text)]">{loc.name}</div>
                    <div className="mt-1 text-xs text-slate-700 dark:text-slate-300">
                      {loc.street}
                      <br />
                      {loc.city}, {loc.state} {loc.zipCode}
                    </div>
                    {loc.status && (
                      <div className="mt-2 inline-block rounded-full bg-[var(--surface-1)] px-2 py-0.5 text-[10px] font-medium text-[color:var(--text)]">
                        {loc.status}
                      </div>
                    )}
                    {loc.projectCount || loc.claimCount ? (
                      <div className="mt-1 flex gap-2 text-[10px] text-slate-700 dark:text-slate-300">
                        {loc.projectCount ? <span>{loc.projectCount} projects</span> : null}
                        {loc.claimCount ? <span>{loc.claimCount} claims</span> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              </button>
            ))}

            {locations.length === 0 && (
              <div className="rounded-lg bg-[var(--surface-2)] p-4 text-center text-sm text-slate-700 dark:text-slate-300">
                No locations to display
              </div>
            )}
          </div>
        </div>

        {/* Selected Location Details */}
        {selectedLocation && (
          <div className="mt-4 rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm">
            <h4 className="font-semibold text-[color:var(--text)]">{selectedLocation.name}</h4>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              {selectedLocation.street}
              <br />
              {selectedLocation.city}, {selectedLocation.state} {selectedLocation.zipCode}
            </p>

            <div className="mt-4 flex gap-2">
              <Button asChild className="flex items-center gap-1 bg-sky-600 hover:bg-sky-700">
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    `${selectedLocation.street}, ${selectedLocation.city}, ${selectedLocation.state} ${selectedLocation.zipCode}`
                  )}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Navigation className="h-4 w-4" />
                  Directions
                </a>
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
