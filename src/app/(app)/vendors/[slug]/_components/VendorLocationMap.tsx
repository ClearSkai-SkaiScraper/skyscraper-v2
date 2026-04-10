"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import { Clock, MapPin, Navigation2, Phone } from "lucide-react";
import { useEffect, useState } from "react";
// Using require to bypass type checking for react-map-gl/mapbox exports
// eslint-disable-next-line
const ReactMapGL = require("react-map-gl/mapbox") as any;
const Map = ReactMapGL.default;
const Marker = ReactMapGL.Marker;
const NavigationControl = ReactMapGL.NavigationControl;
const FullscreenControl = ReactMapGL.FullscreenControl;
const Popup = ReactMapGL.Popup;

export interface VendorLocation {
  id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  phone?: string | null;
  city?: string;
  state?: string;
  zip?: string;
  website?: string;
  hours?: {
    monday?: string;
    tuesday?: string;
    wednesday?: string;
    thursday?: string;
    friday?: string;
    saturday?: string;
    sunday?: string;
  };
  isPrimaryLocation?: boolean;
  isDistributor?: boolean;
}

interface VendorLocationMapProps {
  locations: VendorLocation[];
  vendorName?: string;
  vendorLogo?: string;
  className?: string;
  height?: string;
  showList?: boolean;
  initialZoom?: number;
}

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

/**
 * VendorLocationMap - Display vendor locations on an interactive map
 *
 * Features:
 * - Multiple location markers
 * - Popup with location details
 * - Hours display
 * - Directions link
 * - Location list sidebar (optional)
 */
