"use client";

import { useState } from "react";
// @ts-expect-error - react-map-gl types may not match at build time
import Map, { Marker, Popup } from "react-map-gl/mapbox";

import { logger } from "@/lib/logger";

interface ContractorWithCoords {
  id: string;
  slug: string;
  businessName: string;
  lat: number;
  lng: number;
  distance?: number;
}

interface Contractor {
  id: string;
  slug: string;
  businessName: string;
  serviceAreas: Array<{
    lat?: number;
    lng?: number;
    city?: string;
  }>;
  distance?: number;
}

interface ContractorMapProps {
  contractors: Contractor[];
  origin: { lat: number; lng: number } | null;
}

export default function ContractorMap({ contractors, origin }: ContractorMapProps) {
  const [selected, setSelected] = useState<ContractorWithCoords | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Check for token
  // eslint-disable-next-line no-restricted-syntax
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  if (!token) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-[#117CFF]/20 bg-gradient-to-br from-white to-slate-50 p-8">
        <div className="max-w-md space-y-2 text-center">
          <p className="text-sm font-semibold text-[#117CFF]">Map Unavailable</p>
          <p className="text-xs text-muted-foreground">Mapbox token not configured</p>
        </div>
      </div>
    );
  }

  // Get center point
  const center = origin || { lat: 34.56, lng: -112.47 }; // Default to Prescott, AZ

  // Filter contractors that have coordinates
  const contractorsWithCoords: ContractorWithCoords[] = contractors
    .map((c) => {
      const area = c.serviceAreas?.find((a) => a.lat && a.lng);
      if (!area || !area.lat || !area.lng) return null;
      const withCoords: ContractorWithCoords = {
        id: c.id,
        slug: c.slug,
        businessName: c.businessName,
        lat: area.lat,
        lng: area.lng,
        distance: c.distance,
      };
      return withCoords;
    })
    .filter((c): c is ContractorWithCoords => c !== null);

  if (error) {
    return (
      <div className="flex h-full w-full items-center justify-center rounded-2xl border border-red-200 bg-red-50 p-8">
        <div className="space-y-2 text-center">
          <p className="text-sm font-semibold text-red-700">Map Error</p>
          <p className="text-xs text-red-600">{error}</p>
        </div>
      </div>
    );
  }

  const MapComponent = Map as unknown as React.ComponentType<Record<string, unknown>>;
  const MarkerComponent = Marker as unknown as React.ComponentType<Record<string, unknown>>;
  const PopupComponent = Popup as unknown as React.ComponentType<Record<string, unknown>>;

  return (
    <MapComponent
      initialViewState={{
        latitude: center.lat,
        longitude: center.lng,
        zoom: origin ? 10 : 8,
      }}
      mapboxAccessToken={token}
      mapStyle="mapbox://styles/mapbox/streets-v12"
      style={{ width: "100%", height: "100%" }}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onError={(e: any) => {
        logger.error("Mapbox error:", e);
        setError("Map failed to load");
      }}
    >
      {/* Origin marker */}
      {origin && (
        <MarkerComponent latitude={origin.lat} longitude={origin.lng}>
          <div className="h-5 w-5 rounded-full border-2 border-white bg-green-500 shadow-lg" />
        </MarkerComponent>
      )}

      {/* Contractor markers */}
      {contractorsWithCoords.map((c) => (
        <MarkerComponent
          key={c.id}
          latitude={c.lat}
          longitude={c.lng}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          onClick={(e: any) => {
            e.originalEvent.stopPropagation();
            setSelected(c);
          }}
        >
          <div className="h-4 w-4 cursor-pointer rounded-full border-2 border-white bg-blue-600 shadow-lg transition hover:scale-125" />
        </MarkerComponent>
      ))}

      {/* Popup */}
      {selected && (
        <PopupComponent
          latitude={selected.lat}
          longitude={selected.lng}
          onClose={() => setSelected(null)}
          closeButton={true}
          closeOnClick={false}
          anchor="bottom"
        >
          <div className="space-y-1 p-2">
            <div className="text-sm font-semibold">{selected.businessName}</div>
            {selected.distance && (
              <div className="text-xs text-gray-600">{selected.distance.toFixed(1)} miles away</div>
            )}
            <a
              href={`/c/${selected.slug}`}
              className="mt-1 block text-xs text-blue-600 hover:underline"
            >
              View Profile →
            </a>
          </div>
        </PopupComponent>
      )}
    </MapComponent>
  );
}
