import DamageVisionUploader from "@/components/claims/DamageVisionUploader";
import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageHero } from "@/components/layout/PageHero";
import { getTenant } from "@/lib/auth/tenant";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AIVisionPage() {
  const orgId = await getTenant();
  if (!orgId) {
    return <NoOrgMembershipBanner title="AI Damage Analysis" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/claims"
          className="mb-4 inline-flex items-center gap-2 text-[color:var(--muted)] transition hover:text-[color:var(--text)]"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Claims
        </Link>
        <PageHero
          title="AI Damage Analysis"
          subtitle="Upload photos of property damage for instant AI-powered analysis and recommendations"
        />
      </div>

      {/* Vision Uploader */}
      <DamageVisionUploader />

      {/* Info Cards */}
      <div className="mt-8 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-3 text-3xl">⚡</div>
          <h3 className="mb-2 font-semibold text-[color:var(--text)]">Instant Analysis</h3>
          <p className="text-sm text-[color:var(--muted)]">
            Get damage assessment results in seconds with our advanced AI vision technology
          </p>
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-3 text-3xl">🎯</div>
          <h3 className="mb-2 font-semibold text-[color:var(--text)]">High Accuracy</h3>
          <p className="text-sm text-[color:var(--muted)]">
            AI trained on thousands of damage photos for reliable detection and classification
          </p>
        </div>
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-3 text-3xl">📋</div>
          <h3 className="mb-2 font-semibold text-[color:var(--text)]">Actionable Insights</h3>
          <p className="text-sm text-[color:var(--muted)]">
            Receive specific recommendations and cost estimates based on detected damage
          </p>
        </div>
      </div>

      {/* Supported Damage Types */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <h3 className="mb-4 font-semibold text-[color:var(--text)]">Supported Damage Types</h3>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {[
            { icon: "🌊", label: "Water Damage" },
            { icon: "🔥", label: "Fire Damage" },
            { icon: "🌪️", label: "Wind Damage" },
            { icon: "⚡", label: "Hail Damage" },
            { icon: "🏚️", label: "Structural" },
            { icon: "🪟", label: "Roof Damage" },
            { icon: "🚪", label: "Impact Damage" },
            { icon: "🌳", label: "Tree Damage" },
          ].map((type) => (
            <div
              key={type.label}
              className="flex items-center gap-2 rounded-lg bg-[var(--surface-2)] p-3"
            >
              <span className="text-2xl">{type.icon}</span>
              <span className="text-sm font-medium text-[color:var(--text)]">{type.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
