"use client";

import { useEffect, useState } from "react";

import { ContractorCard } from "@/components/contractors/ContractorCard";
import { guardedFetch } from "@/lib/guardedFetch";
import { logger } from "@/lib/logger";

import ContractorMap from "./components/ContractorMap";
import FilterBar from "./components/FilterBar";

interface Contractor {
  id: string;
  slug: string;
  businessName: string;
  logoUrl: string | null;
  coverPhotoUrl: string | null;
  tagline?: string | null;
  searchKeywords: string[];
  verified: boolean;
  featured: boolean;
  featuredUntil?: string | null;
  emergencyAvailable: boolean;
  emergencyReady?: boolean;
  serviceAreas: any[];
  services: any;
  totalJobs: number;
  distance?: number;
  trustScore?: number;
  licenseVerified?: boolean;
  insuranceVerified?: boolean;
  businessVerified?: boolean;
  emailVerified?: boolean;
}

interface Filters {
  trade: string;
  zip: string;
  radius: string;
  verified: boolean;
  emergency: boolean;
  sort: string;
}

export default function PublicDirectoryPage() {
  const [loading, setLoading] = useState(true);
  const [contractors, setContractors] = useState<Contractor[]>([]);
  const [origin, setOrigin] = useState<{ lat: number; lng: number } | null>(null);
  const [detectingLocation, setDetectingLocation] = useState(false);
  const [filters, setFilters] = useState<Filters>({
    trade: "",
    zip: "",
    radius: "",
    verified: false,
    emergency: false,
    sort: "best",
  });

  // Auto-detect location on mount
  useEffect(() => {
    void detectLocation();
  }, []);

  // Detect user's location using browser geolocation API
  async function detectLocation() {
    if (!navigator.geolocation) return;

    setDetectingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;

        // Reverse geocode to get ZIP code
        try {
          const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
          if (token) {
            const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${longitude},${latitude}.json?types=postcode&access_token=${token}`;
            const res = await guardedFetch(url, {}, "mapbox-reverse-geocode");
            let data: any = null;
            if (res) {
              try {
                data = await res.json();
              } catch {}
            }
            if (data?.features?.[0]?.text) {
              const zip = data.features[0].text;
              setFilters((prev) => ({ ...prev, zip, radius: "25" }));
            } else {
              // Fallback mock ZIP
              setFilters((prev) => ({ ...prev, zip: "00000", radius: "25" }));
            }
          } else {
            // No token available → mock fallback
            setFilters((prev) => ({ ...prev, zip: "00000", radius: "25" }));
          }
        } catch (error) {
          logger.error("Geocoding error:", error);
        } finally {
          setDetectingLocation(false);
        }
      },
      (error) => {
        logger.error("Location detection error:", error);
        setDetectingLocation(false);
      }
    );
  }

  // 1️⃣ Fetch contractors
  async function loadContractors(f: Filters) {
    setLoading(true);

    const params = new URLSearchParams();
    if (f.trade) params.append("trade", f.trade);
    if (f.zip) params.append("zip", f.zip);
    if (f.radius) params.append("radius", f.radius);
    if (f.verified) params.append("verified", "true");
    if (f.emergency) params.append("emergency", "true");
    if (f.sort) params.append("sort", f.sort);

    try {
      const res = await fetch(`/api/contractors/public/list?${params.toString()}`);
      const data = await res.json();

      setContractors(data.contractors || []);
      setOrigin(data.origin || null);
    } catch (error) {
      logger.error("Error loading contractors:", error);
      setContractors([]);
      setOrigin(null);
    } finally {
      setLoading(false);
    }
  }

  // 2️⃣ Load initial results when filters change (especially after location detection)
  useEffect(() => {
    if (filters.zip || filters.trade) {
      void loadContractors(filters);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    filters.zip,
    filters.radius,
    filters.trade,
    filters.verified,
    filters.emergency,
    filters.sort,
  ]);

  // 3️⃣ Handle filter changes
  function handleFilterChange(updated: Filters) {
    setFilters(updated);
  }

  return (
    <div className="min-h-screen w-full bg-gray-50 pb-20">
      {/* HEADER */}
      <div className="space-y-3 bg-gradient-to-br from-sky-600 to-sky-800 py-12 text-center text-white">
        <h1 className="text-4xl font-bold">Find Trusted Contractors Near You</h1>
        <p className="mx-auto max-w-2xl px-4 text-lg text-sky-100">
          Search the SkaiScraper Network for verified pros ready to help you with repairs,
          maintenance, upgrades, or emergencies.
        </p>
      </div>

      {/* FILTER BAR */}
      <div className="mx-auto -mt-6 mb-8 max-w-6xl px-4">
        <FilterBar onChange={handleFilterChange} />

        {/* Location Detection */}
        {detectingLocation && (
          <div className="mt-4 text-center text-sm text-gray-600">
            📍 Detecting your location...
          </div>
        )}
      </div>

      {/* LAYOUT: MAP + RESULTS */}
      <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 px-4 lg:grid-cols-2">
        {/* LEFT: RESULTS LIST */}
        <div className="order-2 space-y-4 lg:order-1">
          {loading && (
            <div className="py-10 text-center text-gray-500">
              <div className="animate-pulse">Loading contractors…</div>
            </div>
          )}

          {!loading && contractors.length === 0 && (
            <div className="rounded-xl border bg-white py-12 text-center text-gray-500 shadow-sm">
              <p className="text-lg font-semibold">No contractors found.</p>
              <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                Try adjusting your filters or search radius.
              </p>
            </div>
          )}

          {!loading && contractors.length > 0 && (
            <>
              <div className="mb-2 px-2 text-sm text-gray-600">
                Found {contractors.length} contractor{contractors.length !== 1 ? "s" : ""}
                {filters.zip && ` near ${filters.zip}`}
              </div>

              {contractors.map((c) => (
                <div key={c.id} className="relative">
                  <ContractorCard
                    slug={c.slug}
                    businessName={c.businessName}
                    logoUrl={c.logoUrl}
                    tagline={c.tagline}
                    serviceAreas={c.serviceAreas || []}
                    services={c.services || []}
                    verified={c.verified}
                    emergencyAvailable={c.emergencyAvailable}
                    emergencyReady={c.emergencyReady}
                    featured={c.featured}
                    featuredUntil={c.featuredUntil}
                    totalJobs={c.totalJobs}
                    trustScore={c.trustScore}
                    licenseVerified={c.licenseVerified}
                    insuranceVerified={c.insuranceVerified}
                    businessVerified={c.businessVerified}
                    emailVerified={c.emailVerified}
                  />
                  {/* Distance badge overlay */}
                  {c.distance !== undefined && (
                    <div className="absolute right-4 top-4 rounded-full bg-blue-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                      {c.distance.toFixed(1)} mi
                    </div>
                  )}
                </div>
              ))}
            </>
          )}
        </div>

        {/* RIGHT: MAP */}
        <div className="order-1 h-[500px] w-full overflow-hidden rounded-xl border bg-white shadow-sm lg:sticky lg:top-6 lg:order-2 lg:h-[700px]">
          {!loading && contractors.length > 0 && (
            <ContractorMap contractors={contractors} origin={origin} />
          )}

          {loading && (
            <div className="flex h-full w-full items-center justify-center text-gray-600 dark:text-gray-400">
              <div className="animate-pulse">Loading map…</div>
            </div>
          )}

          {!loading && contractors.length === 0 && (
            <div className="flex h-full w-full items-center justify-center text-gray-600 dark:text-gray-400">
              <div className="px-4 text-center">
                <p>No locations to display</p>
                <p className="mt-1 text-sm">Adjust your search filters</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
