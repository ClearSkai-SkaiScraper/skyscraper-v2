/**
 * VIN — Vendor Network Client Component
 * Full browsing UI with trade/type/region filters, search, and vendor cards
 */

"use client";

import {
  Award,
  CreditCard,
  ExternalLink,
  Filter,
  Gift,
  Loader2,
  MapPin,
  Package,
  Phone,
  Search,
  ShieldCheck,
  Star,
  Store,
  X,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  TRADE_TYPE_LABELS,
  VENDOR_TYPE_LABELS,
  type VendorListItem,
} from "@/lib/vendors/vin-types";

import { VendorLogo } from "./VendorLogo";

const TRADE_ICONS: Record<string, string> = {
  roofing: "🏠",
  plumbing: "🔧",
  electrical: "⚡",
  hvac: "❄️",
  concrete: "🧱",
  drywall: "🪨",
  framing: "🪵",
  painting: "🎨",
  flooring: "🪵",
  landscaping: "🌿",
  windows_doors: "🪟",
  solar: "☀️",
  insulation: "🧊",
  restoration: "🔄",
  water_mold: "💧",
  fire: "🔥",
  pools: "🏊",
  fencing: "🏗️",
  foundation: "🏗️",
  stucco: "🏠",
  siding: "🏠",
  gutters: "🌧️",
  demolition: "💥",
  excavation: "🚜",
  masonry: "🧱",
  tile: "🔲",
  general_contractor: "👷",
  cabinets: "🗄️",
  countertops: "🪨",
  appliances: "🏭",
};

/* ------------------------------------------------------------------ */
/*  Service category definitions for browsing by trade                  */
/* ------------------------------------------------------------------ */
const SERVICE_CATEGORIES = [
  { id: "roofing", label: "Roofing", icon: "🏠", color: "from-red-500 to-orange-500" },
  { id: "solar", label: "Solar", icon: "☀️", color: "from-amber-500 to-yellow-500" },
  { id: "hvac", label: "HVAC", icon: "❄️", color: "from-cyan-500 to-blue-500" },
  { id: "plumbing", label: "Plumbing", icon: "💧", color: "from-blue-500 to-indigo-500" },
  { id: "electrical", label: "Electrical", icon: "⚡", color: "from-yellow-500 to-amber-600" },
  { id: "restoration", label: "Restoration", icon: "🔧", color: "from-emerald-500 to-teal-500" },
  { id: "painting", label: "Painting", icon: "🎨", color: "from-pink-500 to-rose-500" },
  { id: "flooring", label: "Flooring", icon: "🪵", color: "from-amber-700 to-yellow-700" },
  { id: "carpentry", label: "Carpentry", icon: "🪚", color: "from-orange-600 to-amber-700" },
  { id: "landscaping", label: "Landscaping", icon: "🌿", color: "from-green-500 to-emerald-500" },
  { id: "concrete", label: "Concrete", icon: "🧱", color: "from-slate-500 to-gray-600" },
  { id: "windows_doors", label: "Windows & Doors", icon: "🪟", color: "from-sky-500 to-blue-600" },
  {
    id: "general_contractor",
    label: "General Contractor",
    icon: "🏗️",
    color: "from-indigo-500 to-violet-600",
  },
  { id: "gutters", label: "Gutters", icon: "🌧️", color: "from-teal-500 to-cyan-600" },
  { id: "insulation", label: "Insulation", icon: "🧤", color: "from-violet-500 to-purple-600" },
  { id: "fencing", label: "Fencing", icon: "🏡", color: "from-lime-600 to-green-700" },
  { id: "siding", label: "Siding", icon: "🏘️", color: "from-stone-500 to-stone-700" },
  { id: "masonry", label: "Masonry", icon: "🧱", color: "from-amber-800 to-orange-900" },
  { id: "tile", label: "Tile", icon: "🔲", color: "from-teal-600 to-teal-800" },
  { id: "pools", label: "Pool Contractor", icon: "🏊", color: "from-cyan-500 to-blue-700" },
  { id: "drywall", label: "Drywall", icon: "🧱", color: "from-stone-400 to-stone-600" },
  { id: "framing", label: "Framing", icon: "🪜", color: "from-amber-600 to-amber-800" },
  { id: "water_mold", label: "Mold Remediation", icon: "🧪", color: "from-lime-500 to-green-700" },
  { id: "fire", label: "Fire Restoration", icon: "🔥", color: "from-orange-600 to-red-800" },
  { id: "demolition", label: "Demolition", icon: "💥", color: "from-red-700 to-rose-900" },
  { id: "excavation", label: "Excavation", icon: "🚜", color: "from-yellow-700 to-amber-800" },
  { id: "foundation", label: "Foundation", icon: "🏗️", color: "from-gray-600 to-gray-800" },
  { id: "stucco", label: "Stucco", icon: "🏠", color: "from-stone-500 to-stone-700" },
  { id: "cabinets", label: "Cabinets", icon: "🗄️", color: "from-amber-700 to-orange-800" },
  { id: "countertops", label: "Countertops", icon: "🪨", color: "from-slate-600 to-slate-800" },
  { id: "appliances", label: "Appliances", icon: "🏭", color: "from-gray-500 to-gray-700" },
];

