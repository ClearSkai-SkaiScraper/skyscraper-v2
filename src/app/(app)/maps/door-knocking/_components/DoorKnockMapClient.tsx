"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import {
  CalendarClock,
  Check,
  Crosshair,
  DoorOpen,
  Filter,
  Loader2,
  MapPin,
  MessageSquare,
  Navigation,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { logger } from "@/lib/logger";

/* ───── types ───── */
interface CanvassPin {
  id: string;
  lat: number;
  lng: number;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  ownerName?: string | null;
  outcome: string;
  notes?: string | null;
  followUpDate?: string | null;
  areaTag?: string | null;
  knockedAt: string;
}

interface PinStats {
  [outcome: string]: number;
}

const OUTCOME_CONFIG: Record<
  string,
  { label: string; color: string; emoji: string; mapColor: string }
> = {
  no_answer: {
    label: "No Answer",
    color: "bg-gray-200 text-gray-700",
    emoji: "🚪",
    mapColor: "#9ca3af",
  },
  interested: {
    label: "Interested",
    color: "bg-blue-100 text-blue-700",
    emoji: "👍",
    mapColor: "#3b82f6",
  },
  signed: {
    label: "Signed",
    color: "bg-green-100 text-green-700",
    emoji: "✅",
    mapColor: "#22c55e",
  },
  come_back: {
    label: "Come Back",
    color: "bg-amber-100 text-amber-700",
    emoji: "🔄",
    mapColor: "#f59e0b",
  },
  not_interested: {
    label: "Not Interested",
    color: "bg-red-100 text-red-700",
    emoji: "❌",
    mapColor: "#ef4444",
  },
  not_home: {
    label: "Not Home",
    color: "bg-purple-100 text-purple-700",
    emoji: "🏠",
    mapColor: "#a855f7",
  },
};

/* ═══════════════════════════════════════════════════════
 *  DoorKnockMapClient — Full interactive door-knocking tracker
 * ═══════════════════════════════════════════════════════ */
