"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import {
  CalendarClock,
  Check,
  DoorOpen,
  Filter,
  Loader2,
  MapPin,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  User,
  X,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    fetchPins();
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

    (async () => {
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

    // Clear existing
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
        transition: transform 0.15s;
      `;
      el.textContent = cfg.emoji;
      el.title = `${pin.address || "Unknown"} — ${cfg.label}`;

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.3)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });

      const marker = new mapboxRef.current.Marker(el)
        .setLngLat([pin.lng, pin.lat])
        .addTo(mapRef.current!);

      // Popup
      const popupHtml = `
        <div style="padding: 8px; min-width: 180px; font-family: system-ui;">
          <div style="font-weight: 600; font-size: 13px; margin-bottom: 4px;">
            ${cfg.emoji} ${pin.address || "Dropped Pin"}
          </div>
          ${pin.ownerName ? `<div style="font-size: 12px; color: #666;">👤 ${pin.ownerName}</div>` : ""}
          <div style="font-size: 12px; color: #666; margin-top: 2px;">
            Status: <strong>${cfg.label}</strong>
          </div>
          ${pin.notes ? `<div style="font-size: 11px; color: #888; margin-top: 4px; border-top: 1px solid #eee; padding-top: 4px;">${pin.notes}</div>` : ""}
          ${pin.areaTag ? `<div style="font-size: 11px; color: #666; margin-top: 2px;">📍 ${pin.areaTag}</div>` : ""}
        </div>
      `;
      const popup = new mapboxRef.current.Popup({ offset: 18, maxWidth: "250px" }).setHTML(
        popupHtml
      );
      marker.setPopup(popup);

      // Click to edit
      el.addEventListener("click", (e) => {
        e.stopPropagation();
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

    // Fit bounds
    if (pins.length > 0) {
      const bounds = new mapboxRef.current.LngLatBounds();
      pins.forEach((p) => {
        if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
          bounds.extend([p.lng, p.lat]);
        }
      });
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 16 });
    }
  }, [pins, mapReady]);

  /* ───── form handlers ───── */
  const handleSave = async () => {
    setSaving(true);
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
      if (json.success) {
        setShowForm(false);
        setEditingPin(null);
        await fetchPins();
      }
    } catch (e) {
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
              No pins yet. Click "Drop Pin" then click on the map.
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
