"use client";

import "mapbox-gl/dist/mapbox-gl.css";

import {
  ChevronRight,
  DoorOpen,
  ExternalLink,
  Layers,
  MapPin,
  Pencil,
  Search,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

/* ───── types ───── */
export interface JobMarker {
  id: string;
  lat: number;
  lng: number;
  label: string;
  type: "claim" | "lead" | "retail" | "vendor";
  color: string;
  status?: string;
  address?: string;
  contactName?: string;
  jobCategory?: string;
  value?: number | null;
  claimNumber?: string;
  insurer?: string;
}

const TYPE_CONFIG: Record<
  string,
  { label: string; emoji: string; color: string; filterColor: string }
> = {
  claim: {
    label: "Claims",
    emoji: "🏠",
    color: "#3b82f6",
    filterColor: "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
  },
  lead: {
    label: "Leads",
    emoji: "🎯",
    color: "#a855f7",
    filterColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
  },
  retail: {
    label: "Retail Jobs",
    emoji: "🔧",
    color: "#f97316",
    filterColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300",
  },
  vendor: {
    label: "Vendors",
    emoji: "🏪",
    color: "#6b7280",
    filterColor: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
};

const STATUS_COLORS: Record<string, string> = {
  approved: "#22c55e",
  in_progress: "#3b82f6",
  pending: "#f59e0b",
  rejected: "#991b1b",
  active: "#3b82f6",
  closed: "#6b7280",
};

interface MapViewClientProps {
  markers: JobMarker[];
  initialCenter: { lat: number; lng: number };
}

/* ═══════════════════════════════════════════════════════
 *  MapViewClient — Rich interactive map for jobs/claims/vendors
 * ═══════════════════════════════════════════════════════ */
export default function MapViewClient({ markers, initialCenter }: MapViewClientProps) {
  /* ───── state ───── */
  const [filterTypes, setFilterTypes] = useState<Set<string>>(
    new Set(["claim", "lead", "retail", "vendor"])
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMarker, setSelectedMarker] = useState<JobMarker | null>(null);

  // Map refs
  const mapContainer = useRef<HTMLDivElement>(null);
  const mapRef = useRef<any>(null);
  const mapboxRef = useRef<any>(null);
  const markersRef = useRef<any[]>([]);
  const activePopupRef = useRef<any>(null);
  const [mapReady, setMapReady] = useState(false);

  /* ───── filtered markers ───── */
  const filteredMarkers = useMemo(() => {
    return markers.filter((m) => {
      if (!filterTypes.has(m.type)) return false;
      if (searchQuery) {
        const q = searchQuery.toLowerCase();
        return (
          m.label?.toLowerCase().includes(q) ||
          m.address?.toLowerCase().includes(q) ||
          m.contactName?.toLowerCase().includes(q) ||
          m.claimNumber?.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [markers, filterTypes, searchQuery]);

  /* ───── stats ───── */
  const typeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    markers.forEach((m) => {
      counts[m.type] = (counts[m.type] || 0) + 1;
    });
    return counts;
  }, [markers]);

  /* ───── toggle filter ───── */
  const toggleFilter = (type: string) => {
    setFilterTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) {
        next.delete(type);
      } else {
        next.add(type);
      }
      return next;
    });
  };

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
          center: [initialCenter.lng, initialCenter.lat],
          zoom: 11,
          attributionControl: true,
        });

        mapRef.current.addControl(new mapboxgl.NavigationControl(), "top-right");
        mapRef.current.addControl(new mapboxgl.FullscreenControl(), "bottom-right");

        mapRef.current.on("load", () => {
          if (!cancelled) setMapReady(true);
        });
      } catch (err) {
        logger.error("[MapViewClient] Init error:", err);
      }
    })();

    return () => {
      cancelled = true;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [initialCenter.lat, initialCenter.lng]);

  /* ───── render markers ───── */
  useEffect(() => {
    if (!mapRef.current || !mapReady || !mapboxRef.current) return;

    // Clear existing markers — NO Mapbox popups (they cause auto-pan / pin-sliding)
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (filteredMarkers.length === 0) return;

    filteredMarkers.forEach((pin) => {
      if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return;

      const cfg = TYPE_CONFIG[pin.type] || TYPE_CONFIG.lead;
      const pinColor = STATUS_COLORS[pin.status || ""] || pin.color || cfg.color;

      const el = document.createElement("div");
      el.style.cssText = `
        width: 32px; height: 32px; border-radius: 50%;
        background: ${pinColor}; border: 3px solid white;
        box-shadow: 0 2px 10px rgba(0,0,0,0.35);
        cursor: pointer; display: flex; align-items: center;
        justify-content: center; font-size: 15px;
        transition: transform 0.15s, box-shadow 0.15s;
        z-index: 1;
      `;
      el.textContent = cfg.emoji;
      el.title = pin.label || "Location";

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.3)";
        el.style.boxShadow = "0 4px 14px rgba(0,0,0,0.45)";
        el.style.zIndex = "10";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
        el.style.boxShadow = "0 2px 10px rgba(0,0,0,0.35)";
        el.style.zIndex = "1";
      });

      // Use anchor:'center' so the marker element IS the dot, no offset weirdness
      const marker = new mapboxRef.current.Marker({ element: el, anchor: "center" })
        .setLngLat([pin.lng, pin.lat])
        .addTo(mapRef.current!);

      // Click: select this marker — NO Mapbox Popup (it auto-pans the map)
      // Instead we use React state + the sidebar detail card
      el.addEventListener("click", () => {
        // Don't call stopPropagation — let Mapbox handle the event normally
        setSelectedMarker(pin);
      });

      markersRef.current.push(marker);
    });

    // Fit bounds
    if (filteredMarkers.length > 0) {
      const bounds = new mapboxRef.current.LngLatBounds();
      filteredMarkers.forEach((p) => {
        if (Number.isFinite(p.lat) && Number.isFinite(p.lng)) {
          bounds.extend([p.lng, p.lat]);
        }
      });
      mapRef.current.fitBounds(bounds, { padding: 60, maxZoom: 15 });
    }
  }, [filteredMarkers, mapReady]);

  /* ───── fly to marker ───── */
  const flyTo = (m: JobMarker) => {
    setSelectedMarker(m);
    mapRef.current?.flyTo({ center: [m.lng, m.lat], zoom: 16, duration: 800 });
  };

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
              <Layers className="h-4 w-4 text-blue-500" />
              Locations Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-3 text-3xl font-bold text-blue-700 dark:text-blue-300">
              {filteredMarkers.length}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                of {markers.length} shown
              </span>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
                <button
                  key={key}
                  onClick={() => toggleFilter(key)}
                  className={`flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-xs transition-all ${
                    filterTypes.has(key)
                      ? cfg.filterColor + " ring-current/20 ring-1"
                      : "bg-muted/50 text-muted-foreground opacity-50"
                  }`}
                >
                  <span>{cfg.emoji}</span>
                  <span className="font-semibold">{typeCounts[key] || 0}</span>
                  <span className="truncate">{cfg.label}</span>
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search locations…"
            className="w-full rounded-lg border bg-background py-2 pl-8 pr-8 text-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-2.5 top-1/2 -translate-y-1/2"
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>

        {/* Cross-link to Door Knocking */}
        <Link
          href="/maps/door-knocking"
          className="flex items-center gap-2 rounded-lg border bg-emerald-50 px-3 py-2 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-300 dark:hover:bg-emerald-900/40"
        >
          <DoorOpen className="h-4 w-4" />
          Door Knocking Tracker
          <ChevronRight className="ml-auto h-3.5 w-3.5" />
        </Link>

        {/* Location List */}
        <div className="flex-1 space-y-1.5 overflow-y-auto">
          <p className="text-xs font-semibold text-muted-foreground">
            Locations ({filteredMarkers.length})
          </p>
          {filteredMarkers.length === 0 && (
            <div className="rounded-lg border border-dashed p-4 text-center text-xs text-muted-foreground">
              {markers.length === 0
                ? "No locations found. Add claims, leads, or vendors to see them on the map."
                : "No locations match your filters."}
            </div>
          )}
          {filteredMarkers.slice(0, 50).map((m) => {
            const cfg = TYPE_CONFIG[m.type] || TYPE_CONFIG.lead;
            const mColor = STATUS_COLORS[m.status || ""] || m.color || cfg.color;
            const isSelected = selectedMarker?.id === m.id;
            return (
              <button
                key={`${m.type}-${m.id}`}
                onClick={() => flyTo(m)}
                className={`group flex w-full items-start gap-2.5 rounded-xl border p-2.5 text-left transition-all hover:shadow-md ${
                  isSelected
                    ? "border-blue-400 bg-blue-50/80 shadow-md ring-1 ring-blue-400/30 dark:bg-blue-900/30"
                    : "bg-card hover:bg-accent/50"
                }`}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-sm shadow-sm"
                  style={{ background: mColor + "20", border: `1.5px solid ${mColor}40` }}
                >
                  {cfg.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-semibold">{m.label}</p>
                  <div className="mt-0.5 flex items-center gap-1.5">
                    {m.status && (
                      <span
                        className="inline-block rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                        style={{ background: mColor + "15", color: mColor }}
                      >
                        {m.status.replace(/_/g, " ")}
                      </span>
                    )}
                    <span className="text-[10px] text-muted-foreground">{cfg.label}</span>
                  </div>
                  {m.contactName && (
                    <p className="mt-0.5 truncate text-[10px] text-muted-foreground">
                      👤 {m.contactName}
                    </p>
                  )}
                  {m.address && (
                    <p className="truncate text-[10px] text-muted-foreground">📍 {m.address}</p>
                  )}
                  {m.value != null && (
                    <p className="mt-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                      ${Number(m.value).toLocaleString()}
                    </p>
                  )}
                </div>
                <ChevronRight className="mt-2 h-4 w-4 shrink-0 text-muted-foreground/50 transition-transform group-hover:translate-x-0.5 group-hover:text-muted-foreground" />
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Map ─── */}
      <div className="relative flex-1 overflow-hidden rounded-xl border shadow-sm">
        <div ref={mapContainer} className="h-full w-full" />

        {/* Legend */}
        <div className="absolute bottom-4 left-4 z-10 flex flex-wrap gap-2 rounded-lg bg-white/90 px-3 py-2 shadow dark:bg-slate-900/90">
          {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
            <div key={key} className="flex items-center gap-1 text-[10px]">
              <div className="h-2.5 w-2.5 rounded-full" style={{ background: cfg.color }} />
              <span className="text-muted-foreground">{cfg.label}</span>
            </div>
          ))}
          <div className="mx-1 h-3 w-px bg-border" />
          <div className="flex items-center gap-1 text-[10px]">
            <div className="h-2.5 w-2.5 rounded-full bg-[#22c55e]" />
            <span className="text-muted-foreground">Approved</span>
          </div>
          <div className="flex items-center gap-1 text-[10px]">
            <div className="h-2.5 w-2.5 rounded-full bg-[#f59e0b]" />
            <span className="text-muted-foreground">Pending</span>
          </div>
        </div>

        {/* No markers overlay */}
        {mapReady && filteredMarkers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/30 backdrop-blur-[1px]">
            <div className="rounded-xl border bg-card p-6 text-center shadow-lg">
              <MapPin className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
              <p className="text-sm font-medium">No locations to display</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Adjust your filters or add more data
              </p>
            </div>
          </div>
        )}

        {/* ─── Selected Marker Detail Card ─── */}
        {selectedMarker &&
          (() => {
            const cfg = TYPE_CONFIG[selectedMarker.type] || TYPE_CONFIG.lead;
            const pinColor = STATUS_COLORS[selectedMarker.status || ""] || cfg.color;
            const isJob = selectedMarker.type !== "vendor";
            const editHref =
              selectedMarker.type === "claim"
                ? `/claims/${selectedMarker.id}`
                : selectedMarker.type === "lead"
                  ? `/leads/${selectedMarker.id}`
                  : selectedMarker.type === "retail"
                    ? `/retail/${selectedMarker.id}`
                    : null;
            return (
              <div className="absolute right-4 top-4 z-20 w-80 duration-200 animate-in slide-in-from-right-4">
                <Card className="overflow-hidden border-0 shadow-2xl ring-1 ring-black/10 dark:ring-white/10">
                  {/* Gradient header band */}
                  <div
                    className="px-4 py-3"
                    style={{
                      background: `linear-gradient(135deg, ${pinColor}, ${pinColor}cc)`,
                    }}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/20 text-lg backdrop-blur-sm">
                          {cfg.emoji}
                        </span>
                        <div>
                          <h3 className="text-sm font-bold leading-tight text-white drop-shadow-sm">
                            {selectedMarker.label}
                          </h3>
                          <p className="text-[10px] font-medium uppercase tracking-wider text-white/80">
                            {cfg.label}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedMarker(null)}
                        className="rounded-full p-1 text-white/80 transition-colors hover:bg-white/20 hover:text-white"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <CardContent className="space-y-3 p-4">
                    {/* Status badge row */}
                    {selectedMarker.status && (
                      <div className="flex items-center gap-2">
                        <div
                          className="h-2.5 w-2.5 rounded-full ring-2 ring-offset-1"
                          style={{
                            background: STATUS_COLORS[selectedMarker.status] || cfg.color,
                            ringColor: STATUS_COLORS[selectedMarker.status] || cfg.color,
                          }}
                        />
                        <Badge
                          variant="secondary"
                          className="text-[11px] font-semibold"
                          style={{
                            background: (STATUS_COLORS[selectedMarker.status] || cfg.color) + "15",
                            color: STATUS_COLORS[selectedMarker.status] || cfg.color,
                          }}
                        >
                          {selectedMarker.status.replace(/_/g, " ")}
                        </Badge>
                        {selectedMarker.value != null && (
                          <span className="ml-auto text-sm font-bold text-emerald-600 dark:text-emerald-400">
                            ${Number(selectedMarker.value).toLocaleString()}
                          </span>
                        )}
                      </div>
                    )}

                    {/* Info rows */}
                    <div className="space-y-2 rounded-lg bg-muted/50 p-3 text-xs">
                      {selectedMarker.contactName && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            👤 Contact
                          </span>
                          <span className="font-semibold">{selectedMarker.contactName}</span>
                        </div>
                      )}
                      {selectedMarker.claimNumber && (
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1.5 text-muted-foreground">
                            📋 Claim
                          </span>
                          <span className="font-mono font-semibold">
                            {selectedMarker.claimNumber}
                          </span>
                        </div>
                      )}
                      {selectedMarker.address && (
                        <div className="flex items-center justify-between gap-3">
                          <span className="shrink-0 text-muted-foreground">📍 Address</span>
                          <span className="truncate text-right font-medium">
                            {selectedMarker.address}
                          </span>
                        </div>
                      )}
                      {selectedMarker.insurer && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">🏛️ Carrier</span>
                          <span className="font-medium">{selectedMarker.insurer}</span>
                        </div>
                      )}
                      {selectedMarker.jobCategory && (
                        <div className="flex items-center justify-between">
                          <span className="text-muted-foreground">🏷️ Category</span>
                          <Badge variant="outline" className="text-[10px] font-medium">
                            {selectedMarker.jobCategory}
                          </Badge>
                        </div>
                      )}
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2 pt-1">
                      {isJob && editHref ? (
                        <>
                          <Button
                            asChild
                            size="sm"
                            className="flex-1 gap-1.5 text-xs shadow-sm"
                            style={{
                              background: pinColor,
                              color: "white",
                            }}
                          >
                            <Link href={editHref}>
                              <Pencil className="h-3.5 w-3.5" />
                              Edit Job
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5 text-xs shadow-sm"
                          >
                            <Link href={editHref} target="_blank">
                              <ExternalLink className="h-3.5 w-3.5" />
                              Open
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <p className="w-full rounded-md bg-muted/50 py-2 text-center text-[11px] font-medium text-muted-foreground">
                          📌 Vendor location — view only
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