export default function DoorKnockMapClient() {
  /* ───── state ───── */
  const [pins, setPins] = useState<CanvassPin[]>([]);
  const [stats, setStats] = useState<PinStats>({});
  const [areaTags, setAreaTags] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Filters
  const [filterArea, setFilterArea] = useState<string>("");
  const [filterOutcome, setFilterOutcome] = useState<string>("");

  // Address search
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<
    Array<{ place_name: string; center: [number, number] }>
  >([]);
  const [searching, setSearching] = useState(false);

  // GPS tracking
  const [gpsEnabled, setGpsEnabled] = useState(false);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);
  const userMarkerRef = useRef<any>(null);
  const gpsWatchRef = useRef<number | null>(null);

  // New pin form
  const [showForm, setShowForm] = useState(false);
  const [editingPin, setEditingPin] = useState<CanvassPin | null>(null);
  const [formData, setFormData] = useState({
    lat: 0,
    lng: 0,
    address: "",
    city: "",
    state: "",
    zipCode: "",
    ownerName: "",
    outcome: "no_answer",
    notes: "",
    followUpDate: "",
    areaTag: "",
  });

  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapboxRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const boundsSetRef = useRef(false);
  const [mapReady, setMapReady] = useState(false);
  const [clickMode, setClickMode] = useState(false);
  const [geocoding, setGeocoding] = useState(false);

  /* ───── reverse geocode helper ───── */
  const reverseGeocode = useCallback(async (lat: number, lng: number) => {
    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOXGL_ACCESS_TOKEN;
    if (!token) return null;
    try {
      setGeocoding(true);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?types=address&access_token=${token}`
      );
      const json = await res.json();
      const feature = json?.features?.[0];
      if (!feature) return null;

      // Parse the address components from the context array
      const ctx = (feature.context || []) as Array<{
        id: string;
        text: string;
        short_code?: string;
      }>;
      const placeText = feature.place_name || "";
      const addressNumber = feature.address || "";
      const streetName = feature.text || "";
      const street = addressNumber ? `${addressNumber} ${streetName}` : streetName;

      let city = "";
      let state = "";
      let zipCode = "";

      for (const c of ctx) {
        if (c.id.startsWith("place")) city = c.text;
        else if (c.id.startsWith("region")) state = c.short_code?.replace("US-", "") || c.text;
        else if (c.id.startsWith("postcode")) zipCode = c.text;
      }

      return { address: street || placeText.split(",")[0] || "", city, state, zipCode };
    } catch (err) {
      logger.error("[DoorKnockMap] Reverse geocode error:", err);
      return null;
    } finally {
      setGeocoding(false);
    }
  }, []);

  /* ───── address search (forward geocoding) ───── */
  const searchAddress = useCallback(async (query: string) => {
    if (!query || query.length < 3) {
      setSearchResults([]);
      return;
    }
    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOXGL_ACCESS_TOKEN;
    if (!token) return;

    try {
      setSearching(true);
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(query)}.json?country=us&types=address,place,neighborhood&limit=5&access_token=${token}`
      );
      const json = await res.json();
      setSearchResults(json.features || []);
    } catch (err) {
      logger.error("[DoorKnockMap] Search error:", err);
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  }, []);

  const goToAddress = useCallback((center: [number, number], placeName: string) => {
    setSearchResults([]);
    setSearchQuery(placeName.split(",")[0] || "");
    mapRef.current?.flyTo({ center, zoom: 17, duration: 1500 });
  }, []);

  /* ───── GPS tracking ───── */
  const startGpsTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setGpsError("Geolocation not supported by your browser");
      return;
    }

    setGpsEnabled(true);
    setGpsError(null);

    // Get initial position
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
        mapRef.current?.flyTo({ center: [longitude, latitude], zoom: 16, duration: 1000 });
      },
      (err) => {
        setGpsError(err.message);
        setGpsEnabled(false);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // Watch position for live updates
    gpsWatchRef.current = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation({ lat: latitude, lng: longitude });
      },
      (err) => {
        logger.error("[GPS] Watch error:", err);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 2000 }
    );
  }, []);

  const stopGpsTracking = useCallback(() => {
    if (gpsWatchRef.current !== null) {
      navigator.geolocation.clearWatch(gpsWatchRef.current);
      gpsWatchRef.current = null;
    }
    setGpsEnabled(false);
    setUserLocation(null);
    userMarkerRef.current?.remove();
    userMarkerRef.current = null;
  }, []);

  // Update user location marker on map
  useEffect(() => {
    if (!mapRef.current || !mapboxRef.current || !userLocation) return;

    // Remove existing user marker
    userMarkerRef.current?.remove();

    // Create user location marker (blue pulsing dot)
    const el = document.createElement("div");
    el.innerHTML = `
      <div style="
        width: 20px; height: 20px; background: #3b82f6;
        border-radius: 50%; border: 3px solid white;
        box-shadow: 0 0 0 8px rgba(59,130,246,0.3), 0 2px 8px rgba(0,0,0,0.3);
        animation: pulse 2s infinite;
      "></div>
      <style>
        @keyframes pulse {
          0% { box-shadow: 0 0 0 0 rgba(59,130,246,0.5), 0 2px 8px rgba(0,0,0,0.3); }
          70% { box-shadow: 0 0 0 15px rgba(59,130,246,0), 0 2px 8px rgba(0,0,0,0.3); }
          100% { box-shadow: 0 0 0 0 rgba(59,130,246,0), 0 2px 8px rgba(0,0,0,0.3); }
        }
      </style>
    `;
    el.title = "Your Location";

    userMarkerRef.current = new mapboxRef.current.Marker({ element: el, anchor: "center" })
      .setLngLat([userLocation.lng, userLocation.lat])
      .addTo(mapRef.current);
  }, [userLocation]);

  // Cleanup GPS on unmount
  useEffect(() => {
    return () => {
      if (gpsWatchRef.current !== null) {
        navigator.geolocation.clearWatch(gpsWatchRef.current);
      }
    };
  }, []);

  /* ───── data fetching ───── */
  const fetchPins = useCallback(async () => {
    try {
      const params = new URLSearchParams();
      if (filterArea) params.set("area", filterArea);
      if (filterOutcome) params.set("outcome", filterOutcome);
      const res = await fetch(`/api/canvass-pins?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPins(json.data.pins);
        setStats(json.data.stats);
        setAreaTags(json.data.areaTags);
      }
    } catch (e) {
      logger.error("Failed to fetch canvass pins:", e);
    } finally {
      setLoading(false);
    }
  }, [filterArea, filterOutcome]);

  useEffect(() => {
    void fetchPins();
  }, [fetchPins]);

  /* ───── map init ───── */
  useEffect(() => {
    if (!mapContainer.current || mapRef.current) return;

    const token =
      process.env.NEXT_PUBLIC_MAPBOX_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ||
      process.env.NEXT_PUBLIC_MAPBOXGL_ACCESS_TOKEN;

    if (!token) return;

    let cancelled = false;

    void (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled) return;
        mapboxRef.current = mapboxgl;
        mapboxgl.accessToken = token;

        mapRef.current = new mapboxgl.Map({
          container: mapContainer.current!,
          style: "mapbox://styles/mapbox/streets-v12",
          center: [-112.074, 33.4484], // Phoenix, AZ default
          zoom: 12,
          attributionControl: true,
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");

        mapRef.current.on("load", () => {
          if (!cancelled) setMapReady(true);
        });
      } catch (err) {
        logger.error("[DoorKnockMap] Init error:", err);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);

  /* ───── click to place pin ───── */
  useEffect(() => {
    if (!mapRef.current || !mapReady) return;

    const handleClick = async (e: any) => {
      if (!clickMode) return;
      const { lng, lat } = e.lngLat;
      // Immediately open form with lat/lng, then fill address async
      setFormData((prev) => ({ ...prev, lat, lng, address: "", city: "", state: "", zipCode: "" }));
      setEditingPin(null);
      setShowForm(true);
      setClickMode(false);

      // Reverse geocode to auto-fill address
      const geo = await reverseGeocode(lat, lng);
      if (geo) {
        setFormData((prev) => ({
          ...prev,
          address: geo.address || prev.address,
          city: geo.city || prev.city,
          state: geo.state || prev.state,
          zipCode: geo.zipCode || prev.zipCode,
        }));
      }
    };

    mapRef.current.on("click", handleClick);
    return () => {
      mapRef.current?.off("click", handleClick);
    };
  }, [mapReady, clickMode, reverseGeocode]);

  /* ───── render markers ───── */
  useEffect(() => {
    if (!mapRef.current || !mapReady || !mapboxRef.current) return;

    // Clear existing markers (no Mapbox popups — they cause auto-pan)
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (pins.length === 0) return;

    pins.forEach((pin) => {
      if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return;

      const cfg = OUTCOME_CONFIG[pin.outcome] || OUTCOME_CONFIG.no_answer;
      const el = document.createElement("div");
      el.style.cssText = `
        width: 28px; height: 28px; border-radius: 50%;
        background: ${cfg.mapColor}; border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer; display: flex; align-items: center;
        justify-content: center; font-size: 14px;
        z-index: 1;
      `;
      el.textContent = cfg.emoji;
      el.title = `${pin.address || "Unknown"} — ${cfg.label}`;

      // NO transform or transition — they conflict with Mapbox marker positioning
      el.addEventListener("mouseenter", () => {
        el.style.boxShadow = "0 0 0 4px " + cfg.mapColor + "66, 0 4px 12px rgba(0,0,0,0.35)";
        el.style.zIndex = "10";
      });
      el.addEventListener("mouseleave", () => {
        el.style.boxShadow = "0 2px 8px rgba(0,0,0,0.3)";
        el.style.zIndex = "1";
      });

      // Use anchor:'center' so the pin dot IS the marker, no offset
      const marker = new mapboxRef.current.Marker({ element: el, anchor: "center" })
        .setLngLat([pin.lng, pin.lat])
        .addTo(mapRef.current!);

      // Click: open edit form — NO Mapbox Popup (it auto-pans the map
      // making pins appear to "jump to the top-left")
      el.addEventListener("click", () => {
        // Don't stopPropagation — let Mapbox handle events normally
        setEditingPin(pin);
        setFormData({
          lat: pin.lat,
          lng: pin.lng,
          address: pin.address || "",
          city: pin.city || "",
          state: pin.state || "",
          zipCode: pin.zipCode || "",
          ownerName: pin.ownerName || "",
          outcome: pin.outcome,
          notes: pin.notes || "",
          followUpDate: pin.followUpDate?.split("T")[0] || "",
          areaTag: pin.areaTag || "",
        });
        setShowForm(true);
      });

      markersRef.current.push(marker);
    });

    // Only set initial bounds ONCE — prevents map from jumping on pin updates
    if (!boundsSetRef.current && pins.length > 0) {
      const bounds = new mapboxRef.current.LngLatBounds();
      pins.forEach((p) => {
        if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
          bounds.extend([p.lng, p.lat]);
        }
      });
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 16 });
      boundsSetRef.current = true;
    }
  }, [pins, mapReady]);

  /* ───── form handlers ───── */
  const [saveError, setSaveError] = useState<string | null>(null);
  const handleSave = async () => {
    setSaving(true);
    setSaveError(null);
    try {
      const method = editingPin ? "PATCH" : "POST";
      const payload = editingPin ? { id: editingPin.id, ...formData } : formData;
      const res = await fetch("/api/canvass-pins", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...payload,
          followUpDate: formData.followUpDate
            ? new Date(formData.followUpDate).toISOString()
            : undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const errMsg =
          json?.error || json?.details?.fieldErrors
            ? `Validation error: ${JSON.stringify(json.details.fieldErrors)}`
            : `Save failed (${res.status})`;
        setSaveError(errMsg);
        logger.error("Save pin API error:", { status: res.status, body: json });
        return;
      }
      setShowForm(false);
      setEditingPin(null);
      setSaveError(null);
      await fetchPins();
    } catch (e: any) {
      const msg = e?.message || "Network error — check your connection";
      setSaveError(msg);
      logger.error("Save pin error:", e);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (pinId: string) => {
    if (!confirm("Delete this pin?")) return;
    try {
      await fetch(`/api/canvass-pins?id=${pinId}`, { method: "DELETE" });
      setShowForm(false);
      setEditingPin(null);
      await fetchPins();
    } catch (e) {
      logger.error("Delete pin error:", e);
    }
  };

  const totalPins = Object.values(stats).reduce((a, b) => a + b, 0);

  /* ═══════════════════════════════════════════════════════
   *  RENDER
   * ═══════════════════════════════════════════════════════ */
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col gap-4 lg:flex-row">
      {/* ─── Sidebar ─── */}
      <div className="flex w-full flex-col gap-3 overflow-y-auto lg:w-80">
        {/* Address Search */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold">
              <Search className="h-3.5 w-3.5" /> Search Address
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="relative">
              <Input
                placeholder="Enter an address..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  void searchAddress(e.target.value);
                }}
                className="pr-8 text-xs"
              />
              {searching && (
                <Loader2 className="absolute right-2 top-2.5 h-3.5 w-3.5 animate-spin text-muted-foreground" />
              )}
            </div>
            {searchResults.length > 0 && (
              <div className="max-h-40 overflow-y-auto rounded-md border bg-background">
                {searchResults.map((result, i) => (
                  <button
                    key={i}
                    onClick={() => goToAddress(result.center, result.place_name)}
                    className="flex w-full items-center gap-2 px-2 py-1.5 text-left text-xs hover:bg-accent"
                  >
                    <MapPin className="h-3 w-3 shrink-0 text-muted-foreground" />
                    <span className="truncate">{result.place_name}</span>
                  </button>
                ))}
              </div>
            )}
            {/* GPS Tracking Button */}
            <Button
              onClick={gpsEnabled ? stopGpsTracking : startGpsTracking}
              variant={gpsEnabled ? "default" : "outline"}
              size="sm"
              className="w-full"
            >
              {gpsEnabled ? (
                <>
                  <Navigation className="mr-1.5 h-3.5 w-3.5 animate-pulse" />
                  Tracking Your Location
                </>
              ) : (
                <>
                  <Crosshair className="mr-1.5 h-3.5 w-3.5" />
                  Enable GPS Tracking
                </>
              )}
            </Button>
            {gpsError && <p className="text-xs text-red-500">{gpsError}</p>}
            {userLocation && (
              <Button
                onClick={() =>
                  mapRef.current?.flyTo({
                    center: [userLocation.lng, userLocation.lat],
                    zoom: 17,
                    duration: 800,
                  })
                }
                variant="ghost"
                size="sm"
                className="w-full text-xs"
              >
                <Navigation className="mr-1.5 h-3 w-3" />
                Center on Me
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Stats */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-semibold">
              <DoorOpen className="h-4 w-4 text-emerald-500" />
              Door Knock Stats
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 text-3xl font-bold text-emerald-700 dark:text-emerald-300">
              {totalPins}
              <span className="ml-2 text-sm font-normal text-muted-foreground">doors</span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(OUTCOME_CONFIG).map(([key, cfg]) => (
                <div
                  key={key}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${cfg.color}`}
                >
                  <span>{cfg.emoji}</span>
                  <span className="font-medium">{stats[key] || 0}</span>
                  <span className="truncate">{cfg.label}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Cross-link to Map View */}
        <Link
          href="/maps/map-view"
          className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground"
        >
          🗺️ <span>View Map Overview</span>
          <span className="ml-auto text-[10px]">→</span>
        </Link>

        {/* Actions */}
        <div className="flex gap-2">
          <Button
            onClick={() => {
              setClickMode(true);
              setShowForm(false);
              setEditingPin(null);
            }}
            variant={clickMode ? "default" : "outline"}
            className="flex-1"
            size="sm"
          >
            {clickMode ? (
              <>
                <MapPin className="mr-1.5 h-3.5 w-3.5 animate-bounce" /> Click Map…
              </>
            ) : (
              <>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Drop Pin
              </>
            )}
          </Button>
          <Button onClick={() => fetchPins()} variant="outline" size="sm">
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
          </Button>
        </div>

        {/* Filters */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-xs font-semibold">
              <Filter className="h-3.5 w-3.5" /> Filters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <select
              value={filterOutcome}
              onChange={(e) => setFilterOutcome(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
            >
              <option value="">All Outcomes</option>
              {Object.entries(OUTCOME_CONFIG).map(([key, cfg]) => (
                <option key={key} value={key}>
                  {cfg.emoji} {cfg.label}
                </option>
              ))}
            </select>
            <select
              value={filterArea}
              onChange={(e) => setFilterArea(e.target.value)}
              className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
            >
              <option value="">All Areas</option>
              {areaTags.map((tag) => (
                <option key={tag} value={tag}>
                  📍 {tag}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        {/* Recent Pins List */}
        <div className="flex-1 space-y-1.5 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground">Recent ({pins.length})</p>
          {loading && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          )}
          {!loading && pins.length === 0 && (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              No pins yet. Click &quot;Drop Pin&quot; then click on the map.
            </div>
          )}
          {pins.slice(0, 30).map((pin) => {
            const cfg = OUTCOME_CONFIG[pin.outcome] || OUTCOME_CONFIG.no_answer;
            return (
              <button
                key={pin.id}
                onClick={() => {
                  setEditingPin(pin);
                  setFormData({
                    lat: pin.lat,
                    lng: pin.lng,
                    address: pin.address || "",
                    city: pin.city || "",
                    state: pin.state || "",
                    zipCode: pin.zipCode || "",
                    ownerName: pin.ownerName || "",
                    outcome: pin.outcome,
                    notes: pin.notes || "",
                    followUpDate: pin.followUpDate?.split("T")[0] || "",
                    areaTag: pin.areaTag || "",
                  });
                  setShowForm(true);
                  // Pan map to pin
                  mapRef.current?.flyTo({ center: [pin.lng, pin.lat], zoom: 16, duration: 800 });
                }}
                className="flex w-full items-start gap-2 rounded-lg border bg-card p-2 text-left transition-colors hover:bg-accent"
              >
                <span
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{ background: cfg.mapColor + "20" }}
                >
                  {cfg.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{pin.address || "Dropped Pin"}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {pin.ownerName && `${pin.ownerName} · `}
                    {cfg.label}
                    {pin.areaTag && ` · ${pin.areaTag}`}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Map ─── */}
      <div className="relative flex-1 overflow-hidden rounded-xl border shadow-sm">
        <div ref={mapContainer} className="h-full w-full" />

        {/* Click mode overlay */}
        {clickMode && (
          <div className="absolute left-1/2 top-4 z-10 -translate-x-1/2 animate-pulse rounded-full bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-lg">
            <MapPin className="mr-1.5 inline h-4 w-4" />
            Click anywhere on the map to drop a pin
          </div>
        )}

        {/* Pin form overlay */}
        {showForm && (
          <div className="absolute right-4 top-4 z-20 w-80 rounded-xl border bg-white/95 p-4 shadow-xl backdrop-blur dark:bg-slate-900/95">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="flex items-center gap-2 text-sm font-bold">
                {editingPin ? (
                  <>
                    <Pencil className="h-4 w-4" /> Edit Pin
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> New Pin
                  </>
                )}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditingPin(null);
                }}
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            </div>

            <div className="space-y-2.5">
              {/* Address */}
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                  Address{" "}
                  {geocoding && (
                    <span className="ml-1 animate-pulse text-blue-500">⏳ Locating…</span>
                  )}
                </label>
                <input
                  type="text"
                  value={formData.address}
                  onChange={(e) => setFormData((p) => ({ ...p, address: e.target.value }))}
                  placeholder={geocoding ? "Getting address…" : "123 Main St"}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                    City
                  </label>
                  <input
                    type="text"
                    value={formData.city}
                    onChange={(e) => setFormData((p) => ({ ...p, city: e.target.value }))}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                    State
                  </label>
                  <input
                    type="text"
                    value={formData.state}
                    onChange={(e) => setFormData((p) => ({ ...p, state: e.target.value }))}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                  />
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                    Zip
                  </label>
                  <input
                    type="text"
                    value={formData.zipCode}
                    onChange={(e) => setFormData((p) => ({ ...p, zipCode: e.target.value }))}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Owner */}
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                  <User className="mr-0.5 inline h-3 w-3" /> Homeowner Name
                </label>
                <input
                  type="text"
                  value={formData.ownerName}
                  onChange={(e) => setFormData((p) => ({ ...p, ownerName: e.target.value }))}
                  placeholder="Jane Smith"
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                />
              </div>

              {/* Outcome */}
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                  <Check className="mr-0.5 inline h-3 w-3" /> Outcome
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {Object.entries(OUTCOME_CONFIG).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setFormData((p) => ({ ...p, outcome: key }))}
                      className={`rounded-md px-1.5 py-1 text-[10px] font-medium transition-all ${
                        formData.outcome === key
                          ? cfg.color + " ring-2 ring-current ring-offset-1"
                          : "bg-muted text-muted-foreground hover:bg-accent"
                      }`}
                    >
                      {cfg.emoji} {cfg.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                  <MessageSquare className="mr-0.5 inline h-3 w-3" /> Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) => setFormData((p) => ({ ...p, notes: e.target.value }))}
                  placeholder="Homeowner interested, has hail damage visible on north side..."
                  rows={2}
                  className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                />
              </div>

              {/* Area Tag + Follow Up */}
              <div className="grid grid-cols-2 gap-1.5">
                <div>
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                    📍 Area Tag
                  </label>
                  <input
                    type="text"
                    value={formData.areaTag}
                    onChange={(e) => setFormData((p) => ({ ...p, areaTag: e.target.value }))}
                    placeholder="Zone A"
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                    list="area-tags"
                  />
                  <datalist id="area-tags">
                    {areaTags.map((tag) => (
                      <option key={tag} value={tag} />
                    ))}
                  </datalist>
                </div>
                <div>
                  <label className="mb-0.5 block text-[10px] font-semibold uppercase text-muted-foreground">
                    <CalendarClock className="mr-0.5 inline h-3 w-3" /> Follow Up
                  </label>
                  <input
                    type="date"
                    value={formData.followUpDate}
                    onChange={(e) => setFormData((p) => ({ ...p, followUpDate: e.target.value }))}
                    className="w-full rounded-md border bg-background px-2 py-1.5 text-xs"
                  />
                </div>
              </div>

              {/* Lat/Lng display */}
              <div className="rounded-md bg-muted/50 px-2 py-1 text-[10px] text-muted-foreground">
                📌 {formData.lat.toFixed(5)}, {formData.lng.toFixed(5)}
              </div>

              {/* Error display */}
              {saveError && (
                <div className="rounded-md bg-red-50 px-2 py-1.5 text-[11px] text-red-700 dark:bg-red-950/50 dark:text-red-400">
                  ⚠️ {saveError}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-2">
                <Button onClick={handleSave} disabled={saving} className="flex-1" size="sm">
                  {saving ? (
                    <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Check className="mr-1.5 h-3.5 w-3.5" />
                  )}
                  {editingPin ? "Update" : "Save"}
                </Button>
                {editingPin && (
                  <Button
                    onClick={() => handleDelete(editingPin.id)}
                    variant="destructive"
                    size="sm"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-1.5 rounded-lg bg-white/90 px-3 py-2 shadow dark:bg-slate-900/90">
          {Object.entries(OUTCOME_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1 text-[10px]">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.mapColor }} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
