/**
 * AI Recommendations — Full Page View
 * Expanded version of the dashboard AI Job Scanner widget.
 * Shows all recommendations with filtering, sorting, and detailed views.
 */

"use client";

import { useUser } from "@clerk/nextjs";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
  Search,
  Sparkles,
  Target,
  TrendingUp,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

// ── Types ──────────────────────────────────────────────────────────────
interface Recommendation {
  id: string;
  type: "lead" | "claim" | "retail";
  entityId: string;
  entityTitle: string;
  recommendation: string;
  action: string;
  actionUrl: string;
  priority: "high" | "medium" | "low";
  category: "follow_up" | "document" | "schedule" | "scope" | "billing" | "quality";
  createdAt: string;
}

interface Summary {
  total: number;
  high: number;
  medium: number;
  low: number;
}

// ── Static maps ────────────────────────────────────────────────────────
const categoryIcons: Record<string, React.ReactNode> = {
  follow_up: <Bell className="h-5 w-5" />,
  document: <FileText className="h-5 w-5" />,
  schedule: <Calendar className="h-5 w-5" />,
  scope: <Target className="h-5 w-5" />,
  billing: <DollarSign className="h-5 w-5" />,
  quality: <Sparkles className="h-5 w-5" />,
};

const categoryLabels: Record<string, string> = {
  follow_up: "Follow Up",
  document: "Documentation",
  schedule: "Scheduling",
  scope: "Scope & Estimate",
  billing: "Billing",
  quality: "Quality",
};

