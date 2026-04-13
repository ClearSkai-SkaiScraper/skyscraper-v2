// src/app/(marketing)/features/page.tsx
import {
  Brain,
  Briefcase,
  Cloud,
  FileBarChart,
  Globe,
  MessageSquare,
  Network,
  Shield,
  Sparkles,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";

import { AIDamageBuilderDemo } from "@/components/marketing/AIDamageBuilderDemo";
import { SandboxClaimWorkspace } from "@/components/marketing/SandboxClaimWorkspace";
import { CardShell } from "@/components/ui/card-shell";

const features = [
  {
    icon: Brain,
    title: "AI Damage Builder",
    description:
      "Generate accurate roof damage narratives in seconds. Attach photos, square footage, and system type — AI assembles a proposal-ready document.",
    highlights: [
      "Ideal for kitchen-table closes",
      "Auto-saves to claim records",
      "Export to branded PDF",
    ],
    color: "from-blue-500 to-blue-600",
  },
  {
    icon: Cloud,
    title: "Weather Intelligence",
    description:
      "High-fidelity storm verification with precise hail and wind data for each property. NOAA-backed reports with confidence scoring.",
    highlights: [
      "Property-level storm dates",
      "NOAA radar cross-reference",
      "Radius reports by neighborhood",
    ],
    color: "from-sky-500 to-cyan-500",
  },
  {
    icon: FileBarChart,
    title: "Smart Supplements",
    description:
      "AI-assisted supplement generation for carrier negotiations. Feed it your scope, code requirements, and photos — it drafts the argument.",
    highlights: [
      "Calls out missed trades",
      "Clean history for appeals",
      "Built for PAs and contractors",
    ],
    color: "from-amber-500 to-orange-500",
  },
  {
    icon: Network,
    title: "Trades Network",
    description:
      "Connect with vetted contractors, roofers, and specialty trades. Assign work, share job packets, and keep every trade aligned on one platform.",
    highlights: [
      "Vendor profiles & reviews",
      "Direct claim integration",
      "Connection request system",
    ],
    color: "from-green-500 to-emerald-500",
  },
  {
    icon: Shield,
    title: "Bad Faith Detection",
    description:
      "AI analyzes carrier communications and identifies potential bad faith patterns. Document everything for stronger negotiations and legal-ready records.",
    highlights: ["Pattern recognition", "Compliance tracking", "Legal-ready reports"],
    color: "from-red-500 to-rose-500",
  },
  {
    icon: Zap,
    title: "Instant Rebuttals",
    description:
      "Generate professional rebuttals in seconds. AI reads the carrier's denial, references your scope, and drafts a compelling, code-backed response.",
    highlights: ["One-click generation", "Code-backed arguments", "Ready to send"],
    color: "from-purple-500 to-violet-500",
  },
  {
    icon: Briefcase,
    title: "Claim Workspaces",
    description:
      "Every claim gets its own command center — photos, AI narratives, weather data, carrier comms, supplements, and timeline in one organized workspace.",
    highlights: [
      "Full claim lifecycle view",
      "Team collaboration built-in",
      "Status tracking & history",
    ],
    color: "from-indigo-500 to-blue-500",
  },
  {
    icon: Globe,
    title: "Client Portal",
    description:
      "Give homeowners a branded portal to track their project in real-time. Photo uploads, status updates, and direct messaging — no app download required.",
    highlights: ["Branded to your company", "Homeowner photo uploads", "Real-time status tracking"],
    color: "from-teal-500 to-emerald-500",
  },
  {
    icon: MessageSquare,
    title: "Built-in Messaging",
    description:
      "Direct communication between your team, trades partners, and homeowners — all tied to the claim record. No more lost emails or texts.",
    highlights: ["Claim-linked conversations", "Team & client channels", "Full message history"],
    color: "from-pink-500 to-rose-500",
  },
];

export const metadata = {
  title: "Features – SkaiScraper",
  description:
    "AI-powered tools built for modern trades operations — damage builder, weather intelligence, smart supplements, and more.",
  alternates: {
    canonical: "/features",
  },
};

export default function FeaturesPage() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#117CFF] via-[#0066DD] to-[#004AAD] py-24 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-[#FFC838]/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-[#FFC838]" />
            <span className="text-sm font-medium">AI-Powered Platform</span>
          </div>

          <h1 className="mx-auto max-w-4xl text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            Tools built for{" "}
            <span className="bg-gradient-to-r from-[#FFC838] to-[#FFD970] bg-clip-text text-transparent">
              modern trades ops
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            SkaiScraper brings AI-powered damage analysis, storm intelligence, carrier negotiation
            tools, and full claim management into one connected platform. This is where your
            operation lives.
          </p>

          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/sign-up"
              className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#117CFF] shadow-lg transition-all hover:scale-105 hover:shadow-xl"
            >
              Start Free Trial
            </Link>
            <Link
              href="#live-demo"
              className="rounded-full border-2 border-white/30 px-8 py-3 text-sm font-semibold text-white backdrop-blur-sm transition-colors hover:bg-white/10"
            >
              Try the Live Demo ↓
            </Link>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* Live AI Demo Section                                    */}
      {/* ────────────────────────────────────────────────────── */}
      <section
        id="live-demo"
        className="border-t bg-gradient-to-b from-slate-50 to-white py-24 dark:from-slate-900 dark:to-slate-800"
      >
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#117CFF]/20 bg-[#117CFF]/5 px-4 py-1.5 text-sm font-medium text-[#117CFF]">
              <Sparkles className="h-4 w-4" />
              Interactive Demo
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              See the <span className="text-[#117CFF]">AI in action</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              No account needed. Click the button below and watch SkaiScraper&apos;s AI engine
              generate a real damage assessment in real-time.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/60">
              ⚠️ Interactive demo using simulated data for illustration purposes.
            </p>
          </div>

          <AIDamageBuilderDemo />
        </div>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* Features Grid                                           */}
      {/* ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-12 text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            <span className="text-[#117CFF]">Everything</span> you need
          </h2>
          <p className="mt-4 text-lg text-muted-foreground">
            From first inspection to final invoice — nine integrated modules that run your entire
            operation
          </p>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => {
            const Icon = feature.icon;
            return (
              <CardShell
                key={feature.title}
                className="group transition-all duration-300 hover:-translate-y-2 hover:shadow-xl"
              >
                <div
                  className={`mb-4 inline-flex rounded-xl bg-gradient-to-br ${feature.color} p-3`}
                >
                  <Icon className="h-6 w-6 text-white" />
                </div>
                <h3 className="text-xl font-semibold tracking-tight text-foreground">
                  {feature.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                <ul className="mt-4 space-y-1.5">
                  {feature.highlights.map((highlight) => (
                    <li
                      key={highlight}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <span className="h-1.5 w-1.5 rounded-full bg-[#117CFF]" />
                      {highlight}
                    </li>
                  ))}
                </ul>
              </CardShell>
            );
          })}
        </div>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* Sandbox Claim Workspace                                 */}
      {/* ────────────────────────────────────────────────────── */}
      <section className="border-t bg-gradient-to-b from-slate-50 to-white py-24 dark:from-slate-900 dark:to-slate-800">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="mb-12 text-center">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[#117CFF]/20 bg-[#117CFF]/5 px-4 py-1.5 text-sm font-medium text-[#117CFF]">
              <Brain className="h-4 w-4" />
              Interactive Workspace
            </div>
            <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Explore a <span className="text-[#117CFF]">real claim workspace</span>
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
              Click through the tabs below to see exactly how a claim moves through SkaiScraper —
              from photos and AI analysis to weather verification and activity timeline.
            </p>
            <p className="mt-2 text-xs text-muted-foreground/60">
              ⚠️ Sandbox workspace with sample data — actual workspaces connect to live claims.
            </p>
          </div>

          <SandboxClaimWorkspace />
        </div>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* Teams / Scale Section                                   */}
      {/* ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="text-center">
          <Users className="mx-auto mb-4 h-12 w-12 text-[#117CFF]" />
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Built for <span className="text-[#117CFF]">teams</span> that scale
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-muted-foreground">
            Whether you&apos;re a solo operator or managing multiple crews across markets,
            SkaiScraper scales with your business. Real-time collaboration, shared claim workspaces,
            and unified reporting.
          </p>

          <div className="mt-12 grid gap-8 sm:grid-cols-4">
            <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-800">
              <p className="text-4xl font-bold text-[#117CFF]">9</p>
              <p className="mt-2 text-sm text-muted-foreground">Integrated AI modules</p>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-800">
              <p className="text-4xl font-bold text-[#117CFF]">1-25</p>
              <p className="mt-2 text-sm text-muted-foreground">Team seats per org</p>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-800">
              <p className="text-4xl font-bold text-[#117CFF]">∞</p>
              <p className="mt-2 text-sm text-muted-foreground">Claims & projects</p>
            </div>
            <div className="rounded-2xl border bg-white p-6 shadow-sm dark:bg-slate-800">
              <p className="text-4xl font-bold text-[#117CFF]">99.9%</p>
              <p className="mt-2 text-sm text-muted-foreground">Uptime SLA</p>
            </div>
          </div>
        </div>
      </section>

      {/* ────────────────────────────────────────────────────── */}
      {/* CTA Section                                             */}
      {/* ────────────────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-4 py-24 text-center sm:px-6 lg:px-8">
        <div className="rounded-3xl bg-gradient-to-br from-[#117CFF] to-[#004AAD] p-12 text-white shadow-2xl">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to transform your workflow?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Join trades professionals already using SkaiScraper to close more jobs, faster. Nine
            AI-powered modules. One platform. Zero guesswork.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/sign-up"
              className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#117CFF] shadow-lg transition-all hover:scale-105"
            >
              Get Started Free
            </Link>
            <Link
              href="/pricing"
              className="rounded-full border-2 border-white/30 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              View Pricing
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}
