/*
 * PHASE 2: Vendor Network
 * Vendor Directory Page - /vendors
 *
 * Displays GAF, ABC Supply, Elite, SRS, Westlake with Arizona locations
 * Real vendor data, phone numbers, downloadable resources
 */

"use client";

import {
  Building2,
  ChevronDown,
  ExternalLink,
  FileText,
  MapPin,
  Phone,
  Search,
  Users,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface Vendor {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  category: string | null;
  primaryPhone: string | null;
  locations: Array<{
    id: string;
    city: string;
    state: string;
  }>;
  _count: {
    locations: number;
    contacts: number;
    resources: number;
  };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function LegacyVendorsPage() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);

  useEffect(() => {
    void fetchVendors();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory]);

  const fetchVendors = async () => {
    try {
      const url = selectedCategory
        ? `/api/vendors?category=${encodeURIComponent(selectedCategory)}`
        : "/api/vendors";
      const response = await fetch(url);
      const data = await response.json();
      setVendors(data.vendors || []);
    } catch (error) {
      logger.error("Failed to fetch vendors:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredVendors = vendors.filter((vendor) =>
    vendor.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const categories = Array.from(
    new Set(vendors.map((v) => v.category).filter(Boolean))
  ) as string[];

  // Group vendors by category for organized display
  const vendorsByCategory = filteredVendors.reduce(
    (acc, vendor) => {
      const category = vendor.category || "Other";
      if (!acc[category]) acc[category] = [];
      acc[category].push(vendor);
      return acc;
    },
    {} as Record<string, Vendor[]>
  );

  // Define category order and display names - matches seeded vendor data
  const categoryConfig = [
    {
      key: "Shingle",
      label: "🏠 Shingle Manufacturers",
      description: "Premium asphalt shingle roofing systems",
    },
    {
      key: "Metal",
      label: "🔩 Metal Roofing",
      description: "Standing seam, corrugated, and metal panel systems",
    },
    {
      key: "Tile",
      label: "🧱 Tile Roofing",
      description: "Concrete, clay, and composite tile systems",
    },
    {
      key: "Flat/TPO",
      label: "📐 Flat & TPO Roofing",
      description: "Commercial flat roof, TPO, and membrane systems",
    },
    {
      key: "Coatings",
      label: "🎨 Roof Coatings",
      description: "Elastomeric, silicone, and protective coatings",
    },
    {
      key: "Distribution",
      label: "🏗️ Distributors",
      description: "National and regional building material distributors",
    },
    {
      key: "Multi-Category",
      label: "🌟 Multi-Category Suppliers",
      description: "Full-service roofing product manufacturers",
    },
  ];

  return (
    <div className="container mx-auto max-w-7xl px-4 py-8">
      {/* Raven UI Header */}
      <PageHero
        section="build"
        title="Vendor Network"
        subtitle="Connect with trusted roofing manufacturers, suppliers, and distributors in Arizona"
        icon={<Building2 className="h-6 w-6" />}
      />

      {/* Search and Filters */}
      <div className="sticky top-16 z-30 -mx-4 mb-8 border-b border-slate-200/50 bg-white/80 px-4 py-4 backdrop-blur-lg dark:border-slate-800 dark:bg-slate-950/80">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative flex-1 sm:max-w-md">
            <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search vendors..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border bg-background py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>

          {/* Category Dropdown Selector */}
          <div className="relative">
            <button
              onClick={() => setShowCategoryDropdown(!showCategoryDropdown)}
              className="flex w-full items-center justify-between gap-2 rounded-lg border bg-background px-4 py-2 text-sm font-medium transition hover:bg-accent sm:w-auto sm:min-w-[220px]"
            >
              <span>
                {selectedCategory
                  ? categoryConfig.find((c) => c.key === selectedCategory)?.label ||
                    selectedCategory
                  : "All Categories"}
              </span>
              <ChevronDown
                className={`h-4 w-4 transition-transform ${showCategoryDropdown ? "rotate-180" : ""}`}
              />
            </button>

            {showCategoryDropdown && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowCategoryDropdown(false)}
                />
                <div className="absolute right-0 top-full z-50 mt-1 w-72 overflow-hidden rounded-xl border bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900">
                  <div className="max-h-80 overflow-y-auto py-1">
                    <button
                      onClick={() => {
                        setSelectedCategory(null);
                        setShowCategoryDropdown(false);
                      }}
                      className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-blue-50 dark:hover:bg-slate-800 ${
                        selectedCategory === null
                          ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                          : ""
                      }`}
                    >
                      <span className="text-base">🔍</span>
                      <div>
                        <div className="font-medium">All Categories</div>
                        <div className="text-xs text-muted-foreground">
                          Show all {vendors.length} vendors
                        </div>
                      </div>
                    </button>
                    {categoryConfig.map((cat) => {
                      const count = vendorsByCategory[cat.key]?.length || 0;
                      if (count === 0) return null;
                      return (
                        <button
                          key={cat.key}
                          onClick={() => {
                            setSelectedCategory(cat.key);
                            setShowCategoryDropdown(false);
                          }}
                          className={`flex w-full items-center gap-3 px-4 py-2.5 text-left text-sm transition hover:bg-blue-50 dark:hover:bg-slate-800 ${
                            selectedCategory === cat.key
                              ? "bg-blue-50 font-semibold text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                              : ""
                          }`}
                        >
                          <span className="text-base">{cat.label.split(" ")[0]}</span>
                          <div className="flex-1">
                            <div className="font-medium">
                              {cat.label.split(" ").slice(1).join(" ")}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {count} vendor{count !== 1 ? "s" : ""}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Active filter indicator */}
        {selectedCategory && (
          <div className="mt-2 flex items-center gap-2">
            <span className="text-xs text-muted-foreground">Filtered:</span>
            <span className="inline-flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {categoryConfig.find((c) => c.key === selectedCategory)?.label || selectedCategory}
              <button
                onClick={() => setSelectedCategory(null)}
                className="ml-1 hover:text-blue-900"
                aria-label="Clear filter"
              >
                ×
              </button>
            </span>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="group relative overflow-hidden rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-50 to-blue-100/50 p-6 shadow-lg transition-all hover:shadow-xl dark:from-blue-950/50 dark:to-blue-900/30">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-blue-500/10 blur-2xl"></div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-blue-500/20 text-blue-600 dark:text-blue-400">
              <Building2 className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl font-bold text-blue-900 dark:text-blue-100">
                {vendors.length}
              </p>
              <p className="text-sm font-medium text-blue-700 dark:text-blue-300">Active Vendors</p>
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-50 to-emerald-100/50 p-6 shadow-lg transition-all hover:shadow-xl dark:from-emerald-950/50 dark:to-emerald-900/30">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-emerald-500/10 blur-2xl"></div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              <MapPin className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl font-bold text-emerald-900 dark:text-emerald-100">
                {vendors.reduce((sum, v) => sum + v._count.locations, 0)}
              </p>
              <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                Locations in Arizona
              </p>
            </div>
          </div>
        </div>
        <div className="group relative overflow-hidden rounded-2xl border border-purple-500/20 bg-gradient-to-br from-purple-50 to-purple-100/50 p-6 shadow-lg transition-all hover:shadow-xl dark:from-purple-950/50 dark:to-purple-900/30">
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-purple-500/10 blur-2xl"></div>
          <div className="relative flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-purple-500/20 text-purple-600 dark:text-purple-400">
              <Users className="h-7 w-7" />
            </div>
            <div>
              <p className="text-3xl font-bold text-purple-900 dark:text-purple-100">
                {vendors.reduce((sum, v) => sum + v._count.contacts, 0)}
              </p>
              <p className="text-sm font-medium text-purple-700 dark:text-purple-300">
                Contacts Available
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Vendors Grid */}
      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">Loading vendors...</p>
        </div>
      ) : filteredVendors.length === 0 ? (
        <div className="flex h-64 items-center justify-center">
          <p className="text-muted-foreground">No vendors found</p>
        </div>
      ) : selectedCategory ? (
        // Show filtered category view (existing grid)
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredVendors.map((vendor) => (
            <VendorCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      ) : (
        // Show organized category sections
        <div className="space-y-12">
          {categoryConfig.map((category) => {
            const categoryVendors = vendorsByCategory[category.key];
            if (!categoryVendors || categoryVendors.length === 0) return null;

            return (
              <section
                key={category.key}
                className="scroll-mt-20"
                id={category.key.toLowerCase().replace(/\s+/g, "-")}
              >
                {/* Category Header Card */}
                <div className="mb-6 rounded-xl border border-slate-200/50 bg-gradient-to-r from-slate-50 to-white p-6 shadow-sm dark:border-slate-800/50 dark:from-slate-900/50 dark:to-slate-800/30">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                        {category.label}
                      </h2>
                      <p className="mt-1 text-sm text-muted-foreground">{category.description}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-2xl">
                      {category.label.split(" ")[0]}
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                      {categoryVendors.length} vendor{categoryVendors.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                </div>

                {/* Vendors Grid */}
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {categoryVendors.map((vendor) => (
                    <VendorCard key={vendor.id} vendor={vendor} />
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function VendorsPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/vendor-network");
  }, [router]);

  return null;
}

// Extracted Vendor Card Component
function VendorCard({ vendor }: { vendor: Vendor }) {
  const [imgError, setImgError] = useState(false);

  return (
    <Card className="overflow-hidden">
      <div className="p-6">
        {/* Logo/Header */}
        <div className="mb-4 flex items-start justify-between">
          <div className="flex flex-1 items-start gap-3">
            {vendor.logo && !imgError ? (
              <div className="relative h-12 w-12 flex-shrink-0 overflow-hidden rounded-lg border bg-white">
                <Image
                  src={vendor.logo}
                  alt={vendor.name}
                  fill
                  className="object-contain p-1"
                  onError={() => setImgError(true)}
                />
              </div>
            ) : (
              <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-lg font-bold text-white">
                {vendor.name.charAt(0)}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="mb-1 text-xl font-bold">{vendor.name}</h3>
              {vendor.category && (
                <span className="inline-block rounded-full bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
                  {vendor.category}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Description */}
        {vendor.description && (
          <p className="mb-4 line-clamp-3 text-sm text-muted-foreground">{vendor.description}</p>
        )}

        {/* Stats */}
        <div className="mb-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <MapPin className="h-4 w-4" />
            <span>{vendor._count.locations} locations</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4" />
            <span>{vendor._count.contacts} contacts</span>
          </div>
          <div className="flex items-center gap-1">
            <FileText className="h-4 w-4" />
            <span>{vendor._count.resources || 0} resources</span>
          </div>
        </div>

        {/* Cities */}
        {vendor.locations.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground">ARIZONA LOCATIONS</p>
            <p className="text-sm">
              {vendor.locations
                .map((loc) => loc.city)
                .slice(0, 3)
                .join(", ")}
              {vendor.locations.length > 3 && "..."}
            </p>
          </div>
        )}

        {/* Contact */}
        {vendor.primaryPhone && (
          <div className="mb-4 flex items-center gap-2 text-sm">
            <Phone className="h-4 w-4 text-muted-foreground" />
            <a href={`tel:${vendor.primaryPhone}`} className="hover:underline">
              {vendor.primaryPhone}
            </a>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2">
          <Link href={`/vendors/${vendor.slug}`} className="flex-1">
            <Button className="w-full" variant="default">
              View Details
            </Button>
          </Link>
          {vendor.website && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`Visit ${vendor.name} website`}
            >
              <Button variant="outline" size="icon">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}
