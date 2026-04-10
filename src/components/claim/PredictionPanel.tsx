/**
 * PHASE 47: CLAIM PREDICTION PANEL
 *
 * Visual display of AI-powered claim lifecycle prediction.
 * The feature that sells SkaiScraper.
 */

"use client";

import {
  AlertTriangle,
  Brain,
  CheckCircle2,
  Clock,
  Shield,
  Target,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import React, { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface PredictionData {
  probabilityFull: number;
  probabilityPart: number;
  probabilityDeny: number;
  confidenceScore: number;
  recommendedSteps: Array<{
    title: string;
    description: string;
    priority: "high" | "medium" | "low";
    reasoning: string;
  }>;
  riskFlags: string[];
  nextMove: string;
  aiSummary: string;
  carrierBehavior: {
    likelyStrategy: string;
    commonTactics: string[];
    timeline: string;
  };
  successPath: Array<{
    step: number;
    action: string;
    doThis: string;
    dontDoThis: string;
  }>;
}

interface PredictionPanelProps {
  claimId: string;
}

export function PredictionPanel({ claimId }: PredictionPanelProps) {
  const [prediction, setPrediction] = useState<PredictionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    void fetchPrediction();
  }, [claimId]);

  const fetchPrediction = async () => {
    try {
      const response = await fetch(`/api/claims/${claimId}/predict`);
      if (response.ok) {
        const data = await response.json();
        setPrediction(data.prediction);
      }
    } catch (err) {
      logger.error("Failed to fetch prediction:", err);
    } finally {
      setLoading(false);
    }
  };

  const generatePrediction = async () => {
    setGenerating(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/predict`, {
        method: "POST",
      });
      if (!response.ok) throw new Error("Failed to generate");
      const data = await response.json();
      setPrediction(data.prediction);
    } catch (err) {
      logger.error("Failed to generate prediction:", err);
      alert("Failed to generate prediction. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Clock className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!prediction) {
    return (
      <div className="space-y-4 py-12 text-center">
        <Brain className="mx-auto h-12 w-12 text-muted-foreground" />
        <h3 className="text-lg font-semibold">No Prediction Yet</h3>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">
          Generate an AI-powered prediction to see claim approval likelihood, risk flags, and
          recommended actions.
        </p>
        <button
          onClick={generatePrediction}
          disabled={generating}
          className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
        >
          {generating ? "Generating..." : "Generate AI Prediction"}
        </button>
      </div>
    );
  }

  const maxProb = Math.max(
    prediction.probabilityFull,
    prediction.probabilityPart,
    prediction.probabilityDeny
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-2xl font-bold">
          <Brain className="h-6 w-6 text-primary" />
          AI Claim Prediction
        </h2>
        <button
          onClick={generatePrediction}
          disabled={generating}
          className="rounded-lg bg-muted px-4 py-2 text-sm hover:bg-muted/80 disabled:opacity-50"
        >
          {generating ? "Updating..." : "Refresh Prediction"}
        </button>
      </div>

      {/* Confidence Score - Big Visual */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/10 to-primary/5 p-8 text-center">
        <div className="mb-4 inline-flex h-32 w-32 items-center justify-center rounded-full border-4 border-primary bg-primary/20">
          <div className="text-center">
            <div className="text-4xl font-bold text-primary">{prediction.confidenceScore}</div>
            <div className="text-xs text-primary/70">CONFIDENCE</div>
          </div>
        </div>
        <h3 className="mb-2 text-lg font-semibold">AI Prediction Confidence Score</h3>
        <p className="mx-auto max-w-lg text-sm text-muted-foreground">
          Based on storm data, photos, video, AI analysis, and claim timeline
        </p>
      </div>

      {/* Probability Bars */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <ProbabilityCard
          label="Full Approval"
          probability={prediction.probabilityFull}
          color="emerald"
          icon={<CheckCircle2 />}
          isMax={prediction.probabilityFull === maxProb}
        />
        <ProbabilityCard
          label="Partial Approval"
          probability={prediction.probabilityPart}
          color="amber"
          icon={<TrendingUp />}
          isMax={prediction.probabilityPart === maxProb}
        />
        <ProbabilityCard
          label="Denial Risk"
          probability={prediction.probabilityDeny}
          color="rose"
          icon={<TrendingDown />}
          isMax={prediction.probabilityDeny === maxProb}
        />
      </div>

      {/* AI Summary */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-3 flex items-center gap-2 font-semibold">
          <Target className="h-4 w-4" />
          What the Carrier is Thinking
        </h3>
        <p className="text-sm text-muted-foreground">{prediction.aiSummary}</p>
      </div>

      {/* Risk Flags */}
      {prediction.riskFlags.length > 0 && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-6">
          <h3 className="mb-4 flex items-center gap-2 font-semibold text-rose-900">
            <AlertTriangle className="h-4 w-4" />
            Risk Flags
          </h3>
          <div className="space-y-2">
            {prediction.riskFlags.map((flag, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-rose-800">
                <div className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                {flag}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Carrier Behavior Prediction */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 flex items-center gap-2 font-semibold">
          <Shield className="h-4 w-4" />
          Predicted Carrier Behavior
        </h3>
        <div className="space-y-4">
          <div>
            <h4 className="mb-1 text-sm font-medium text-muted-foreground">Likely Strategy</h4>
            <p className="text-sm">{prediction.carrierBehavior.likelyStrategy}</p>
          </div>
          <div>
            <h4 className="mb-2 text-sm font-medium text-muted-foreground">Common Tactics</h4>
            <ul className="space-y-1">
              {prediction.carrierBehavior.commonTactics.map((tactic, i) => (
                <li key={i} className="flex items-start gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  {tactic}
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h4 className="mb-1 text-sm font-medium text-muted-foreground">Expected Timeline</h4>
            <p className="text-sm">{prediction.carrierBehavior.timeline}</p>
          </div>
        </div>
      </div>

      {/* Recommended Steps */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 font-semibold">Recommended Next Actions</h3>
        <div className="space-y-3">
          {prediction.recommendedSteps.map((step, i) => (
            <div
              key={i}
              className={`rounded-lg border p-4 ${
                step.priority === "high"
                  ? "border-rose-200 bg-rose-50"
                  : step.priority === "medium"
                    ? "border-amber-200 bg-amber-50"
                    : "border-blue-200 bg-blue-50"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h4 className="text-sm font-medium">{step.title}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{step.description}</p>
                  <p className="mt-2 text-xs italic text-muted-foreground">{step.reasoning}</p>
                </div>
                <span
                  className={`rounded-full px-2 py-1 text-xs ${
                    step.priority === "high"
                      ? "bg-rose-200 text-rose-800"
                      : step.priority === "medium"
                        ? "bg-amber-200 text-amber-800"
                        : "bg-blue-200 text-blue-800"
                  }`}
                >
                  {step.priority.toUpperCase()}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Success Path */}
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 font-semibold">Success Path Guidance</h3>
        <div className="space-y-4">
          {prediction.successPath.map((step) => (
            <div key={step.step} className="flex gap-4">
              <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                {step.step}
              </div>
              <div className="flex-1">
                <h4 className="mb-2 text-sm font-medium">{step.action}</h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded border border-emerald-200 bg-emerald-50 p-3">
                    <div className="mb-1 text-xs font-semibold text-emerald-800">✓ DO THIS</div>
                    <div className="text-xs text-emerald-700">{step.doThis}</div>
                  </div>
                  <div className="rounded border border-rose-200 bg-rose-50 p-3">
                    <div className="mb-1 text-xs font-semibold text-rose-800">✗ DON&apos;T DO THIS</div>
                    <div className="text-xs text-rose-700">{step.dontDoThis}</div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Next Move */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-6 text-center">
        <h3 className="mb-2 font-semibold">Carrier&apos;s Likely Next Move</h3>
        <p className="text-sm text-muted-foreground">{prediction.nextMove}</p>
      </div>
    </div>
  );
}

function ProbabilityCard({
  label,
  probability,
  color,
  icon,
  isMax,
}: {
  label: string;
  probability: number;
  color: "emerald" | "amber" | "rose";
  icon: React.ReactNode;
  isMax: boolean;
}) {
  const colorClasses = {
    emerald: "bg-emerald-500 from-emerald-500 to-emerald-600",
    amber: "bg-amber-500 from-amber-500 to-amber-600",
    rose: "bg-rose-500 from-rose-500 to-rose-600",
  };

  return (
    <div className={`rounded-lg border bg-card p-6 ${isMax ? "ring-2 ring-primary" : ""}`}>
      <div className="mb-4 flex items-center justify-between">
        <div
          className={`bg- h-10 w-10 rounded-full${color}-100 text- flex items-center justify-center${color}-600`}
        >
          {icon}
        </div>
        {isMax && (
          <span className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
            MOST LIKELY
          </span>
        )}
      </div>
      <div className="mb-1 text-3xl font-bold">{probability}%</div>
      <div className="mb-3 text-sm text-muted-foreground">{label}</div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full bg-gradient-to-r ${colorClasses[color]} transition-all duration-500`}
          style={{ width: `${probability}%` }}
        />
      </div>
    </div>
  );
}