interface VendorNetworkState {
  vendors: VendorListItem[];
  loading: boolean;
  total: number;
  stats: {
    total: number;
    featured: number;
    verified: number;
    withFinancing: number;
    tradeDistribution: Record<string, number>;
  } | null;
}

interface Filters {
  search: string;
  trade: string;
  vendorType: string;
  featured: boolean;
  emergency: boolean;
  financing: boolean;
  rebates: boolean;
}

export function VendorNetworkClient() {
  const searchParams = useSearchParams();
  const initialTrade = searchParams?.get("trade") || "";
  const initialSearch = searchParams?.get("q") || "";

  const [state, setState] = useState<VendorNetworkState>({
    vendors: [],
    loading: true,
    total: 0,
    stats: null,
  });

  const [filters, setFilters] = useState<Filters>({
    search: initialSearch,
    trade: initialTrade,
    vendorType: "",
    featured: false,
    emergency: false,
    financing: false,
    rebates: false,
  });

  const [showFilters, setShowFilters] = useState(false);
  const [showCategories, setShowCategories] = useState(!initialTrade && !initialSearch);

  const fetchVendors = useCallback(async () => {
    setState((s) => ({ ...s, loading: true }));
    try {
      const params = new URLSearchParams();
      if (filters.search) params.set("q", filters.search);
      if (filters.trade) params.set("trade", filters.trade);
      // Default to excluding manufacturers — they belong on the Products page
      params.set("excludeType", "manufacturer");
      if (filters.vendorType) {
        params.set("vendorType", filters.vendorType);
      }
      if (filters.featured) params.set("featured", "true");
      if (filters.emergency) params.set("emergency", "true");
      if (filters.financing) params.set("financing", "true");
      if (filters.rebates) params.set("rebates", "true");
      params.set("limit", "200");

      const res = await fetch(`/api/vin?${params}`);
      const data = await res.json();

      if (data.success) {
        setState({
          vendors: data.vendors,
          total: data.pagination.total,
          stats: data.stats,
          loading: false,
        });
      }
    } catch {
      toast.error("Failed to load vendor network");
      setState((s) => ({ ...s, loading: false }));
    }
  }, [filters]);

  useEffect(() => {
    const debounce = setTimeout(fetchVendors, 300);
    return () => clearTimeout(debounce);
  }, [fetchVendors]);

  const clearFilters = () => {
    setFilters({
      search: "",
      trade: "",
      vendorType: "",
      featured: false,
      emergency: false,
      financing: false,
      rebates: false,
    });
  };

  const activeFilterCount = [
    filters.trade,
    filters.vendorType,
    filters.featured,
    filters.emergency,
    filters.financing,
    filters.rebates,
  ].filter(Boolean).length;

  // Group vendors by trade for the sidebar stats — show ALL trades
  const topTrades = state.stats?.tradeDistribution
    ? Object.entries(state.stats.tradeDistribution).sort(([, a], [, b]) => b - a)
    : [];

  return (
    <div className="space-y-6">
      {/* Stats Bar */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-primary">{state.total}</p>
          <p className="text-xs text-muted-foreground">Dealers & Distributors</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-amber-600">{state.stats?.featured ?? 0}</p>
          <p className="text-xs text-muted-foreground">Featured Partners</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-green-600">{state.stats?.verified ?? 0}</p>
          <p className="text-xs text-muted-foreground">Verified</p>
        </Card>
        <Card className="p-4 text-center">
          <p className="text-3xl font-bold text-blue-600">{state.stats?.withFinancing ?? 0}</p>
          <p className="text-xs text-muted-foreground">With Financing</p>
        </Card>
      </div>

      {/* Category Browse Grid — only show categories with vendors */}
      {showCategories && (
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">
              Browse by Trade Category
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowCategories(false)}
              className="text-sm text-muted-foreground"
            >
              Hide categories
            </Button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 lg:grid-cols-7">
            {SERVICE_CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => {
                  setFilters((f) => ({ ...f, trade: f.trade === cat.id ? "" : cat.id }));
                  setShowCategories(false);
                }}
                className={`group relative flex flex-col items-center justify-center gap-2 overflow-hidden rounded-xl border p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md ${
                  filters.trade === cat.id
                    ? "border-blue-500 bg-blue-50 ring-2 ring-blue-500/20 dark:bg-blue-900/20"
                    : "border-slate-200/60 bg-white dark:border-slate-700 dark:bg-slate-800"
                }`}
              >
                <div
                  className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${cat.color} text-2xl shadow-sm transition-transform group-hover:scale-110`}
                >
                  {cat.icon}
                </div>
                <span className="text-center text-xs font-medium text-slate-700 dark:text-slate-300">
                  {cat.label}
                </span>
              </button>
            ))}
          </div>
        </div>
      )}

      {!showCategories && (
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowCategories(true)}
          className="gap-2"
        >
          🔨 Browse by Trade Category
        </Button>
      )}

      {/* Search & Filter Bar */}
      <div className="space-y-3">
        <div className="flex gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search vendors, products, trades..."
              value={filters.search}
              onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
              className="pl-10"
            />
            {filters.search && (
              <button
                onClick={() => setFilters((f) => ({ ...f, search: "" }))}
                aria-label="Clear search"
                className="absolute right-3 top-1/2 -translate-y-1/2"
              >
                <X className="h-4 w-4 text-muted-foreground" />
              </button>
            )}
          </div>
          <Button
            variant={showFilters ? "default" : "outline"}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="mr-2 h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <Badge variant="secondary" className="ml-2">
                {activeFilterCount}
              </Badge>
            )}
          </Button>
          {activeFilterCount > 0 && (
            <Button variant="ghost" size="sm" onClick={clearFilters}>
              Clear All
            </Button>
          )}
        </div>

        {/* Expanded Filters */}
        {showFilters && (
          <Card className="space-y-4 p-4">
            {/* Trade Type */}
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Trade</p>
              <div className="flex flex-wrap gap-2">
                {topTrades.map(([trade, count]) => (
                  <button
                    key={trade}
                    onClick={() =>
                      setFilters((f) => ({ ...f, trade: f.trade === trade ? "" : trade }))
                    }
                    className={`inline-flex items-center gap-1 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      filters.trade === trade
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border bg-background hover:bg-accent"
                    }`}
                  >
                    <span>{TRADE_ICONS[trade] || "🔨"}</span>
                    {TRADE_TYPE_LABELS[trade as keyof typeof TRADE_TYPE_LABELS] || trade}
                    <span className="ml-1 text-muted-foreground">({count})</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Vendor Type — manufacturers are on the Products page */}
            <div>
              <p className="mb-2 text-sm font-medium text-muted-foreground">Vendor Type</p>
              <div className="flex flex-wrap gap-2">
                {Object.entries(VENDOR_TYPE_LABELS)
                  .filter(([key]) => key !== "manufacturer")
                  .map(([key, label]) => (
                    <button
                      key={key}
                      onClick={() =>
                        setFilters((f) => ({
                          ...f,
                          vendorType: f.vendorType === key ? "" : key,
                        }))
                      }
                      className={`rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                        filters.vendorType === key
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background hover:bg-accent"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
              </div>
            </div>

            {/* Quick Toggles */}
            <div className="flex flex-wrap gap-3">
              <ToggleChip
                active={filters.featured}
                onClick={() => setFilters((f) => ({ ...f, featured: !f.featured }))}
                icon={<Star className="h-3.5 w-3.5" />}
                label="Featured Only"
              />
              <ToggleChip
                active={filters.emergency}
                onClick={() => setFilters((f) => ({ ...f, emergency: !f.emergency }))}
                icon={<Phone className="h-3.5 w-3.5" />}
                label="Emergency Line"
              />
              <ToggleChip
                active={filters.financing}
                onClick={() => setFilters((f) => ({ ...f, financing: !f.financing }))}
                icon={<CreditCard className="h-3.5 w-3.5" />}
                label="Financing"
              />
              <ToggleChip
                active={filters.rebates}
                onClick={() => setFilters((f) => ({ ...f, rebates: !f.rebates }))}
                icon={<Gift className="h-3.5 w-3.5" />}
                label="Rebates"
              />
            </div>
          </Card>
        )}
      </div>

      {/* Loading */}
      {state.loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : state.vendors.length === 0 ? (
        <Card className="p-12 text-center">
          <Store className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
          <h3 className="text-lg font-semibold">No vendors found</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Try adjusting your filters or search terms.
          </p>
          <Button variant="outline" className="mt-4" onClick={clearFilters}>
            Clear Filters
          </Button>
        </Card>
      ) : (
        /* Vendor Grid */
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {state.vendors.map((vendor) => (
            <VendorNetworkCard key={vendor.id} vendor={vendor} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Vendor Card ──
function VendorNetworkCard({ vendor }: { vendor: VendorListItem }) {
  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-lg">
      <div className="p-5">
        {/* Badges row */}
        {(vendor.isFeatured || vendor.isVerified) && (
          <div className="mb-2 flex flex-wrap gap-1.5">
            {vendor.isFeatured && (
              <Badge variant="secondary" className="border-amber-200 bg-amber-50 text-amber-700">
                <Star className="mr-1 h-3 w-3" /> Featured
              </Badge>
            )}
            {vendor.isVerified && (
              <Badge variant="secondary" className="border-green-200 bg-green-50 text-green-700">
                <ShieldCheck className="mr-1 h-3 w-3" /> Verified
              </Badge>
            )}
          </div>
        )}

        {/* Header */}
        <div className="mb-3 flex items-start gap-3">
          <VendorLogo logo={vendor.logo} name={vendor.name} size="sm" />
          <div className="min-w-0 flex-1">
            <h3 className="truncate text-base font-semibold">{vendor.name}</h3>
            <p className="text-xs text-muted-foreground">{vendor.category || "Vendor"}</p>
          </div>
        </div>

        {/* Description */}
        {vendor.description && (
          <p className="mb-3 line-clamp-2 text-sm text-muted-foreground">{vendor.description}</p>
        )}

        {/* Product Lines Carried */}
        <div className="mb-3">
          <p className="mb-1.5 text-xs font-medium text-slate-500 dark:text-slate-400">
            Product Lines
          </p>
          <div className="flex flex-wrap gap-1.5">
            {vendor.tradeTypes.slice(0, 4).map((t) => (
              <Badge key={t} variant="outline" className="text-xs">
                {TRADE_ICONS[t] || "🔨"}{" "}
                {TRADE_TYPE_LABELS[t as keyof typeof TRADE_TYPE_LABELS] || t}
              </Badge>
            ))}
            {vendor.tradeTypes.length > 4 && (
              <Badge variant="outline" className="text-xs">
                +{vendor.tradeTypes.length - 4} more
              </Badge>
            )}
          </div>
        </div>

        {/* Vendor Type Badges */}
        <div className="mb-3 flex flex-wrap gap-1.5">
          {vendor.vendorTypes.map((vt) => (
            <span
              key={vt}
              className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary"
            >
              {VENDOR_TYPE_LABELS[vt as keyof typeof VENDOR_TYPE_LABELS] || vt}
            </span>
          ))}
        </div>

        {/* Stats Row */}
        <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
          {vendor.rating && (
            <span className="flex items-center gap-1">
              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              {vendor.rating.toFixed(1)}
            </span>
          )}
          <span className="flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" />
            {vendor.locationCount} locations
          </span>
          <span className="flex items-center gap-1">
            <Package className="h-3.5 w-3.5" />
            {vendor.productCount} products
          </span>
          {vendor.programCount > 0 && (
            <span className="flex items-center gap-1">
              <Award className="h-3.5 w-3.5" />
              {vendor.programCount} programs
            </span>
          )}
        </div>

        {/* Feature Tags */}
        <div className="mb-4 flex flex-wrap gap-1.5">
          {vendor.financingAvail && (
            <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
              <CreditCard className="h-3 w-3" /> Financing
            </span>
          )}
          {vendor.rebatesAvail && (
            <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">
              <Gift className="h-3 w-3" /> Rebates
            </span>
          )}
          {vendor.emergencyPhone && (
            <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">
              <Phone className="h-3 w-3" /> Emergency
            </span>
          )}
          {vendor.certifications.length > 0 && (
            <span className="inline-flex items-center gap-1 rounded bg-purple-50 px-2 py-0.5 text-xs text-purple-700">
              <Award className="h-3 w-3" /> {vendor.certifications[0]}
            </span>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <Link href={`/vendor-network/${vendor.slug}`} className="flex-1">
            <Button size="sm" className="w-full">
              View Details
            </Button>
          </Link>
          {vendor.primaryPhone && (
            <a href={`tel:${vendor.primaryPhone}`} aria-label="Call vendor">
              <Button size="sm" variant="outline">
                <Phone className="h-4 w-4" />
              </Button>
            </a>
          )}
          {vendor.website && (
            <a
              href={vendor.website}
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Visit website"
            >
              <Button size="sm" variant="outline">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </a>
          )}
        </div>
      </div>
    </Card>
  );
}

// ── Toggle Chip ──
function ToggleChip({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
        active
          ? "border-primary bg-primary/10 text-primary"
          : "border-border bg-background hover:bg-accent"
      }`}
    >
      {icon}
      {label}
    </button>
  );
}
