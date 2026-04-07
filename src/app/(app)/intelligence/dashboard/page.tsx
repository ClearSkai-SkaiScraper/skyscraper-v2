"use client";

import {
  BarChart3,
  Brain,
  CheckCircle2,
  Database,
  Loader2,
  RefreshCw,
  Sparkles,
  TrendingUp,
  Zap,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { toast } from "sonner";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface EmbeddingStatus {
  totalClaims: number;
  embeddedClaims: number;
  coverage: number;
  lastUpdated: string | null;
}

interface BatchResult {
  success: boolean;
  mode: string;
  processed: number;
  failed: number;
  alreadyUpToDate: number;
}

export default function IntelligenceDashboardPage() {
  const [status, setStatus] = useState<EmbeddingStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [embedding, setEmbedding] = useState(false);
  const [batchResult, setBatchResult] = useState<BatchResult | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/ai/embeddings/generate");
      if (!res.ok) throw new Error("Failed to fetch status");
      const data = await res.json();
      setStatus({
        totalClaims: data.totalClaims,
        embeddedClaims: data.embeddedClaims,
        coverage: data.coverage,
        lastUpdated: data.lastUpdated,
      });
    } catch (err) {
      console.error("Failed to fetch embedding status:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  const runBatchEmbedding = async (batchSize: number = 50) => {
    setEmbedding(true);
    setBatchResult(null);

    try {
      const res = await fetch("/api/ai/embeddings/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true, batchSize }),
      });

      if (!res.ok) throw new Error("Batch embedding failed");

      const data: BatchResult = await res.json();
      setBatchResult(data);
      toast.success(`Embedded ${data.processed} claims successfully`);

      // Refresh status after batch
      await fetchStatus();
    } catch (err: any) {
      toast.error(err.message || "Failed to run batch embedding");
    } finally {
      setEmbedding(false);
    }
  };

  const coveragePercent = status ? Math.round(status.coverage * 100) : 0;

  return (
    <div className="space-y-6">
      <PageHero
        title="Visual Intelligence"
        description="AI-powered claim analysis, similarity search, and pattern detection"
        icon={<Brain className="h-7 w-7" />}
        section="claims"
      />

      {/* Status Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Embedding Coverage */}
        <Card className="border-violet-200 bg-white/80 backdrop-blur-sm dark:border-violet-800 dark:bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embedding Coverage</CardTitle>
            <Database className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-24" />
            ) : (
              <>
                <div className="text-2xl font-bold">{coveragePercent}%</div>
                <Progress value={coveragePercent} className="mt-2 h-2" />
                <p className="mt-1 text-xs text-muted-foreground">
                  {status?.embeddedClaims ?? 0} of {status?.totalClaims ?? 0} claims indexed
                </p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Total Indexed */}
        <Card className="bg-white/80 backdrop-blur-sm dark:bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Indexed Claims</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">{status?.embeddedClaims ?? 0}</div>
                <p className="text-xs text-muted-foreground">Ready for similarity search</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Pending */}
        <Card className="bg-white/80 backdrop-blur-sm dark:bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <TrendingUp className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <div className="text-2xl font-bold">
                  {(status?.totalClaims ?? 0) - (status?.embeddedClaims ?? 0)}
                </div>
                <p className="text-xs text-muted-foreground">Claims not yet embedded</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Model Info */}
        <Card className="bg-white/80 backdrop-blur-sm dark:bg-slate-900/60">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Embedding Model</CardTitle>
            <BarChart3 className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-lg font-bold">text-embedding-3-small</div>
            <p className="text-xs text-muted-foreground">1,536 dimensions · HNSW index</p>
          </CardContent>
        </Card>
      </div>

      {/* Actions */}
      <Card className="bg-white/80 backdrop-blur-sm dark:bg-slate-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-violet-500" />
            Embedding Pipeline
          </CardTitle>
          <CardDescription>
            Generate vector embeddings for your claims to enable AI-powered similarity search. Each
            claim is converted to a 1,536-dimensional vector using OpenAI&apos;s embedding model.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => runBatchEmbedding(25)}
              disabled={embedding}
              className="inline-flex items-center gap-2 rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-violet-700 disabled:opacity-50 dark:bg-violet-700 dark:hover:bg-violet-800"
            >
              {embedding ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              {embedding ? "Embedding…" : "Embed Next 25 Claims"}
            </button>

            <button
              type="button"
              onClick={() => runBatchEmbedding(100)}
              disabled={embedding}
              className="inline-flex items-center gap-2 rounded-lg border border-violet-300 bg-white px-4 py-2.5 text-sm font-semibold text-violet-700 shadow-sm transition-colors hover:bg-violet-50 disabled:opacity-50 dark:border-violet-700 dark:bg-slate-900 dark:text-violet-300 dark:hover:bg-violet-950"
            >
              <Sparkles className="h-4 w-4" />
              Embed Next 100
            </button>

            <button
              type="button"
              onClick={() => fetchStatus()}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh Status
            </button>
          </div>

          {/* Batch Result */}
          {batchResult && (
            <div className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 p-4 dark:border-emerald-800 dark:bg-emerald-950/30">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                <span className="text-sm font-medium text-emerald-800 dark:text-emerald-300">
                  Batch Complete
                </span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-xs text-muted-foreground">Processed</span>
                  <p className="font-semibold text-emerald-700 dark:text-emerald-300">
                    {batchResult.processed}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Already Up-to-date</span>
                  <p className="font-semibold">{batchResult.alreadyUpToDate}</p>
                </div>
                <div>
                  <span className="text-xs text-muted-foreground">Failed</span>
                  <p className="font-semibold text-red-600 dark:text-red-400">
                    {batchResult.failed}
                  </p>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* How It Works */}
      <Card className="bg-white/80 backdrop-blur-sm dark:bg-slate-900/60">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-blue-500" />
            How Visual Intelligence Works
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 md:grid-cols-3">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300">
                  1
                </Badge>
                <span className="font-semibold">Embed</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Each claim&apos;s damage type, carrier, scope, supplements, and notes are converted
                into a 1,536-dimension vector using OpenAI&apos;s embedding model.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300">
                  2
                </Badge>
                <span className="font-semibold">Index</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Vectors are stored in PostgreSQL with pgvector using HNSW indexes for
                millisecond-fast approximate nearest neighbor search.
              </p>
            </div>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300">
                  3
                </Badge>
                <span className="font-semibold">Search</span>
              </div>
              <p className="text-sm text-muted-foreground">
                When you open a claim, click &quot;Find Similar Claims&quot; to discover claims with
                matching damage patterns, carriers, and outcomes — all within your org.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
