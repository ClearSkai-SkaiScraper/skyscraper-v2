/**
 * Client Products Page — Browse Manufacturer Products & Catalogs
 * Shows all manufacturers from VIN with their brochures, product catalogs,
 * and spec sheets. Clients can browse materials, add items to a Design Board,
 * and export a PDF to send to their pro for material selection.
 */

"use client";

import { useUser } from "@clerk/nextjs";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  Download,
  ExternalLink,
  FileText,
  Filter,
  Loader2,
  Package,
  Palette,
  Plus,
  Search,
  ShoppingBag,
  Sparkles,
  Star,
  Trash2,
  X,
} from "lucide-react";
import Image from "next/image";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────
interface Product {
  id: string;
  name: string;
  category: string | null;
  description: string | null;
  brochureUrl: string | null;
  specSheetUrl: string | null;
  warrantyUrl: string | null;
  priceRangeLow: number | null;
  priceRangeHigh: number | null;
  unit: string;
  inStock: boolean;
  features: string[];
  imageUrl: string | null;
  tradeType: string;
  sku: string | null;
  manufacturer: string | null;
}

interface Asset {
  id: string;
  type: string;
  title: string;
  description: string | null;
  pdfUrl: string;
  fileSize: string | null;
  tradeType: string | null;
  downloads: number;
  format?: string;
}

interface Manufacturer {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  logo: string | null;
  website: string | null;
  category: string | null;
  tradeTypes: string[];
  vendorTypes: string[];
  isFeatured: boolean;
  isVerified: boolean;
  rating: number | null;
  reviewCount: number;
  certifications: string[];
  products: Product[];
  assets: Asset[];
  productCount: number;
  assetCount: number;
}

interface DesignBoardItem {
  id: string;
  productId: string;
  productName: string;
  manufacturer: string;
  category: string | null;
  imageUrl: string | null;
  priceRange: string | null;
  notes: string;
  addedAt: string;
}

// ── Trade labels ───────────────────────────────────────────────────────
const TRADE_LABELS: Record<string, string> = {
  roofing: "🏠 Roofing",
  plumbing: "🔧 Plumbing",
  electrical: "⚡ Electrical",
  hvac: "❄️ HVAC",
  concrete: "🧱 Concrete",
  drywall: "🪨 Drywall",
  framing: "🪵 Framing",
  painting: "🎨 Painting",
  flooring: "🪵 Flooring",
  landscaping: "🌿 Landscaping",
  windows: "🪟 Windows",
  doors: "🚪 Doors",
  windows_doors: "🪟 Windows & Doors",
  solar: "☀️ Solar",
  insulation: "🧊 Insulation",
  restoration: "🔄 Restoration",
  water_damage: "💧 Water Damage",
  water_mold: "💧 Water/Mold",
  mold: "🦠 Mold Remediation",
  fire: "🔥 Fire Damage",
  pools: "🏊 Pools & Spas",
  fencing: "🏗️ Fencing",
  decking: "🪵 Decking",
  foundation: "🏗️ Foundation",
  stucco: "🏠 Stucco",
  siding: "🏠 Siding",
  gutters: "🌧️ Gutters",
  cabinets: "🗄️ Cabinets",
  countertops: "🪨 Countertops",
  appliances: "🏭 Appliances",
  demolition: "💥 Demolition",
  excavation: "🚜 Excavation",
  masonry: "🧱 Masonry",
  tile: "🔲 Tile",
  general_contractor: "👷 General",
};

const ASSET_ICONS: Record<string, string> = {
  brochure: "📄",
  catalog: "📚",
  spec_sheet: "📋",
  install_guide: "🔧",
  flyer: "📰",
  pitch_deck: "📊",
  warranty_doc: "🛡️",
  training_video: "🎬",
  msds: "⚠️",
  code_doc: "📜",
};

