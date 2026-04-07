// src/app/(app)/claims-ready-folder/[claimId]/sections/executive-summary/page.tsx
"use client";

import { FileSignature, Loader2, RefreshCw, Sparkles } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

export default function ExecutiveSummaryPage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [summary, setSummary] = useState<string>("");
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const fetchSummary = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/executive-summary?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setSummary(json.summary || "");
      }
    } catch (err) {
      logger.error("Failed to fetch summary:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchSummary();
  }, [fetchSummary]);

  const handleGenerate = async () => {
    if (!claimId) return;
    setGenerating(true);
    try {
      const res = await fetch(`/api/claims-folder/generate/executive-summary`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });
      if (res.ok) {
        const json = await res.json();
        setSummary(json.summary || "");
      }
    } catch (err) {
      logger.error("Failed to generate summary:", err);
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[400px] w-full" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <FileSignature className="h-6 w-6 text-purple-600" />
            <h1 className="text-2xl font-bold">Executive Summary</h1>
          </div>
          <p className="text-slate-500">AI-generated claim overview for adjusters</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 3 of 17</Badge>
          <Button onClick={handleGenerate} disabled={generating} variant="outline">
            {generating ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Regenerate
              </>
            )}
          </Button>
        </div>
      </div>

      {/* AI Info */}
      <Card className="border-purple-200 bg-purple-50 dark:border-purple-900 dark:bg-purple-950">
        <CardContent className="flex items-center gap-3 pt-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900">
            <Sparkles className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-medium text-purple-900 dark:text-purple-100">
              AI-Powered Summary Generation
            </p>
            <p className="text-sm text-purple-700 dark:text-purple-300">
              This summary is automatically generated from your claim data, photos, weather reports,
              and scope documentation.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Summary Editor */}
      <Card>
        <CardHeader>
          <CardTitle>Claim Summary</CardTitle>
          <CardDescription>
            Edit the summary as needed. This will appear at the beginning of your carrier
            submission.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {summary ? (
            <Textarea
              value={summary}
              onChange={(e) => setSummary(e.target.value)}
              rows={15}
              className="font-serif text-base leading-relaxed"
              placeholder="Executive summary will appear here..."
            />
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <FileSignature className="mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-medium">No Summary Generated</h3>
              <p className="mb-4 max-w-md text-slate-500">
                Click the button below to generate an AI-powered executive summary based on your
                claim data.
              </p>
              <Button onClick={handleGenerate} disabled={generating}>
                {generating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Executive Summary
                  </>
                )}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* What's Included */}
      {summary && (
        <Card>
          <CardHeader>
            <CardTitle>Summary Includes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-3 md:grid-cols-2">
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Property & policyholder details
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Date of loss & storm event
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Damage assessment overview
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Scope of work summary
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Total claim amount
              </div>
              <div className="flex items-center gap-2 text-sm">
                <span className="h-2 w-2 rounded-full bg-green-500" />
                Code compliance notes
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
