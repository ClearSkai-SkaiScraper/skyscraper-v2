// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { EndpointHealthCheck } from "@/components/deployment/EndpointHealthCheck";
import { PageHero } from "@/components/layout/PageHero";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Deployment Status | Skai",
  description: "View deployment health and build information",
};

export default async function DeploymentStatusPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Get build info from environment
  const commitSha =
    // eslint-disable-next-line no-restricted-syntax
    process.env.NEXT_PUBLIC_COMMIT_SHA || process.env.VERCEL_GIT_COMMIT_SHA || "unknown";
  // eslint-disable-next-line no-restricted-syntax
  const branch = process.env.VERCEL_GIT_COMMIT_REF || "unknown";
  // eslint-disable-next-line no-restricted-syntax
  const buildTime = process.env.VERCEL_BUILD_TIME || "unknown";

  // Feature flags status
  const featureFlags = {
    // eslint-disable-next-line no-restricted-syntax
    pdfGenerationEnabled: process.env.FEATURE_PDF_GENERATION !== "false",
    // eslint-disable-next-line no-restricted-syntax
    aiAnalysisEnabled: process.env.FEATURE_AI_ANALYSIS !== "false",
    // eslint-disable-next-line no-restricted-syntax
    supplementsEnabled: process.env.FEATURE_SUPPLEMENTS !== "false",
    // eslint-disable-next-line no-restricted-syntax
    mockupsEnabled: process.env.FEATURE_MOCKUPS !== "false",
  };

  // Timeout configs
  const timeouts = {
    // eslint-disable-next-line no-restricted-syntax
    pdfGeneration: process.env.TIMEOUT_PDF_GENERATION || "25000",
    // eslint-disable-next-line no-restricted-syntax
    aiAnalysis: process.env.TIMEOUT_AI_ANALYSIS || "30000",
  };

  return (
    <div className="mx-auto max-w-6xl space-y-8 p-6">
      <PageHero
        title="Deployment Status"
        subtitle="View deployment health, build information, and system configuration"
        section="settings"
      />

      {/* Build Info */}
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Build Information</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-slate-400">Commit SHA</p>
            <p className="mt-1 font-mono text-sm text-slate-200">{commitSha.substring(0, 8)}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Branch</p>
            <p className="mt-1 font-mono text-sm text-slate-200">{branch}</p>
          </div>
          <div>
            <p className="text-xs text-slate-400">Build Time</p>
            <p className="mt-1 font-mono text-sm text-slate-200">{buildTime}</p>
          </div>
        </div>
      </div>

      {/* Feature Flags */}
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Feature Flags</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(featureFlags).map(([key, enabled]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-3"
            >
              <span className="text-sm text-slate-300">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <span
                className={`rounded px-2 py-1 text-xs font-medium ${
                  enabled ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
                }`}
              >
                {enabled ? "Enabled" : "Disabled"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Timeout Configuration */}
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
        <h2 className="mb-4 text-lg font-semibold text-slate-100">Timeout Configuration</h2>
        <div className="grid gap-3 md:grid-cols-2">
          {Object.entries(timeouts).map(([key, value]) => (
            <div
              key={key}
              className="flex items-center justify-between rounded-lg border border-slate-700 bg-slate-800 p-3"
            >
              <span className="text-sm text-slate-300">
                {key.replace(/([A-Z])/g, " $1").trim()}
              </span>
              <span className="font-mono text-sm text-slate-200">{value}ms</span>
            </div>
          ))}
        </div>
      </div>

      {/* Endpoint Health Check */}
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-6">
        <EndpointHealthCheck />
      </div>

      {/* Helpful Info */}
      <div className="rounded-lg border border-blue-500/20 bg-blue-500/10 p-4">
        <h3 className="mb-2 text-sm font-medium text-blue-400">💡 Understanding Status Codes</h3>
        <ul className="space-y-1 text-xs text-blue-300">
          <li>
            <strong>200 OK:</strong> Endpoint is live and responding
          </li>
          <li>
            <strong>401 Unauthorized:</strong> Endpoint exists but requires authentication (GOOD -
            means it&apos;s deployed)
          </li>
          <li>
            <strong>404 Not Found:</strong> Endpoint doesn&apos;t exist (may indicate deployment
            issue)
          </li>
          <li>
            <strong>5xx Server Error:</strong> Endpoint exists but failing (needs investigation)
          </li>
        </ul>
      </div>

      {/* CLI Commands */}
      <div className="rounded-lg border border-slate-700 bg-slate-900 p-4">
        <h3 className="mb-2 text-sm font-medium text-slate-300">Command Line Verification</h3>
        <div className="space-y-2">
          <code className="block rounded bg-slate-800 p-2 text-xs text-slate-300">
            ./scripts/verify-prod.sh
          </code>
          <code className="block rounded bg-slate-800 p-2 text-xs text-slate-300">
            ./scripts/check-vercel-build.sh
          </code>
        </div>
      </div>
    </div>
  );
}
