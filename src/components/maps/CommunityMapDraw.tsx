"use client";

import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import "mapbox-gl/dist/mapbox-gl.css";

import MapboxDraw from "@mapbox/mapbox-gl-draw";
import { area } from "@turf/area";
import mapboxgl from "mapbox-gl";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";

interface CommunityMapProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onPolygonComplete?: (polygon: any, estimatedHomes: number) => void;
  initialCenter?: [number, number];
}

/**
 * Community Polygon Drawing Tool
 * Uses Mapbox Draw to let users draw community boundaries
 * Estimates home count based on polygon area
 */
export function CommunityMapDraw({
  onPolygonComplete,
  initialCenter = [-112.074, 33.448], // Phoenix default
}: CommunityMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const draw = useRef<MapboxDraw | null>(null);
  const [homeEstimate, setHomeEstimate] = useState<number | null>(null);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Initialize map
    // eslint-disable-next-line no-restricted-syntax
    mapboxgl.accessToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/satellite-streets-v12",
      center: initialCenter,
      zoom: 14,
    });

    // Add Mapbox Draw controls
    draw.current = new MapboxDraw({
      displayControlsDefault: false,
      controls: {
        polygon: true,
        trash: true,
      },
      defaultMode: "draw_polygon",
    });

    map.current.addControl(draw.current);

    // Handle polygon drawing
    map.current.on("draw.create", handlePolygonCreate);
    map.current.on("draw.update", handlePolygonCreate);

    return () => {
      map.current?.remove();
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/no-unused-vars
  const handlePolygonCreate = (e: any) => {
    if (!draw.current) return;

    const data = draw.current.getAll();
    if (data.features.length > 0) {
      const polygon = data.features[0];

      // Estimate home count based on area
      // Simple heuristic: ~4 homes per acre (varies by density)
      const areaInMeters = area(polygon);
      const areaInAcres = areaInMeters * 0.000247105;
      const estimatedHomes = Math.round(areaInAcres * 4);

      setHomeEstimate(estimatedHomes);
      onPolygonComplete?.(polygon.geometry, estimatedHomes);

      toast.success(`Polygon drawn! Estimated ${estimatedHomes} homes`);
    }
  };

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <h3 className="mb-2 font-semibold">Draw Community Boundary</h3>
        <p className="text-sm text-muted-foreground">
          Click to draw a polygon around the community area. The system will estimate the number of
          homes inside.
        </p>
        {homeEstimate !== null && (
          <div className="mt-2 rounded bg-blue-50 p-2 text-sm font-medium text-blue-900 dark:bg-blue-950 dark:text-blue-100">
            Estimated: {homeEstimate} homes
          </div>
        )}
      </div>

      <div ref={mapContainer} className="h-[600px] w-full rounded-lg border" />
    </div>
  );
}
