"use client";

/**
 * Intelligence Tuning Dashboard — Admin Page
 *
 * Displays all current tuning-config values, validates weight sums,
 * and shows the user-facing label mappings. Read-only for now —
 * changes are made in tuning-config.ts and deployed.
 */

import { ValidationReportPanel } from "@/components/intelligence/ValidationReportPanel";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CARRIER_PLAYBOOK_CONFIG,
  EVIDENCE_GAP_CONFIG,
  INTELLIGENCE_LABELS,
  PACKET_SCORE_CONFIG,
  SIMULATION_CONFIG,
  STORM_ALERT_CONFIG,
  STORM_GRAPH_CONFIG,
  validateTuningConfig,
} from "@/lib/intelligence/tuning-config";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Cloud,
  Scale,
  Settings2,
  Shield,
  Tag,
  XCircle,
} from "lucide-react";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function WeightBar({ label, value, max = 1 }: { label: string; value: number; max?: number }) {
  const pct = Math.round((value / max) * 100);
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
        <span className="text-muted-foreground">{(value * 100).toFixed(0)}%</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
        <div
          className="h-full rounded-full bg-indigo-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

function ThresholdRow({
  label,
  value,
  unit = "",
}: {
  label: string;
  value: number | string;
  unit?: string;
}) {
  return (
    <div className="flex items-center justify-between py-1 text-sm">
      <span className="text-slate-600 dark:text-slate-400">{label}</span>
      <span className="font-mono font-medium text-slate-800 dark:text-slate-200">
        {value}
        {unit}
      </span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function TuningDashboardPage() {
  const configErrors = validateTuningConfig();
  const isValid = configErrors.length === 0;

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-slate-900 dark:text-white">
            <Settings2 className="h-6 w-6 text-indigo-500" />
            Intelligence Tuning Dashboard
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Current configuration for all scoring engines. Version{" "}
            <span className="font-mono">{SIMULATION_CONFIG.version}</span>
          </p>
        </div>
        <Badge
          className={cn(
            "px-3 py-1 text-xs font-semibold",
            isValid
              ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400"
              : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
          )}
        >
          {isValid ? (
            <>
              <CheckCircle2 className="mr-1 h-3 w-3" /> Config Valid
            </>
          ) : (
            <>
              <XCircle className="mr-1 h-3 w-3" /> {configErrors.length} Error(s)
            </>
          )}
        </Badge>
      </div>

      {/* Validation errors */}
      {!isValid && (
        <Card className="border-red-300 dark:border-red-800">
          <CardContent className="pt-4">
            <ul className="space-y-1">
              {configErrors.map((err, i) => (
                <li
                  key={i}
                  className="flex items-start gap-2 text-sm text-red-600 dark:text-red-400"
                >
                  <XCircle className="mt-0.5 h-4 w-4 shrink-0" />
                  {err}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}

      {/* Grid of engine configs */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {/* Simulation Engine */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Scale className="h-4 w-4 text-indigo-500" />
              Claim Strength Analysis
            </CardTitle>
            <CardDescription>Simulation engine weights & thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Category Weights
            </p>
            {Object.entries(SIMULATION_CONFIG.weights).map(([key, val]) => (
              <WeightBar key={key} label={key} value={val} />
            ))}
            <div className="border-t pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Outcome Thresholds
              </p>
              <ThresholdRow label="Strong ≥" value={SIMULATION_CONFIG.outcomes.approvedMin} />
              <ThresholdRow label="Moderate ≥" value={SIMULATION_CONFIG.outcomes.partialMin} />
              <ThresholdRow label="Needs Work" value="< 40" />
            </div>
            <div className="border-t pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Confidence Levels
              </p>
              <ThresholdRow label="High ≥" value={SIMULATION_CONFIG.confidence.highMin} />
              <ThresholdRow label="Medium ≥" value={SIMULATION_CONFIG.confidence.mediumMin} />
            </div>
          </CardContent>
        </Card>

        {/* Storm Graph */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Cloud className="h-4 w-4 text-blue-500" />
              Storm Graph
            </CardTitle>
            <CardDescription>Clustering & corroboration settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Distances
            </p>
            <ThresholdRow
              label="Cluster radius"
              value={STORM_GRAPH_CONFIG.clusterRadiusMiles}
              unit=" mi"
            />
            <ThresholdRow
              label="Corroboration radius"
              value={STORM_GRAPH_CONFIG.corroborationRadiusMiles}
              unit=" mi"
            />
            <ThresholdRow
              label="Min claims for cluster"
              value={STORM_GRAPH_CONFIG.minClaimsForCluster}
            />

            <div className="border-t pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pre-Qualification Thresholds
              </p>
              <ThresholdRow label="Very High ≥" value={STORM_GRAPH_CONFIG.preQual.veryHighMin} />
              <ThresholdRow label="High ≥" value={STORM_GRAPH_CONFIG.preQual.highMin} />
              <ThresholdRow label="Moderate ≥" value={STORM_GRAPH_CONFIG.preQual.moderateMin} />
            </div>

            <div className="border-t pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Corroboration Weights
              </p>
              {Object.entries(STORM_GRAPH_CONFIG.corroboration).map(([key, val]) => (
                <WeightBar key={key} label={key} value={val} />
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Packet Score */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <Shield className="h-4 w-4 text-emerald-500" />
              Submission Readiness
            </CardTitle>
            <CardDescription>Packet intelligence score weights</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Component Weights
            </p>
            {Object.entries(PACKET_SCORE_CONFIG.weights).map(([key, val]) => (
              <WeightBar key={key} label={key} value={val} />
            ))}

            <div className="border-t pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Grade Thresholds
              </p>
              {Object.entries(PACKET_SCORE_CONFIG.grades).map(([grade, min]) => (
                <ThresholdRow key={grade} label={`Grade ${grade} ≥`} value={min} />
              ))}
              <ThresholdRow label="Grade F" value="< 40" />
            </div>

            <div className="border-t pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Grade Descriptions
              </p>
              {Object.entries(INTELLIGENCE_LABELS.gradeDescriptions).map(([grade, desc]) => (
                <div key={grade} className="py-1 text-xs">
                  <span className="font-bold text-slate-700 dark:text-slate-300">{grade}:</span>{" "}
                  <span className="text-muted-foreground">{desc}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Evidence Gap Detector */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              Evidence Gap Detector
            </CardTitle>
            <CardDescription>Model group impact & priority thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Model Group Impact Scores (0-30)
            </p>
            {Object.entries(EVIDENCE_GAP_CONFIG.modelGroupImpact).map(([group, score]) => (
              <div key={group} className="flex items-center justify-between py-0.5 text-sm">
                <span className="text-slate-600 dark:text-slate-400">{group}</span>
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-20 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <div
                      className="h-full rounded-full bg-amber-500"
                      style={{ width: `${(score / 30) * 100}%` }}
                    />
                  </div>
                  <span className="w-6 text-right font-mono text-xs">{score}</span>
                </div>
              </div>
            ))}
            <div className="border-t pt-3 dark:border-slate-700">
              <ThresholdRow label="High priority ≥" value={EVIDENCE_GAP_CONFIG.priority.highMin} />
              <ThresholdRow
                label="Medium priority ≥"
                value={EVIDENCE_GAP_CONFIG.priority.mediumMin}
              />
            </div>
          </CardContent>
        </Card>

        {/* Storm Alerts */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-red-500" />
              Storm Alerts
            </CardTitle>
            <CardDescription>Alert radius, distance bands & severity thresholds</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <ThresholdRow
              label="Alert radius"
              value={STORM_ALERT_CONFIG.alertRadiusMiles}
              unit=" mi"
            />
            <ThresholdRow
              label="Recent storm window"
              value={STORM_ALERT_CONFIG.recentStormDays}
              unit=" days"
            />

            <div className="border-t pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Critical Thresholds
              </p>
              <ThresholdRow
                label="Hail size"
                value={STORM_ALERT_CONFIG.critical.hailSizeInches}
                unit=" in"
              />
              <ThresholdRow
                label="Wind speed"
                value={STORM_ALERT_CONFIG.critical.windSpeedMph}
                unit=" mph"
              />
            </div>

            <div className="border-t pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Distance Bands
              </p>
              <ThresholdRow
                label="Critical ≤"
                value={STORM_ALERT_CONFIG.distanceBands.criticalMaxMiles}
                unit=" mi"
              />
              <ThresholdRow
                label="Warning ≤"
                value={STORM_ALERT_CONFIG.distanceBands.warningMaxMiles}
                unit=" mi"
              />
              <ThresholdRow
                label="Extended warning ≤"
                value={STORM_ALERT_CONFIG.distanceBands.warningExtendedMiles}
                unit=" mi"
              />
            </div>
          </CardContent>
        </Card>

        {/* Carrier Playbook */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <BookOpen className="h-4 w-4 text-purple-500" />
              Carrier Playbook
            </CardTitle>
            <CardDescription>Approval & resolution tier settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Approval Rate Tiers
            </p>
            <ThresholdRow
              label="Cooperative ≥"
              value={CARRIER_PLAYBOOK_CONFIG.approvalTiers.cooperative}
              unit="%"
            />
            <ThresholdRow
              label="Moderate ≥"
              value={CARRIER_PLAYBOOK_CONFIG.approvalTiers.moderate}
              unit="%"
            />
            <ThresholdRow label="Difficult" value="< 50%" />

            <div className="border-t pt-3 dark:border-slate-700">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Resolution Speed Tiers
              </p>
              <ThresholdRow
                label="Fast ≤"
                value={CARRIER_PLAYBOOK_CONFIG.resolutionTiers.fast}
                unit=" days"
              />
              <ThresholdRow
                label="Typical ≤"
                value={CARRIER_PLAYBOOK_CONFIG.resolutionTiers.typical}
                unit=" days"
              />
              <ThresholdRow label="Slow" value="> 60 days" />
            </div>

            <ThresholdRow
              label="Min claims for playbook"
              value={CARRIER_PLAYBOOK_CONFIG.minClaimsForPlaybook}
            />
          </CardContent>
        </Card>
      </div>

      {/* User-Facing Labels */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Tag className="h-4 w-4 text-slate-500" />
            User-Facing Labels
          </CardTitle>
          <CardDescription>
            Conservative wording used throughout the UI. No predictive language — evidence-based
            framing only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {/* Section titles */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Section Titles
              </p>
              {[
                ["Simulation", INTELLIGENCE_LABELS.simulationTitle],
                ["Storm Graph", INTELLIGENCE_LABELS.stormGraphTitle],
                ["Packet Score", INTELLIGENCE_LABELS.packetScoreTitle],
                ["Carrier", INTELLIGENCE_LABELS.carrierTitle],
                ["Alerts", INTELLIGENCE_LABELS.alertTitle],
              ].map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <Badge variant="outline" className="text-xs">
                    {val}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Score labels */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Score Labels
              </p>
              {[
                ["Approval Prob.", INTELLIGENCE_LABELS.approvalProbability],
                ["Predicted Outcome", INTELLIGENCE_LABELS.predictedOutcome],
                ["Corroboration", INTELLIGENCE_LABELS.corroborationScore],
                ["Packet Score", INTELLIGENCE_LABELS.packetScore],
              ].map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <Badge variant="outline" className="text-xs">
                    {val}
                  </Badge>
                </div>
              ))}
            </div>

            {/* Outcome labels */}
            <div className="space-y-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Outcome Labels
              </p>
              {Object.entries(INTELLIGENCE_LABELS.outcomes).map(([key, val]) => (
                <div key={key} className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{key}</span>
                  <Badge
                    className={cn(
                      "text-xs",
                      key === "approved" &&
                        "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400",
                      key === "partial" &&
                        "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400",
                      key === "denied" &&
                        "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400"
                    )}
                  >
                    {val}
                  </Badge>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Validation Report */}
      <ValidationReportPanel />
    </div>
  );
}
