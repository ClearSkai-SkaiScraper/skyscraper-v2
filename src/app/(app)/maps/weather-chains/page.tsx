/**
 * Weather Maps — Storm Intelligence & Lead Generation
 *
 * Enhanced weather map page that combines:
 *   - Storm event visualization
 *   - Property damage scoring
 *   - One-click save to Door Knocking routes
 *   - Integration with Property Profiles
 */
"use client";

import {
  ArrowRight,
  Cloud,
  CloudLightning,
  CloudRain,
  Home,
  Loader2,
  MapPin,
  Plus,
  RefreshCw,
  Target,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface StormEvent {
  id: string;
  date: string;
  type: string;
  severity: string;
  location: string;
  hailSize?: number;
  windSpeed?: number;
  impactedProperties: number;
}

interface RankedAddress {
  id: string;
  address: string;
  city: string;
  state: string;
  score: number;
  distanceFromStorm: number;
  estimatedHailSize?: number;
  existingClaim: boolean;
  existingLead: boolean;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function WeatherMapsPage() {
  const [storms, setStorms] = useState<StormEvent[]>([]);
  const [selectedStorm, setSelectedStorm] = useState<StormEvent | null>(null);
  const [addresses, setAddresses] = useState<RankedAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingAddresses, setLoadingAddresses] = useState(false);
  const [savingToDoorknock, setSavingToDoorknock] = useState<string | null>(null);

  // Load recent storms
  const fetchStorms = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/weather/storm-events?limit=20");
      if (res.ok) {
        const data = await res.json();
        const events: StormEvent[] = (data.events || data.stormEvents || []).map(
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (e: any, i: number) => ({
            id: e.id || `storm_${i}`,
            date: e.date || e.eventDate || new Date().toISOString(),
            type: e.type || e.eventType || "mixed",
            severity: e.severity || "moderate",
            location: e.location || e.city || "Unknown",
            hailSize: e.hailSize,
            windSpeed: e.windSpeed,
            impactedProperties: e.impactedProperties || e.propertiesAffected || 0,
          })
        );
        setStorms(events);
        if (events.length > 0 && !selectedStorm) {
          setSelectedStorm(events[0]);
        }
      }
    } catch (error) {
      console.error("Failed to fetch storms:", error);
    } finally {
      setLoading(false);
    }
  }, [selectedStorm]);

  // Load ranked addresses for selected storm
  const fetchAddresses = useCallback(async (storm: StormEvent) => {
    setLoadingAddresses(true);
    try {
      const res = await fetch(
        `/api/weather/storm-addresses?stormId=${storm.id}&location=${encodeURIComponent(storm.location)}`
      );
      if (res.ok) {
        const data = await res.json();
        setAddresses(data.addresses || []);
      }
    } catch (error) {
      console.error("Failed to fetch addresses:", error);
    } finally {
      setLoadingAddresses(false);
    }
  }, []);

  useEffect(() => {
    void fetchStorms();
  }, [fetchStorms]);

  useEffect(() => {
    if (selectedStorm) {
      void fetchAddresses(selectedStorm);
    }
  }, [selectedStorm, fetchAddresses]);

  // Save address to doorknocking route
  const saveToDoorknoking = async (address: RankedAddress) => {
    setSavingToDoorknock(address.id);
    try {
      const res = await fetch("/api/doorknocking/addresses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          address: address.address,
          city: address.city,
          state: address.state,
          score: address.score,
          source: "weather_map",
        }),
      });
      if (res.ok) {
        toast.success("Added to Door Knocking route!");
        setAddresses((prev) =>
          prev.map((a) => (a.id === address.id ? { ...a, existingLead: true } : a))
        );
      } else {
        toast.error("Failed to add to route");
      }
    } catch {
      toast.error("Failed to add to route");
    } finally {
      setSavingToDoorknock(null);
    }
  };

  const getStormIcon = (type: string) => {
    if (type.includes("hail")) return <Cloud className="h-4 w-4" />;
    if (type.includes("wind")) return <CloudLightning className="h-4 w-4" />;
    return <CloudRain className="h-4 w-4" />;
  };

  const getSeverityColor = (severity: string) => {
    switch (severity.toLowerCase()) {
      case "severe":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "moderate":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-red-600 dark:text-red-400";
    if (score >= 40) return "text-amber-600 dark:text-amber-400";
    return "text-emerald-600 dark:text-emerald-400";
  };

  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Weather Map"
        subtitle="View storm activity, score properties for damage likelihood, and build door knocking routes"
        icon={<CloudRain className="h-5 w-5" />}
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => void fetchStorms()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Refresh
          </Button>
          <Button asChild>
            <Link href="/maps/door-knocking">
              <MapPin className="mr-2 h-4 w-4" />
              Door Knocking
            </Link>
          </Button>
        </div>
      </PageHero>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Storm Events List */}
        <div className="lg:col-span-1">
          <PageSectionCard>
            <h3 className="mb-4 font-semibold text-foreground">Recent Storms</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : storms.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                No recent storm events found
              </div>
            ) : (
              <div className="space-y-2">
                {storms.map((storm) => (
                  <button
                    key={storm.id}
                    onClick={() => setSelectedStorm(storm)}
                    className={cn(
                      "w-full rounded-lg border p-3 text-left transition-all",
                      selectedStorm?.id === storm.id
                        ? "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/30"
                        : "border-slate-200 hover:bg-slate-50 dark:border-slate-700 dark:hover:bg-slate-800"
                    )}
                  >
                    <div className="flex items-center gap-2">
                      {getStormIcon(storm.type)}
                      <span className="font-medium">{storm.location}</span>
                      <span
                        className={cn(
                          "ml-auto rounded-full px-2 py-0.5 text-xs font-medium",
                          getSeverityColor(storm.severity)
                        )}
                      >
                        {storm.severity}
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {new Date(storm.date).toLocaleDateString()} • {storm.impactedProperties}{" "}
                      properties
                    </div>
                    {(storm.hailSize || storm.windSpeed) && (
                      <div className="mt-1 flex gap-3 text-xs">
                        {storm.hailSize && <span>🧊 {storm.hailSize}" hail</span>}
                        {storm.windSpeed && <span>💨 {storm.windSpeed} mph</span>}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </PageSectionCard>
        </div>

        {/* Ranked Addresses */}
        <div className="lg:col-span-2">
          <PageSectionCard>
            <div className="mb-4 flex items-center justify-between">
              <h3 className="font-semibold text-foreground">
                {selectedStorm ? `Properties Near ${selectedStorm.location}` : "Select a Storm"}
              </h3>
              {addresses.length > 0 && (
                <Link href="/maps/door-knocking" className="text-sm text-primary hover:underline">
                  View All Routes →
                </Link>
              )}
            </div>

            {loadingAddresses ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : !selectedStorm ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Target className="mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="text-sm text-muted-foreground">
                  Select a storm event to see ranked properties
                </p>
              </div>
            ) : addresses.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <Home className="mb-3 h-12 w-12 text-muted-foreground/50" />
                <p className="font-medium text-foreground">No addresses found</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Try a different storm or check back later
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {addresses.map((addr) => (
                  <div
                    key={addr.id}
                    className={cn(
                      "flex items-center gap-4 rounded-lg border p-4 transition-all",
                      addr.existingClaim
                        ? "border-emerald-200 bg-emerald-50/50 dark:border-emerald-800 dark:bg-emerald-950/20"
                        : addr.existingLead
                          ? "border-blue-200 bg-blue-50/50 dark:border-blue-800 dark:bg-blue-950/20"
                          : "border-slate-200 dark:border-slate-700"
                    )}
                  >
                    {/* Score */}
                    <div className="flex flex-col items-center">
                      <div className={cn("text-2xl font-bold", getScoreColor(addr.score))}>
                        {addr.score}
                      </div>
                      <div className="text-[10px] text-muted-foreground">score</div>
                    </div>

                    {/* Address Info */}
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-foreground">{addr.address}</p>
                      <p className="text-sm text-muted-foreground">
                        {addr.city}, {addr.state} • {addr.distanceFromStorm.toFixed(1)} mi from
                        storm
                      </p>
                      {addr.estimatedHailSize && (
                        <p className="mt-1 text-xs text-muted-foreground">
                          Est. hail: {addr.estimatedHailSize}"
                        </p>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {addr.existingClaim ? (
                        <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-medium text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400">
                          Has Claim
                        </span>
                      ) : addr.existingLead ? (
                        <span className="rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                          In Route
                        </span>
                      ) : (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => void saveToDoorknoking(addr)}
                          disabled={savingToDoorknock === addr.id}
                        >
                          {savingToDoorknock === addr.id ? (
                            <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                          ) : (
                            <Plus className="mr-1 h-3 w-3" />
                          )}
                          Add to Route
                        </Button>
                      )}
                      <Link href={`/property-profiles?address=${encodeURIComponent(addr.address)}`}>
                        <Button size="sm" variant="ghost">
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </PageSectionCard>
        </div>
      </div>
    </PageContainer>
  );
}
