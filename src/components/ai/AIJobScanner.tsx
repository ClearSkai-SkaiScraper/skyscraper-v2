"use client";

import { logger } from "@/lib/logger";
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Calendar,
  CheckCircle2,
  Clock,
  DollarSign,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
  Target,
  X,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

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

const categoryIcons: Record<string, React.ReactNode> = {
  follow_up: <Bell className="h-4 w-4" />,
  document: <FileText className="h-4 w-4" />,
  schedule: <Calendar className="h-4 w-4" />,
  scope: <Target className="h-4 w-4" />,
  billing: <DollarSign className="h-4 w-4" />,
  quality: <Sparkles className="h-4 w-4" />,
};

const typeColors: Record<string, string> = {
  lead: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  claim: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  retail: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
};

const priorityColors: Record<string, string> = {
  high: "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-900/20",
  medium: "border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20",
  low: "border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/50",
};

export function AIJobScanner() {
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const [lastScanned, setLastScanned] = useState<string | null>(null);

  const fetchRecommendations = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/ai/job-scanner");

      if (!res.ok) {
        throw new Error("Failed to fetch recommendations");
      }

      const data = await res.json();
      setRecommendations(data.recommendations || []);
      setSummary(data.summary || null);
      setLastScanned(data.scannedAt || null);
    } catch (err) {
      logger.error("AI Job Scanner error:", err);
      setError("Unable to load AI recommendations");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRecommendations();
    // Refresh every 5 minutes
    const interval = setInterval(fetchRecommendations, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id: string) => {
    setDismissed((prev) => new Set(prev).add(id));
  };

  const visibleRecommendations = recommendations.filter((r) => !dismissed.has(r.id));
  const highPriority = visibleRecommendations.filter((r) => r.priority === "high");

  if (loading) {
    return (
      <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 dark:border-indigo-800 dark:from-indigo-950/50 dark:to-purple-950/50">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            AI Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-slate-500">
            <Loader2 className="h-5 w-5 animate-spin" />
            Scanning your jobs...
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className="border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/50">
        <CardContent className="flex items-center justify-between py-4">
          <div className="flex items-center gap-2 text-red-600">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
          <Button variant="ghost" size="sm" onClick={fetchRecommendations}>
            <RefreshCw className="mr-1 h-4 w-4" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (visibleRecommendations.length === 0) {
    return (
      <Card className="border-green-200 bg-gradient-to-br from-green-50 to-emerald-50 dark:border-green-800 dark:from-green-950/50 dark:to-emerald-950/50">
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <CheckCircle2 className="mb-3 h-12 w-12 text-green-600" />
          <h3 className="font-semibold text-green-800 dark:text-green-200">All caught up!</h3>
          <p className="mt-1 text-sm text-green-600 dark:text-green-400">
            No urgent recommendations at this time.
          </p>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-green-700"
            onClick={fetchRecommendations}
          >
            <RefreshCw className="mr-1 h-4 w-4" />
            Scan Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 bg-gradient-to-br from-indigo-50 to-purple-50 dark:border-indigo-800 dark:from-indigo-950/50 dark:to-purple-950/50">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-5 w-5 text-indigo-600" />
            AI Recommendations
          </CardTitle>
          <div className="flex items-center gap-2">
            {summary && (
              <div className="flex items-center gap-1 text-xs">
                {summary.high > 0 && (
                  <Badge variant="destructive" className="px-1.5 text-xs">
                    {summary.high} urgent
                  </Badge>
                )}
                {summary.medium > 0 && (
                  <Badge variant="secondary" className="bg-amber-100 px-1.5 text-xs text-amber-700">
                    {summary.medium} medium
                  </Badge>
                )}
              </div>
            )}
            <Link href="/ai/smart-actions">
              <Button variant="outline" size="sm" className="h-7 gap-1 text-xs">
                View All
                <ArrowRight className="h-3 w-3" />
              </Button>
            </Link>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={fetchRecommendations}>
              <RefreshCw className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
        {lastScanned && (
          <p className="flex items-center gap-1 text-xs text-slate-500">
            <Clock className="h-3 w-3" />
            Last scanned: {new Date(lastScanned).toLocaleTimeString()}
          </p>
        )}
      </CardHeader>

      <CardContent className="pt-0">
        <ScrollArea className="h-[320px] pr-3">
          <div className="space-y-2">
            {visibleRecommendations.map((rec) => (
              <div
                key={rec.id}
                className={`relative rounded-lg border p-3 transition-all hover:shadow-sm ${priorityColors[rec.priority]}`}
              >
                {/* Dismiss button */}
                <button
                  onClick={() => handleDismiss(rec.id)}
                  className="absolute right-2 top-2 text-slate-400 hover:text-slate-600"
                  title="Dismiss recommendation"
                  aria-label="Dismiss recommendation"
                >
                  <X className="h-4 w-4" />
                </button>

                {/* Header */}
                <div className="flex items-start gap-2 pr-6">
                  <div className="mt-0.5 text-indigo-600">{categoryIcons[rec.category]}</div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <Badge className={`text-xs ${typeColors[rec.type]}`}>
                        {rec.type.charAt(0).toUpperCase() + rec.type.slice(1)}
                      </Badge>
                      <span className="truncate text-sm font-medium text-slate-900 dark:text-slate-100">
                        {rec.entityTitle}
                      </span>
                    </div>
                    <p className="text-xs leading-relaxed text-slate-600 dark:text-slate-400">
                      {rec.recommendation}
                    </p>
                  </div>
                </div>

                {/* Action */}
                <div className="mt-2 flex justify-end">
                  <Link href={rec.actionUrl}>
                    <Button size="sm" className="h-7 gap-1 text-xs">
                      {rec.action}
                      <ArrowRight className="h-3 w-3" />
                    </Button>
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        {/* Footer Stats */}
        <div className="mt-3 border-t border-indigo-200 pt-3 dark:border-indigo-700">
          <div className="flex items-center justify-between">
            {summary && summary.total > visibleRecommendations.length ? (
              <p className="text-xs text-slate-500">
                Showing {visibleRecommendations.length} of {summary.total} recommendations
              </p>
            ) : (
              <p className="text-xs text-slate-500">
                {visibleRecommendations.length} recommendations
              </p>
            )}
            <Link href="/ai/smart-actions">
              <Button variant="link" size="sm" className="h-auto p-0 text-xs text-indigo-600 hover:text-indigo-700">
                Open Smart Actions Engine →
              </Button>
            </Link>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