// ── Component ──────────────────────────────────────────────────────────
export default function ProductsPage() {
  const { user } = useUser();
  const [manufacturers, setManufacturers] = useState<Manufacturer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [filterTrade, setFilterTrade] = useState("");
  const [expandedMfr, setExpandedMfr] = useState<Set<string>>(new Set());
  const [designBoard, setDesignBoard] = useState<DesignBoardItem[]>([]);
  const [showBoard, setShowBoard] = useState(false);
  const [boardName, setBoardName] = useState("My Material Selections");
  const [stats, setStats] = useState<{
    total: number;
    totalProducts: number;
    totalAssets: number;
    tradeDistribution: Record<string, number>;
  } | null>(null);

  // Load design board from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("designBoard");
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setDesignBoard(parsed.items || []);
        setBoardName(parsed.name || "My Material Selections");
      } catch {
        /* ignore */
      }
    }
  }, []);

  // Save design board to localStorage
  useEffect(() => {
    if (designBoard.length > 0) {
      localStorage.setItem("designBoard", JSON.stringify({ name: boardName, items: designBoard }));
    }
  }, [designBoard, boardName]);

  const fetchManufacturers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.set("q", search);
      if (filterTrade) params.set("trade", filterTrade);
      params.set("limit", "100");

      const res = await fetch(`/api/portal/products?${params}`);
      const data = await res.json();
      if (data.success) {
        setManufacturers(data.manufacturers || []);
        setStats(data.stats || null);
      }
    } catch {
      toast.error("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const debounce = setTimeout(fetchManufacturers, 300);
    return () => clearTimeout(debounce);
  }, [search, filterTrade]);

  const toggleExpand = (id: string) => {
    setExpandedMfr((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const addToBoard = (product: Product, mfrName: string) => {
    if (designBoard.some((i) => i.productId === product.id)) {
      toast.info("Already in your design board");
      return;
    }
    const priceRange =
      product.priceRangeLow && product.priceRangeHigh
        ? `$${product.priceRangeLow.toLocaleString()} – $${product.priceRangeHigh.toLocaleString()} / ${product.unit}`
        : product.priceRangeLow
          ? `From $${product.priceRangeLow.toLocaleString()} / ${product.unit}`
          : null;

    setDesignBoard((prev) => [
      ...prev,
      {
        id: `item_${Date.now()}`,
        productId: product.id,
        productName: product.name,
        manufacturer: mfrName,
        category: product.category,
        imageUrl: product.imageUrl,
        priceRange,
        notes: "",
        addedAt: new Date().toISOString(),
      },
    ]);
    toast.success(`Added "${product.name}" to design board`);
  };

  const removeFromBoard = (id: string) => {
    setDesignBoard((prev) => prev.filter((i) => i.id !== id));
    toast.info("Removed from design board");
  };

  const updateItemNotes = (id: string, notes: string) => {
    setDesignBoard((prev) => prev.map((i) => (i.id === id ? { ...i, notes } : i)));
  };

  // ── Export PDF ───────────────────────────────────────────────────────
  const exportPDF = async () => {
    if (designBoard.length === 0) {
      toast.error("Add items to your design board first");
      return;
    }

    toast.loading("Generating PDF...", { id: "pdf-export" });

    try {
      // Dynamically import jsPDF and autotable for code splitting
      const [{ jsPDF }, autoTable] = await Promise.all([
        import("jspdf"),
        import("jspdf-autotable"),
      ]);

      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();

      // Header
      doc.setFillColor(14, 165, 233); // sky-500
      doc.rect(0, 0, pageWidth, 35, "F");

      doc.setTextColor(255, 255, 255);
      doc.setFontSize(10);
      doc.text("SkaiScrape — Material Selection Sheet", 14, 15);

      doc.setFontSize(18);
      doc.setFont("helvetica", "bold");
      doc.text(boardName, 14, 26);

      // Metadata line
      doc.setTextColor(100);
      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      const dateStr = new Date().toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      });
      doc.text(`Prepared by ${user?.fullName || "Client"} • ${dateStr}`, 14, 45);

      // Summary box
      doc.setFillColor(240, 249, 255); // sky-50
      doc.setDrawColor(186, 230, 253); // sky-200
      doc.roundedRect(14, 52, pageWidth - 28, 18, 3, 3, "FD");
      doc.setTextColor(3, 105, 161); // sky-700
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.text("Summary", 20, 62);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(60);
      const uniqueManufacturers = new Set(designBoard.map((i) => i.manufacturer)).size;
      doc.text(
        `${designBoard.length} items selected from ${uniqueManufacturers} manufacturers`,
        20,
        67
      );

      // Table with autotable
      const tableData = designBoard.map((item, i) => [
        (i + 1).toString(),
        `${item.productName}\n${item.manufacturer}`,
        item.category || "—",
        item.priceRange || "Contact for pricing",
        item.notes || "—",
      ]);

      (autoTable as unknown as { default: typeof autoTable.default }).default(doc, {
        startY: 78,
        head: [["#", "Product / Manufacturer", "Category", "Est. Price", "Notes"]],
        body: tableData,
        theme: "striped",
        headStyles: {
          fillColor: [241, 245, 249], // slate-100
          textColor: [71, 85, 105], // slate-600
          fontStyle: "bold",
          fontSize: 9,
        },
        bodyStyles: {
          fontSize: 9,
          cellPadding: 4,
        },
        alternateRowStyles: {
          fillColor: [248, 250, 252], // slate-50
        },
        columnStyles: {
          0: { cellWidth: 10, halign: "center" },
          1: { cellWidth: 55 },
          2: { cellWidth: 30 },
          3: { cellWidth: 35, textColor: [5, 150, 105] }, // emerald-600
          4: { cellWidth: 50, fontStyle: "italic", textColor: [100, 116, 139] },
        },
        margin: { left: 14, right: 14 },
      });

      // Footer
      const finalY =
        (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable?.finalY || 200;
      doc.setDrawColor(226, 232, 240); // slate-200
      doc.line(14, finalY + 10, pageWidth - 14, finalY + 10);
      doc.setFontSize(9);
      doc.setTextColor(148, 163, 184); // slate-400
      doc.text(
        `Generated via SkaiScrape Products — ${new Date().toLocaleString()}`,
        14,
        finalY + 18
      );
      doc.text(
        "Share this with your contractor for material ordering assistance.",
        14,
        finalY + 24
      );

      // Save the PDF
      doc.save(`${boardName.replace(/[^a-z0-9]/gi, "_")}_${Date.now()}.pdf`);
      toast.success("PDF downloaded successfully!", { id: "pdf-export" });
    } catch (error) {
      console.error("PDF export error:", error);
      toast.error("Failed to generate PDF. Please try again.", { id: "pdf-export" });
    }
  };

  // ── Available trade filters based on loaded data ────────────────────
  const availableTrades = stats?.tradeDistribution
    ? Object.entries(stats.tradeDistribution)
        .sort(([, a], [, b]) => b - a)
        .map(([key, count]) => ({ key, count, label: TRADE_LABELS[key] || key }))
    : [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white pb-20 dark:from-slate-950 dark:to-slate-900">
      {/* ── Hero ─────────────────────────────────────────────────── */}
      <div className="relative overflow-hidden bg-gradient-to-r from-teal-600 via-emerald-600 to-cyan-600 px-4 py-10 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="relative mx-auto max-w-6xl">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-white/20 p-3 backdrop-blur-sm">
              <Package className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Products & Materials</h1>
              <p className="mt-1 text-teal-100">
                Browse manufacturer catalogs, find materials for your project, and build a design
                board to share with your pro
              </p>
            </div>
          </div>

          {/* Stats row */}
          {stats && (
            <div className="mt-6 flex flex-wrap gap-6">
              <div className="flex items-center gap-2 text-teal-100">
                <ShoppingBag className="h-4 w-4" />
                <span className="font-semibold text-white">{stats.total}</span> Manufacturers
              </div>
              <div className="flex items-center gap-2 text-teal-100">
                <Package className="h-4 w-4" />
                <span className="font-semibold text-white">{stats.totalProducts}</span> Products
              </div>
              <div className="flex items-center gap-2 text-teal-100">
                <FileText className="h-4 w-4" />
                <span className="font-semibold text-white">{stats.totalAssets}</span> Brochures &
                Docs
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4 pt-6">
        {/* ── Design Board Toggle ──────────────────────────────────── */}
        <div className="mb-4 flex items-center justify-between">
          <Button
            variant={showBoard ? "default" : "outline"}
            onClick={() => setShowBoard(!showBoard)}
            className="gap-2"
          >
            <Palette className="h-4 w-4" />
            Design Board
            {designBoard.length > 0 && (
              <Badge className="ml-1 bg-emerald-600 text-white">{designBoard.length}</Badge>
            )}
          </Button>
          {designBoard.length > 0 && (
            <Button variant="outline" size="sm" onClick={exportPDF} className="gap-1">
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          )}
        </div>

        {/* ── Design Board Panel ───────────────────────────────────── */}
        {showBoard && (
          <Card className="mb-6 border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50 dark:border-emerald-800 dark:from-emerald-950/30 dark:to-teal-950/30">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Palette className="h-5 w-5 text-emerald-600" />
                  <Input
                    value={boardName}
                    onChange={(e) => setBoardName(e.target.value)}
                    className="h-8 border-none bg-transparent text-lg font-semibold shadow-none focus-visible:ring-0"
                    placeholder="Board name…"
                  />
                </div>
                <Button variant="ghost" size="sm" onClick={() => setShowBoard(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {designBoard.length === 0 ? (
                <div className="py-8 text-center text-emerald-600">
                  <Sparkles className="mx-auto mb-2 h-8 w-8" />
                  <p className="font-medium">Your design board is empty</p>
                  <p className="mt-1 text-sm text-emerald-500">
                    Browse products below and click the + button to add items
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {designBoard.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-start gap-3 rounded-lg border border-emerald-200 bg-white p-3 dark:border-emerald-800 dark:bg-slate-900"
                    >
                      {item.imageUrl ? (
                        <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded-lg border">
                          <Image
                            src={item.imageUrl}
                            alt={item.productName}
                            fill
                            className="object-cover"
                          />
                        </div>
                      ) : (
                        <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-emerald-100 to-teal-100 dark:from-emerald-900 dark:to-teal-900">
                          <Package className="h-6 w-6 text-emerald-600" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <h4 className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.productName}
                        </h4>
                        <p className="text-xs text-slate-500">{item.manufacturer}</p>
                        {item.priceRange && (
                          <p className="mt-0.5 text-xs font-medium text-emerald-600">
                            {item.priceRange}
                          </p>
                        )}
                        <Input
                          placeholder="Add notes for your pro…"
                          value={item.notes}
                          onChange={(e) => updateItemNotes(item.id, e.target.value)}
                          className="mt-2 h-7 text-xs"
                        />
                      </div>
                      <button
                        onClick={() => removeFromBoard(item.id)}
                        className="flex-shrink-0 rounded-full p-1 text-slate-400 transition hover:bg-red-100 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}

                  <div className="flex items-center justify-between border-t border-emerald-200 pt-3 dark:border-emerald-800">
                    <span className="text-sm text-slate-500">
                      {designBoard.length} items from{" "}
                      {new Set(designBoard.map((i) => i.manufacturer)).size} manufacturers
                    </span>
                    <Button
                      size="sm"
                      onClick={exportPDF}
                      className="gap-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      <Download className="h-4 w-4" />
                      Download PDF
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* ── Search & Filters ─────────────────────────────────────── */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Search manufacturers, products, materials…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>

              <div className="flex flex-wrap items-center gap-1">
                <Filter className="h-4 w-4 text-slate-400" />
                {availableTrades.slice(0, 12).map(({ key, count, label }) => (
                  <button
                    key={key}
                    onClick={() => setFilterTrade(filterTrade === key ? "" : key)}
                    className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                      filterTrade === key
                        ? "bg-teal-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                    }`}
                  >
                    {label} ({count})
                  </button>
                ))}
              </div>

              {(search || filterTrade) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSearch("");
                    setFilterTrade("");
                  }}
                >
                  <X className="mr-1 h-3 w-3" /> Clear
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* ── Loading ──────────────────────────────────────────────── */}
        {loading && (
          <div className="flex min-h-[300px] items-center justify-center">
            <div className="text-center">
              <Loader2 className="mx-auto h-10 w-10 animate-spin text-teal-500" />
              <p className="mt-3 text-sm text-slate-500">Loading manufacturers…</p>
            </div>
          </div>
        )}

        {/* ── Empty ────────────────────────────────────────────────── */}
        {!loading && manufacturers.length === 0 && (
          <Card className="border-slate-200 dark:border-slate-700">
            <CardContent className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="mb-4 h-16 w-16 text-slate-300" />
              <h3 className="text-xl font-semibold text-slate-600 dark:text-slate-300">
                No manufacturers found
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                {search || filterTrade
                  ? "Try adjusting your search or filters."
                  : "Manufacturers will appear here as they're added to the network."}
              </p>
            </CardContent>
          </Card>
        )}

        {/* ── Manufacturer Cards ───────────────────────────────────── */}
        {!loading && manufacturers.length > 0 && (
          <div className="space-y-4">
            {manufacturers.map((mfr) => {
              const isExpanded = expandedMfr.has(mfr.id);
              return (
                <Card key={mfr.id} className="overflow-hidden transition-all hover:shadow-md">
                  {/* Header */}
                  <button
                    onClick={() => toggleExpand(mfr.id)}
                    className="flex w-full items-center gap-4 p-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
                  >
                    {/* Logo */}
                    {mfr.logo ? (
                      <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-xl border bg-white">
                        <Image src={mfr.logo} alt={mfr.name} fill className="object-contain p-1" />
                      </div>
                    ) : (
                      <div className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-emerald-600 text-xl font-bold text-white">
                        {mfr.name.charAt(0)}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                          {mfr.name}
                        </h3>
                        {mfr.isFeatured && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300">
                            <Star className="mr-1 h-3 w-3" /> Featured
                          </Badge>
                        )}
                        {mfr.isVerified && (
                          <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300">
                            ✓ Verified
                          </Badge>
                        )}
                      </div>
                      {mfr.description && (
                        <p className="mt-0.5 line-clamp-1 text-sm text-slate-500">
                          {mfr.description}
                        </p>
                      )}
                      <div className="mt-1 flex flex-wrap items-center gap-2">
                        {mfr.tradeTypes.slice(0, 5).map((t) => (
                          <span key={t} className="text-xs text-slate-400">
                            {TRADE_LABELS[t] || t}
                          </span>
                        ))}
                        {mfr.tradeTypes.length > 5 && (
                          <span className="text-xs text-slate-400">
                            +{mfr.tradeTypes.length - 5} more
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 text-sm text-slate-400">
                      <span className="flex items-center gap-1">
                        <Package className="h-4 w-4" /> {mfr.productCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <FileText className="h-4 w-4" /> {mfr.assetCount}
                      </span>
                      {isExpanded ? (
                        <ChevronDown className="h-5 w-5" />
                      ) : (
                        <ChevronRight className="h-5 w-5" />
                      )}
                    </div>
                  </button>

                  {/* Expanded content */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/50 dark:border-slate-700 dark:bg-slate-800/30">
                      {/* Website link */}
                      {mfr.website && (
                        <div className="border-b border-slate-200 px-5 py-2 dark:border-slate-700">
                          <a
                            href={mfr.website}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1 text-sm text-teal-600 hover:underline"
                          >
                            <ExternalLink className="h-3 w-3" /> Visit {mfr.name} website
                          </a>
                        </div>
                      )}

                      {/* Products */}
                      {mfr.products.length > 0 && (
                        <div className="p-5">
                          <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                            <Package className="h-4 w-4 text-teal-600" />
                            Products ({mfr.products.length})
                          </h4>
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {mfr.products.map((product) => (
                              <div
                                key={product.id}
                                className="group relative rounded-xl border bg-white p-4 transition-all hover:shadow-sm dark:bg-slate-900"
                              >
                                {product.imageUrl ? (
                                  <div className="relative mb-3 h-32 w-full overflow-hidden rounded-lg border bg-slate-50">
                                    <Image
                                      src={product.imageUrl}
                                      alt={product.name}
                                      fill
                                      className="object-contain p-2"
                                    />
                                  </div>
                                ) : (
                                  <div className="mb-3 flex h-32 w-full items-center justify-center rounded-lg bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-700">
                                    <Package className="h-10 w-10 text-slate-300" />
                                  </div>
                                )}

                                <h5 className="font-semibold text-slate-900 dark:text-white">
                                  {product.name}
                                </h5>
                                {product.category && (
                                  <p className="text-xs text-slate-400">{product.category}</p>
                                )}
                                {product.description && (
                                  <p className="mt-1 line-clamp-2 text-xs text-slate-500">
                                    {product.description}
                                  </p>
                                )}

                                {(product.priceRangeLow || product.priceRangeHigh) && (
                                  <p className="mt-2 text-sm font-medium text-emerald-600">
                                    {product.priceRangeLow && product.priceRangeHigh
                                      ? `$${product.priceRangeLow.toLocaleString()} – $${product.priceRangeHigh.toLocaleString()}`
                                      : `From $${(product.priceRangeLow || product.priceRangeHigh)?.toLocaleString()}`}
                                    <span className="text-xs text-slate-400">
                                      {" "}
                                      / {product.unit}
                                    </span>
                                  </p>
                                )}

                                {product.features.length > 0 && (
                                  <div className="mt-2 flex flex-wrap gap-1">
                                    {product.features.slice(0, 3).map((f, i) => (
                                      <Badge key={i} variant="outline" className="text-xs">
                                        {f}
                                      </Badge>
                                    ))}
                                  </div>
                                )}

                                {/* Actions */}
                                <div className="mt-3 flex flex-wrap items-center gap-1.5">
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    className="h-7 gap-1 text-xs"
                                    onClick={() => addToBoard(product, mfr.name)}
                                  >
                                    <Plus className="h-3 w-3" /> Add to Board
                                  </Button>
                                  {product.brochureUrl && (
                                    <a
                                      href={product.brochureUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 gap-1 text-xs"
                                      >
                                        <BookOpen className="h-3 w-3" /> Brochure
                                      </Button>
                                    </a>
                                  )}
                                  {product.specSheetUrl && (
                                    <a
                                      href={product.specSheetUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                    >
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="h-7 gap-1 text-xs"
                                      >
                                        <FileText className="h-3 w-3" /> Specs
                                      </Button>
                                    </a>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Assets / Brochures */}
                      {mfr.assets.length > 0 && (
                        <div className="border-t border-slate-200 p-5 dark:border-slate-700">
                          <h4 className="mb-3 flex items-center gap-2 font-semibold text-slate-700 dark:text-slate-200">
                            <FileText className="h-4 w-4 text-teal-600" />
                            Brochures & Documents ({mfr.assets.length})
                          </h4>
                          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                            {mfr.assets.map((asset) => (
                              <a
                                key={asset.id}
                                href={asset.pdfUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-3 rounded-lg border bg-white p-3 transition-all hover:border-teal-300 hover:shadow-sm dark:bg-slate-900 dark:hover:border-teal-700"
                              >
                                <span className="text-2xl">{ASSET_ICONS[asset.type] || "📄"}</span>
                                <div className="min-w-0 flex-1">
                                  <h5 className="truncate text-sm font-medium text-slate-900 dark:text-white">
                                    {asset.title}
                                  </h5>
                                  <div className="flex items-center gap-2 text-xs text-slate-400">
                                    <span className="capitalize">
                                      {asset.type.replace("_", " ")}
                                    </span>
                                    {asset.format === "WEB" && (
                                      <Badge
                                        variant="outline"
                                        className="border-blue-300 px-1 py-0 text-[10px] text-blue-500"
                                      >
                                        Web
                                      </Badge>
                                    )}
                                    {asset.fileSize && <span>• {asset.fileSize}</span>}
                                    {asset.downloads > 0 && (
                                      <span>• {asset.downloads} downloads</span>
                                    )}
                                  </div>
                                </div>
                                {asset.format === "WEB" ? (
                                  <ExternalLink className="h-4 w-4 flex-shrink-0 text-blue-400" />
                                ) : (
                                  <Download className="h-4 w-4 flex-shrink-0 text-slate-400" />
                                )}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {mfr.products.length === 0 && mfr.assets.length === 0 && (
                        <div className="py-8 text-center text-slate-400">
                          <Package className="mx-auto mb-2 h-8 w-8" />
                          <p>No products or documents listed yet</p>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