const typeColors: Record<string, string> = {
  lead: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  claim: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  retail: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const priorityStyles: Record<string, { border: string; bg: string; badge: string }> = {
  high: {
    border: "border-red-200 dark:border-red-800",
    bg: "bg-red-50 dark:bg-red-900/20",
    badge: "bg-red-600 text-white",
  },
  medium: {
    border: "border-amber-200 dark:border-amber-800",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    badge: "bg-amber-500 text-white",
  },
  low: {
    border: "border-slate-200 dark:border-slate-700",
    bg: "bg-slate-50 dark:bg-slate-800/50",
    badge: "bg-slate-500 text-white",
  },
};

// ── Page Component ─────────────────────────────────────────────────────
export default function AIRecommendationsPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterPriority, setFilterPriority] = useState<string>("");
  const [filterType, setFilterType] = useState<string>("");
  const [filterCategory, setFilterCategory] = useState<string>("");

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/ai/job-scanner");
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setSummary(data.summary || null);
      setLastScanned(data.scannedAt || null);
    } catch {
      setError("Unable to load AI recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isLoaded && isSignedIn) void fetchRecommendations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  // ── Filtered + visible recs ─────────────────────────────────────────
  const visible = recommendations
    .filter((r) => !dismissed.has(r.id))
    .filter((r) => !filterPriority || r.priority === filterPriority)
    .filter((r) => !filterType || r.type === filterType)
    .filter((r) => !filterCategory || r.category === filterCategory)
    .filter(
      (r) =>
        !search ||
        r.entityTitle.toLowerCase().includes(search.toLowerCase()) ||
        r.recommendation.toLowerCase().includes(search.toLowerCase())
    );

  const urgentCount = visible.filter((r) => r.priority === "high").length;
  const mediumCount = visible.filter((r) => r.priority === "medium").length;
  const lowCount = visible.filter((r) => r.priority === "low").length;

  const hasFilters = !!(search || filterPriority || filterType || filterCategory);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="flex min-h-[600px] items-center justify-center">
        <Loader2 className="h-12 w-12 animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="AI Recommendations"
        subtitle="Smart insights across all your claims, leads, and retail jobs"
        icon={<Sparkles className="h-5 w-5" />}
      >
        <div className="flex items-center gap-2">
          {lastScanned && (
            <span className="flex items-center gap-1 text-xs text-slate-500">
              <Clock className="h-3 w-3" />
              Scanned {new Date(lastScanned).toLocaleTimeString()}
            </span>
          )}
          <Button onClick={fetchRecommendations} variant="outline" size="sm" disabled={loading}>
            {loading ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1 h-4 w-4" />
            )}
            Rescan
          </Button>
        </div>
      </PageHero>

      {/* ── Summary Cards ──────────────────────────────────────────── */}
      {summary && (
        <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-4">
          <SummaryCard
            label="Total"
            value={summary.total}
            color="indigo"
            icon={<TrendingUp className="h-5 w-5" />}
          />
          <SummaryCard
            label="Urgent"
            value={summary.high}
            color="red"
            icon={<AlertCircle className="h-5 w-5" />}
          />
          <SummaryCard
            label="Medium"
            value={summary.medium}
            color="amber"
            icon={<Clock className="h-5 w-5" />}
          />
          <SummaryCard
            label="Low"
            value={summary.low}
            color="slate"
            icon={<CheckCircle2 className="h-5 w-5" />}
          />
        </div>
      )}

      {/* ── Filters ────────────────────────────────────────────────── */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[200px] flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search recommendations…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-1">
              <Filter className="h-4 w-4 text-slate-400" />
              {["high", "medium", "low"].map((p) => (
                <button
                  key={p}
                  onClick={() => setFilterPriority(filterPriority === p ? "" : p)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filterPriority === p
                      ? priorityStyles[p].badge
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {p === "high" ? "Urgent" : p === "medium" ? "Medium" : "Low"}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1">
              {["claim", "lead", "retail"].map((t) => (
                <button
                  key={t}
                  onClick={() => setFilterType(filterType === t ? "" : t)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filterType === t
                      ? typeColors[t]
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}s
                </button>
              ))}
            </div>

            <div className="flex flex-wrap items-center gap-1">
              {Object.entries(categoryLabels).map(([key, label]) => (
                <button
                  key={key}
                  onClick={() => setFilterCategory(filterCategory === key ? "" : key)}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                    filterCategory === key
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setSearch("");
                  setFilterPriority("");
                  setFilterType("");
                  setFilterCategory("");
                }}
              >
                <X className="mr-1 h-3 w-3" /> Clear
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Error ──────────────────────────────────────────────────── */}
      {error && (
        <Card className="mb-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
          <CardContent className="flex items-center justify-between py-4">
            <div className="flex items-center gap-2 text-red-600">
              <AlertCircle className="h-5 w-5" />
              {error}
            </div>
            <Button variant="ghost" size="sm" onClick={fetchRecommendations}>
              <RefreshCw className="mr-1 h-4 w-4" /> Retry
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Loading ────────────────────────────────────────────────── */}
      {loading && (
        <div className="flex min-h-[300px] items-center justify-center">
          <div className="text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-indigo-500" />
            <p className="mt-3 text-sm text-slate-500">Scanning your jobs…</p>
          </div>
        </div>
      )}

      {/* ── Empty state ────────────────────────────────────────────── */}
      {!loading && visible.length === 0 && (
        <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950/50 dark:to-emerald-950/50">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <CheckCircle2 className="mb-4 h-16 w-16 text-green-600" />
            <h3 className="text-xl font-semibold text-green-800 dark:text-green-200">
              {hasFilters ? "No matching recommendations" : "All caught up!"}
            </h3>
            <p className="mt-2 text-sm text-green-600 dark:text-green-400">
              {hasFilters
                ? "Try adjusting your filters to see more results."
                : "No urgent recommendations at this time. Great work!"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              className="mt-4 text-green-700"
              onClick={fetchRecommendations}
            >
              <RefreshCw className="mr-1 h-4 w-4" /> Scan Again
            </Button>
          </CardContent>
        </Card>
      )}

      {/* ── Recommendation Cards ───────────────────────────────────── */}
      {!loading && visible.length > 0 && (
        <div className="space-y-6">
          {urgentCount > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-red-700 dark:text-red-400">
                <AlertCircle className="h-5 w-5" />
                Urgent ({urgentCount})
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {visible
                  .filter((r) => r.priority === "high")
                  .map((rec) => (
                    <RecommendationCard key={rec.id} rec={rec} onDismiss={handleDismiss} />
                  ))}
              </div>
            </section>
          )}

          {mediumCount > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-amber-700 dark:text-amber-400">
                <Clock className="h-5 w-5" />
                Medium Priority ({mediumCount})
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {visible
                  .filter((r) => r.priority === "medium")
                  .map((rec) => (
                    <RecommendationCard key={rec.id} rec={rec} onDismiss={handleDismiss} />
                  ))}
              </div>
            </section>
          )}

          {lowCount > 0 && (
            <section>
              <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-slate-600 dark:text-slate-400">
                <CheckCircle2 className="h-5 w-5" />
                Low Priority ({lowCount})
              </h2>
              <div className="grid gap-3 md:grid-cols-2">
                {visible
                  .filter((r) => r.priority === "low")
                  .map((rec) => (
                    <RecommendationCard key={rec.id} rec={rec} onDismiss={handleDismiss} />
                  ))}
              </div>
            </section>
          )}
        </div>
      )}
    </PageContainer>
  );
}

// ── Summary Card ──────────────────────────────────────────────────────
function SummaryCard({
  label,
  value,
  color,
  icon,
}: {
  label: string;
  value: number;
  color: string;
  icon: React.ReactNode;
}) {
  const colorMap: Record<string, string> = {
    indigo: "from-indigo-500 to-purple-500 text-indigo-600",
    red: "from-red-500 to-rose-500 text-red-600",
    amber: "from-amber-500 to-yellow-500 text-amber-600",
    slate: "from-slate-400 to-gray-500 text-slate-600",
  };
  const g = colorMap[color] || colorMap.indigo;
  const textColor = g.split(" ").pop();

  return (
    <Card className="overflow-hidden">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
            <p className={`text-3xl font-bold ${textColor}`}>{value}</p>
          </div>
          <div className={`rounded-xl bg-gradient-to-br ${g.split("text")[0]} p-3 text-white`}>
            {icon}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Recommendation Card ───────────────────────────────────────────────
function RecommendationCard({
  rec,
  onDismiss,
}: {
  rec: Recommendation;
  onDismiss: (id: string) => void;
}) {
  const style = priorityStyles[rec.priority];

  return (
    <Card className={`relative transition-all hover:shadow-md ${style.border} ${style.bg}`}>
      <CardContent className="p-5">
        <button
          onClick={() => onDismiss(rec.id)}
          className="absolute right-3 top-3 rounded-full p-1 text-slate-400 transition hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
          title="Dismiss"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="mb-3 flex items-start gap-3 pr-8">
          <div className="mt-0.5 rounded-lg bg-indigo-100 p-2 text-indigo-600 dark:bg-indigo-900/40 dark:text-indigo-400">
            {categoryIcons[rec.category]}
          </div>
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <Badge className={`text-xs ${typeColors[rec.type]}`}>
                {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}
              </Badge>
              <Badge className={`text-xs ${style.badge}`}>
                {rec.priority === "high" ? "Urgent" : rec.priority === "medium" ? "Medium" : "Low"}
              </Badge>
              <Badge variant="outline" className="text-xs">
                {categoryLabels[rec.category]}
              </Badge>
            </div>
            <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              {rec.entityTitle}
            </h3>
          </div>
        </div>

        <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-400">
          {rec.recommendation}
        </p>

        <div className="flex items-center justify-between">
          <span className="text-xs text-slate-400">
            {new Date(rec.createdAt).toLocaleDateString()}
          </span>
          <Link href={rec.actionUrl}>
            <Button size="sm" className="gap-1">
              {rec.action}
              <ArrowRight className="h-3 w-3" />
            </Button>
          </Link>
        </div>
      </CardContent>
    </Card>
  );
}
