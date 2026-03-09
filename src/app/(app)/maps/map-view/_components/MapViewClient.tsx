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

    // Clear existing markers and popups
    if (activePopupRef.current) {
      activePopupRef.current.remove();
      activePopupRef.current = null;
    }
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    if (filteredMarkers.length === 0) return;

    filteredMarkers.forEach((pin) => {
      if (!Number.isFinite(pin.lat) || !Number.isFinite(pin.lng)) return;

      const cfg = TYPE_CONFIG[pin.type] || TYPE_CONFIG.lead;
      const pinColor = STATUS_COLORS[pin.status || ""] || pin.color || cfg.color;

      const el = document.createElement("div");
      el.style.cssText = `
        width: 30px; height: 30px; border-radius: 50%;
        background: ${pinColor}; border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        cursor: pointer; display: flex; align-items: center;
        justify-content: center; font-size: 14px;
        transition: transform 0.15s;
      `;
      el.textContent = cfg.emoji;
      el.title = pin.label || "Location";

      el.addEventListener("mouseenter", () => {
        el.style.transform = "scale(1.3)";
      });
      el.addEventListener("mouseleave", () => {
        el.style.transform = "scale(1)";
      });

      const marker = new mapboxRef.current.Marker(el)
        .setLngLat([pin.lng, pin.lat])
        .addTo(mapRef.current!);

      // Rich popup
      const statusBadge = pin.status
        ? `<span style="display:inline-block;padding:1px 6px;border-radius:9999px;font-size:10px;font-weight:600;background:${STATUS_COLORS[pin.status] || "#6b7280"}20;color:${STATUS_COLORS[pin.status] || "#6b7280"}">${pin.status.replace(/_/g, " ")}</span>`
        : "";

      const valueLine =
        pin.value != null
          ? `<div style="font-size:12px;font-weight:700;color:#059669;margin-top:4px;">$${Number(pin.value).toLocaleString()}</div>`
          : "";

      const claimLine = pin.claimNumber
        ? `<div style="font-size:11px;color:#666;margin-top:2px;">📋 ${pin.claimNumber}${pin.insurer ? ` · ${pin.insurer}` : ""}</div>`
        : "";

      const contactLine = pin.contactName
        ? `<div style="font-size:11px;color:#666;">👤 ${pin.contactName}</div>`
        : "";

      const addressLine = pin.address
        ? `<div style="font-size:11px;color:#888;margin-top:2px;">📍 ${pin.address}</div>`
        : "";

      const linkHref =
        pin.type === "claim"
          ? `/claims/${pin.id}`
          : pin.type === "retail"
            ? `/jobs/retail/${pin.id}`
            : pin.type === "lead"
              ? `/leads/${pin.id}`
              : null;

      const linkLine = linkHref
        ? `<a href="${linkHref}" style="display:inline-block;margin-top:6px;padding:2px 8px;border-radius:6px;background:#3b82f6;color:white;font-size:10px;font-weight:600;text-decoration:none;">View Details →</a>`
        : "";

      const popupHtml = `
        <div style="padding:10px;min-width:200px;max-width:280px;font-family:system-ui;">
          <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
            <span style="font-size:16px;">${cfg.emoji}</span>
            <div>
              <div style="font-weight:700;font-size:13px;line-height:1.2;">${pin.label}</div>
              <div style="font-size:10px;color:#999;text-transform:uppercase;letter-spacing:0.5px;">${cfg.label}</div>
            </div>
          </div>
          ${statusBadge}
          ${contactLine}
          ${claimLine}
          ${valueLine}
          ${addressLine}
          ${linkLine}
        </div>
      `;

      // Manual popup — do NOT use marker.setPopup() (conflicting click handler)
      // anchor:'bottom' + no closeButton prevents Mapbox auto-pan that slides markers
      const popup = new mapboxRef.current.Popup({
        offset: [0, -15],
        maxWidth: "300px",
        closeOnClick: true,
        closeButton: true,
        focusAfterOpen: false,
        anchor: "bottom",
      }).setHTML(popupHtml);

      el.addEventListener("click", (e) => {
        e.stopPropagation();
        // Close any previously open popup
        if (activePopupRef.current) {
          activePopupRef.current.remove();
        }
        // Open this popup at marker position
        popup.setLngLat([pin.lng, pin.lat]).addTo(mapRef.current!);
        activePopupRef.current = popup;
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
            const isSelected = selectedMarker?.id === m.id;
            return (
              <button
                key={`${m.type}-${m.id}`}
                onClick={() => flyTo(m)}
                className={`flex w-full items-start gap-2 rounded-lg border p-2 text-left transition-colors hover:bg-accent ${
                  isSelected ? "border-blue-400 bg-blue-50 dark:bg-blue-900/20" : "bg-card"
                }`}
              >
                <span
                  className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm"
                  style={{
                    background:
                      ((pin) => STATUS_COLORS[pin.status || ""] || pin.color || cfg.color)(m) +
                      "20",
                  }}
                >
                  {cfg.emoji}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium">{m.label}</p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {m.contactName && `${m.contactName} · `}
                    {cfg.label}
                    {m.status && ` · ${m.status.replace(/_/g, " ")}`}
                  </p>
                  {m.address && (
                    <p className="truncate text-[10px] text-muted-foreground">📍 {m.address}</p>
                  )}
                  {m.value != null && (
                    <p className="text-[10px] font-semibold text-emerald-600">
                      ${Number(m.value).toLocaleString()}
                    </p>
                  )}
                </div>
                <ChevronRight className="mt-1 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
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
              <div className="absolute right-4 top-4 z-20 w-72 duration-200 animate-in slide-in-from-right-4">
                <Card className="border-2 shadow-xl" style={{ borderColor: cfg.color + "60" }}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span
                          className="flex h-8 w-8 items-center justify-center rounded-full text-base"
                          style={{ background: cfg.color + "20" }}
                        >
                          {cfg.emoji}
                        </span>
                        <div>
                          <CardTitle className="text-sm leading-tight">
                            {selectedMarker.label}
                          </CardTitle>
                          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                            {cfg.label}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => setSelectedMarker(null)}
                        className="rounded-full p-1 hover:bg-muted"
                      >
                        <X className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2 text-xs">
                    {selectedMarker.status && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">Status</span>
                        <Badge
                          variant="outline"
                          className="ml-auto text-[10px]"
                          style={{
                            borderColor: STATUS_COLORS[selectedMarker.status] || cfg.color,
                            color: STATUS_COLORS[selectedMarker.status] || cfg.color,
                          }}
                        >
                          {selectedMarker.status.replace(/_/g, " ")}
                        </Badge>
                      </div>
                    )}
                    {selectedMarker.contactName && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Contact</span>
                        <span className="font-medium">{selectedMarker.contactName}</span>
                      </div>
                    )}
                    {selectedMarker.claimNumber && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Claim #</span>
                        <span className="font-mono font-medium">{selectedMarker.claimNumber}</span>
                      </div>
                    )}
                    {selectedMarker.address && (
                      <div className="flex items-center justify-between gap-2">
                        <span className="shrink-0 text-muted-foreground">Address</span>
                        <span className="truncate text-right font-medium">
                          {selectedMarker.address}
                        </span>
                      </div>
                    )}
                    {selectedMarker.value != null && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Value</span>
                        <span className="font-semibold text-emerald-600">
                          ${Number(selectedMarker.value).toLocaleString()}
                        </span>
                      </div>
                    )}
                    {selectedMarker.insurer && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Carrier</span>
                        <span className="font-medium">{selectedMarker.insurer}</span>
                      </div>
                    )}
                    {selectedMarker.jobCategory && (
                      <div className="flex items-center justify-between">
                        <span className="text-muted-foreground">Category</span>
                        <span className="font-medium">{selectedMarker.jobCategory}</span>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex gap-2 border-t pt-2">
                      {isJob && editHref ? (
                        <>
                          <Button asChild size="sm" className="flex-1 gap-1.5 text-xs">
                            <Link href={editHref}>
                              <Pencil className="h-3 w-3" />
                              Edit
                            </Link>
                          </Button>
                          <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="flex-1 gap-1.5 text-xs"
                          >
                            <Link href={editHref} target="_blank">
                              <ExternalLink className="h-3 w-3" />
                              Open
                            </Link>
                          </Button>
                        </>
                      ) : (
                        <p className="w-full text-center text-[10px] text-muted-foreground">
                          Vendor location — view only
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