export function VendorLocationMap({
  locations,
  vendorName,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  vendorLogo,
  className = "",
  height = "400px",
  showList = true,
  initialZoom = 5,
}: VendorLocationMapProps) {
  const [selectedLocation, setSelectedLocation] = useState<VendorLocation | null>(null);
  const [viewState, setViewState] = useState({
    latitude: 34.0489, // Arizona center
    longitude: -111.0937,
    zoom: initialZoom,
  });

  // Calculate bounds to fit all locations
  useEffect(() => {
    if (locations.length === 0) return;

    if (locations.length === 1) {
      setViewState({
        latitude: locations[0].lat,
        longitude: locations[0].lng,
        zoom: 12,
      });
      return;
    }

    // Calculate center of all locations
    const lats = locations.map((l) => l.lat);
    const lngs = locations.map((l) => l.lng);
    const centerLat = (Math.min(...lats) + Math.max(...lats)) / 2;
    const centerLng = (Math.min(...lngs) + Math.max(...lngs)) / 2;

    // Calculate zoom based on spread
    const latSpread = Math.max(...lats) - Math.min(...lats);
    const lngSpread = Math.max(...lngs) - Math.min(...lngs);
    const maxSpread = Math.max(latSpread, lngSpread);
    const zoom = maxSpread > 5 ? 5 : maxSpread > 2 ? 6 : maxSpread > 1 ? 7 : 9;

    setViewState({
      latitude: centerLat,
      longitude: centerLng,
      zoom,
    });
  }, [locations]);

  const getDirectionsUrl = (location: VendorLocation) => {
    const address = encodeURIComponent(
      `${location.address}, ${location.city}, ${location.state} ${location.zip}`
    );
    return `https://www.google.com/maps/dir/?api=1&destination=${address}`;
  };

  const getTodayHours = (hours?: VendorLocation["hours"]) => {
    if (!hours) return null;
    const days = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const today = days[new Date().getDay()] as keyof typeof hours;
    return hours[today];
  };

  if (!MAPBOX_TOKEN) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 ${className}`}
        {...{ style: { height } }}
      >
        <p className="text-gray-500">Map unavailable - Mapbox token not configured</p>
      </div>
    );
  }

  if (locations.length === 0) {
    return (
      <div
        className={`flex items-center justify-center rounded-xl bg-gray-100 dark:bg-gray-800 ${className}`}
        {...{ style: { height } }}
      >
        <div className="text-center">
          <MapPin className="mx-auto mb-2 h-8 w-8 text-gray-400" />
          <p className="text-gray-500">No locations available</p>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700 ${className}`}
    >
      <div className={`flex ${showList ? "flex-col lg:flex-row" : ""}`}>
        {/* Map */}
        <div className={`relative ${showList ? "lg:flex-1" : "w-full"}`} {...{ style: { height } }}>
          <Map
            {...viewState}
            onMove={(evt) => setViewState(evt.viewState)}
            mapStyle="mapbox://styles/mapbox/streets-v12"
            mapboxAccessToken={MAPBOX_TOKEN}
            style={{ width: "100%", height: "100%" }}
          >
            <NavigationControl position="top-right" />
            <FullscreenControl position="top-right" />

            {/* Location Markers */}
            {locations.map((location) => (
              <Marker
                key={location.id}
                latitude={location.lat}
                longitude={location.lng}
                anchor="bottom"
                onClick={(e) => {
                  e.originalEvent.stopPropagation();
                  setSelectedLocation(location);
                }}
              >
                <div
                  className={`transform cursor-pointer transition-transform hover:scale-110 ${
                    location.isPrimaryLocation ? "text-blue-600" : "text-red-500"
                  }`}
                >
                  <MapPin className="h-8 w-8 drop-shadow-lg" fill="currentColor" />
                </div>
              </Marker>
            ))}

            {/* Selected Location Popup */}
            {selectedLocation && (
              <Popup
                latitude={selectedLocation.lat}
                longitude={selectedLocation.lng}
                anchor="bottom"
                offset={[0, -35]}
                closeOnClick={false}
                onClose={() => setSelectedLocation(null)}
                className="location-popup"
              >
                <div className="min-w-[250px] p-2">
                  <h4 className="font-semibold text-gray-900">{selectedLocation.name}</h4>
                  {selectedLocation.isPrimaryLocation && (
                    <span className="mt-1 inline-block rounded bg-blue-100 px-2 py-0.5 text-xs text-blue-800">
                      Primary Location
                    </span>
                  )}
                  {selectedLocation.isDistributor && (
                    <span className="ml-1 mt-1 inline-block rounded bg-green-100 px-2 py-0.5 text-xs text-green-800">
                      Distributor
                    </span>
                  )}

                  <p className="mt-2 text-sm text-gray-600">
                    {selectedLocation.address}
                    <br />
                    {selectedLocation.city}, {selectedLocation.state} {selectedLocation.zip}
                  </p>

                  {getTodayHours(selectedLocation.hours) && (
                    <p className="mt-2 flex items-center gap-1 text-sm text-gray-600">
                      <Clock className="h-3 w-3" />
                      Today: {getTodayHours(selectedLocation.hours)}
                    </p>
                  )}

                  {selectedLocation.phone && (
                    <a
                      href={`tel:${selectedLocation.phone}`}
                      className="mt-2 flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Phone className="h-3 w-3" />
                      {selectedLocation.phone}
                    </a>
                  )}

                  <a
                    href={getDirectionsUrl(selectedLocation)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 inline-flex items-center gap-1 rounded-lg bg-blue-600 px-3 py-1.5 text-sm text-white hover:bg-blue-700"
                  >
                    <Navigation2 className="h-4 w-4" />
                    Get Directions
                  </a>
                </div>
              </Popup>
            )}
          </Map>
        </div>

        {/* Location List */}
        {showList && (
          <div className="max-h-[400px] overflow-y-auto border-t border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800 lg:w-80 lg:border-l lg:border-t-0">
            <div className="sticky top-0 border-b border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800">
              <h3 className="font-semibold text-gray-900 dark:text-white">
                {vendorName} Locations
              </h3>
              <p className="text-sm text-gray-500">{locations.length} locations</p>
            </div>

            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {locations.map((location) => (
                <button
                  key={location.id}
                  onClick={() => {
                    setSelectedLocation(location);
                    setViewState({
                      ...viewState,
                      latitude: location.lat,
                      longitude: location.lng,
                      zoom: 14,
                    });
                  }}
                  className={`w-full p-3 text-left transition-colors hover:bg-gray-50 dark:hover:bg-gray-700/50 ${
                    selectedLocation?.id === location.id ? "bg-blue-50 dark:bg-blue-900/20" : ""
                  }`}
                >
                  <div className="flex items-start gap-2">
                    <MapPin
                      className={`mt-1 h-4 w-4 flex-shrink-0 ${
                        location.isPrimaryLocation ? "text-blue-600" : "text-gray-400"
                      }`}
                    />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {location.name}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {location.city}, {location.state}
                      </p>
                      {getTodayHours(location.hours) && (
                        <p className="mt-1 flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
                          <Clock className="h-3 w-3" />
                          {getTodayHours(location.hours)}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default VendorLocationMap;
