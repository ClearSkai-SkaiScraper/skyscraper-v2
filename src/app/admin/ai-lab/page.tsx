// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import {
  Activity,
  AlertCircle,
  Brain,
  CheckCircle2,
  Database,
  Eye,
  TrendingUp,
  Zap,
} from "lucide-react";
import { redirect } from "next/navigation";

export default async function AdminAiLabPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Mock ML metrics - replace with actual ML library calls
  const metrics = {
    experiments: {
      total: 47,
      running: 3,
      completed: 44,
      bestAccuracy: 0.94,
    },
    models: {
      deployed: 8,
      training: 2,
      avgLatency: 45,
      totalPredictions: 284392,
    },
    features: {
      total: 156,
      active: 142,
      deprecated: 14,
      avgRefreshTime: 12,
    },
  };

  const activeExperiments = [
    {
      id: "exp-001",
      name: "Hail Damage Detection V3",
      model: "YOLOv8",
      status: "running",
      accuracy: 0.92,
      runtime: "2h 34m",
    },
    {
      id: "exp-002",
      name: "Claim Approval Prediction",
      model: "XGBoost",
      status: "running",
      accuracy: 0.89,
      runtime: "45m",
    },
    {
      id: "exp-003",
      name: "Contact Recommendation Engine",
      model: "Collaborative Filtering",
      status: "completed",
      accuracy: 0.87,
      runtime: "Done",
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 p-8">
      <div className="mx-auto max-w-7xl space-y-8">
        {/* Header */}
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-900/70 p-8">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-primary">
              <Brain className="h-8 w-8 text-white" />
            </div>
            <div>
              <h1 className="text-4xl font-bold text-white">AI Lab</h1>
              <p className="text-slate-400">
                Experiment tracking • Model monitoring • Feature engineering
              </p>
            </div>
          </div>
        </div>

        {/* Metrics Grid */}
        <div className="grid gap-6 md:grid-cols-3">
          {/* Experiments */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Activity className="h-6 w-6 text-purple-400" />
              <h2 className="text-lg font-bold text-white">Experiments</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total Runs</span>
                <span className="text-2xl font-bold text-white">{metrics.experiments.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Running</span>
                <span className="flex items-center gap-2 text-sm font-bold text-green-400">
                  <div className="h-2 w-2 animate-pulse rounded-full bg-green-400" />
                  {metrics.experiments.running}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Best Accuracy</span>
                <span className="text-sm font-bold text-[#117CFF]">
                  {(metrics.experiments.bestAccuracy * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </div>

          {/* Models */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Zap className="h-6 w-6 text-yellow-400" />
              <h2 className="text-lg font-bold text-white">Models</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Deployed</span>
                <span className="text-2xl font-bold text-white">{metrics.models.deployed}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Avg Latency</span>
                <span className="text-sm font-bold text-green-400">
                  {metrics.models.avgLatency}ms
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Predictions</span>
                <span className="text-sm font-bold text-[#117CFF]">
                  {metrics.models.totalPredictions.toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
            <div className="mb-4 flex items-center gap-3">
              <Database className="h-6 w-6 text-blue-400" />
              <h2 className="text-lg font-bold text-white">Feature Store</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Total Features</span>
                <span className="text-2xl font-bold text-white">{metrics.features.total}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Active</span>
                <span className="text-sm font-bold text-green-400">{metrics.features.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-400">Refresh Time</span>
                <span className="text-sm font-bold text-[#117CFF]">
                  {metrics.features.avgRefreshTime}s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Active Experiments */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <div className="mb-6 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white">Active Experiments</h2>
            <button className="rounded-xl bg-[#117CFF] px-4 py-2 text-sm font-bold text-white transition-all hover:bg-[#0D63CC]">
              + New Experiment
            </button>
          </div>

          <div className="space-y-4">
            {activeExperiments.map((exp) => (
              <div
                key={exp.id}
                className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-800/50 p-4 transition-all hover:border-slate-700"
              >
                <div className="flex items-center gap-4">
                  {exp.status === "running" ? (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/20">
                      <div className="h-3 w-3 animate-pulse rounded-full bg-green-400" />
                    </div>
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/20">
                      <CheckCircle2 className="h-5 w-5 text-blue-400" />
                    </div>
                  )}
                  <div>
                    <div className="mb-1 font-bold text-white">{exp.name}</div>
                    <div className="text-xs text-slate-400">
                      Model: {exp.model} • Runtime: {exp.runtime}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="text-xs text-slate-400">Accuracy</div>
                    <div className="font-bold text-[#117CFF]">
                      {(exp.accuracy * 100).toFixed(1)}%
                    </div>
                  </div>
                  <button
                    aria-label="View experiment details"
                    title="View details"
                    className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-sm font-bold text-white transition-all hover:border-slate-600 hover:bg-slate-700"
                  >
                    <Eye className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Model Performance Chart Placeholder */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-6">
          <h2 className="mb-6 text-2xl font-bold text-white">Model Performance Over Time</h2>
          <div className="flex h-64 items-center justify-center rounded-xl border border-slate-800 bg-slate-800/30">
            <div className="text-center">
              <TrendingUp className="mx-auto mb-3 h-12 w-12 text-slate-600" />
              <p className="text-sm text-slate-500">Chart visualization will render here</p>
              <p className="mt-1 text-xs text-slate-600">
                Integrate with charting library (Recharts, Chart.js, etc.)
              </p>
            </div>
          </div>
        </div>

        {/* Info Banner */}
        <div className="rounded-2xl border border-[#117CFF]/30 bg-[#117CFF]/10 p-6">
          <div className="flex items-start gap-3">
            <AlertCircle className="mt-0.5 h-5 w-5 text-[#117CFF]" />
            <div>
              <h3 className="mb-1 font-bold text-[#117CFF]">AI Lab Beta</h3>
              <p className="text-sm text-slate-300">
                This is a live dashboard showing real-time ML operations. Experiment tracking uses
                our internal ML libraries (predictive analytics, recommendations, vision, NLP). Full
                integration with MLflow and Feast coming in next release.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
