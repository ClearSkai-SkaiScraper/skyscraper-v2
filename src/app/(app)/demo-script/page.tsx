import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { getOrgContext } from "@/lib/org/getOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export const metadata = {
  title: "Demo Script | SkaiScrape",
  description: "Follow this script for live sales demos.",
};

/**
 * /demo-script — Internal demo script page for sales calls
 *
 * Step-by-step walkthrough for live demos.
 * Only accessible to authenticated org members.
 */
export default async function DemoScriptPage() {
  const ctx = await getOrgContext();
  if (!ctx.orgId) return <NoOrgMembershipBanner title="Demo Script" />;

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">🎬 Live Demo Script</h1>
        <p className="mt-2 text-muted-foreground">
          Follow this guide for customer-facing demos. Total time: ~8 minutes.
        </p>
      </div>

      {/* Step 1 */}
      <DemoStep
        number={1}
        title="Dashboard Overview"
        duration="60s"
        script={[
          'Open the dashboard. Say: "This is your command center."',
          "Point out the stat cards — total claims, pipeline value, signing rate.",
          'Scroll to the leaderboard: "Your whole team\'s performance at a glance."',
          'Show the weather widget: "Storm coming? You\'ll know before your competition."',
        ]}
        clickPath="/dashboard"
      />

      {/* Step 2 */}
      <DemoStep
        number={2}
        title="Create a Claim (AI-Powered)"
        duration="90s"
        script={[
          'Click "New Claim." Fill in a sample address.',
          "Upload 2-3 damage photos (use the demo photos in /public/demo/).",
          '"Watch this — our AI analyzes every photo in seconds."',
          "Show the damage detection results: type, severity, confidence score.",
          '"This replaces 30 minutes of manual documentation."',
        ]}
        clickPath="/claims/new"
      />

      {/* Step 3 */}
      <DemoStep
        number={3}
        title="AI Damage Report"
        duration="60s"
        script={[
          "Generate the AI report from the claim detail page.",
          '"One click → professional report ready for the insurance company."',
          "Show PDF preview: branded, detailed, carrier-ready.",
          '"Your adjusters will love this. Faster approvals, bigger settlements."',
        ]}
        clickPath="/reports"
      />

      {/* Step 4 */}
      <DemoStep
        number={4}
        title="Pipeline & Job Values"
        duration="60s"
        script={[
          "Navigate to Pipeline view.",
          "Show claims moving through stages: New → Signed → Approved → Complete.",
          '"Every dollar is tracked. You always know your revenue pipeline."',
          "Click into a claim to show the job value approval workflow.",
        ]}
        clickPath="/pipeline"
      />

      {/* Step 5 */}
      <DemoStep
        number={5}
        title="Client Portal"
        duration="90s"
        script={[
          '"Now here\'s the magic for your homeowners."',
          "Open the client portal (separate browser/incognito).",
          "Show: claim status tracker, document sharing, messaging, e-sign.",
          '"Your homeowner sees real-time updates. No more phone tag."',
          '"They can sign documents right here — no printing, no scanning."',
        ]}
        clickPath="/portal"
      />

      {/* Step 6 */}
      <DemoStep
        number={6}
        title="Team & Leaderboard"
        duration="60s"
        script={[
          "Show the team management page.",
          '"Invite your crew — sales reps, field techs, managers."',
          "Show the leaderboard with team rankings.",
          '"Gamification drives performance. Your top closers get recognized."',
        ]}
        clickPath="/leaderboard"
      />

      {/* Step 7 */}
      <DemoStep
        number={7}
        title="Close — Pricing & Trial"
        duration="60s"
        script={[
          '"Let me show you the pricing — it\'s simple."',
          "$80 per user per month. Everything included. No per-AI-generation fees.",
          '"We offer a 14-day free trial. No credit card required to start."',
          '"Want me to set you up right now? Takes 2 minutes."',
        ]}
        clickPath="/settings/billing"
      />

      {/* Objection Handling */}
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 dark:border-amber-900/50 dark:bg-amber-950/20">
        <h3 className="text-lg font-bold text-amber-800 dark:text-amber-200">
          💬 Common Objections
        </h3>
        <div className="mt-4 space-y-3 text-sm">
          <Objection
            q="We already use Xactimate / Hover / etc."
            a="SkaiScraper doesn't replace those — it feeds INTO them. Our AI pre-fills data that goes into your existing workflow. Less manual entry, faster turnaround."
          />
          <Objection
            q="$80/user seems expensive."
            a="One closed claim pays for a year of seats. If your team closes even one extra claim per month from faster documentation, that's $15K-$40K in revenue for $80."
          />
          <Objection
            q="We're not very tech-savvy."
            a="That's actually our sweet spot. The whole platform was built for contractors, not IT people. If you can take a photo, you can use SkaiScraper."
          />
          <Objection
            q="What about data security?"
            a="SOC 2 Type II compliant infrastructure. All data encrypted at rest and in transit. You own your data — we never share it."
          />
        </div>
      </div>
    </div>
  );
}

// ── Sub-components ──────────────────────────────────────────────

function DemoStep({
  number,
  title,
  duration,
  script,
  clickPath,
}: {
  number: number;
  title: string;
  duration: string;
  script: string[];
  clickPath: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-sm font-bold text-white">
            {number}
          </span>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
          ⏱ {duration}
        </span>
      </div>
      <ul className="mt-4 space-y-2">
        {script.map((line, i) => (
          <li key={i} className="flex gap-2 text-sm">
            <span className="mt-0.5 text-muted-foreground">→</span>
            <span>{line}</span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-muted-foreground">
        Navigate to: <code className="rounded bg-muted px-1">{clickPath}</code>
      </p>
    </div>
  );
}

function Objection({ q, a }: { q: string; a: string }) {
  return (
    <div>
      <p className="font-medium text-amber-900 dark:text-amber-100">&ldquo;{q}&rdquo;</p>
      <p className="mt-1 text-amber-700 dark:text-amber-300">→ {a}</p>
    </div>
  );
}
