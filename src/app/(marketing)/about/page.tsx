import { Brain, Cloud, Network, Sparkles, Target, Users, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About – SkaiScraper",
  description:
    "Learn about SkaiScraper's mission to revolutionize trades operations with AI-powered intelligence",
  alternates: {
    canonical: "/about",
  },
  openGraph: {
    title: "About – SkaiScraper",
    description:
      "Learn about SkaiScraper's mission to revolutionize trades operations with AI-powered intelligence",
  },
};

// JSON-LD Organization structured data (M6 Enhancement)
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "ClearSkai Technologies",
  alternateName: "SkaiScraper",
  url: "https://skaiscrape.com",
  logo: "https://skaiscrape.com/brand/logo.png",
  description:
    "AI-powered operations hub for roofing and restoration contractors. Transform how trades professionals handle damage detection, claims management, and client communication.",
  foundingDate: "2024",
  sameAs: ["https://twitter.com/skaiscraper", "https://linkedin.com/company/skaiscraper"],
  contactPoint: {
    "@type": "ContactPoint",
    contactType: "sales",
    email: "hello@skaiscrape.com",
    url: "https://skaiscrape.com/contact",
  },
};

export default function AboutPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* JSON-LD Structured Data (M6) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#117CFF] via-[#0066DD] to-[#004AAD] py-24 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-[#FFC838]/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-6xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
            <Sparkles className="h-4 w-4 text-[#FFC838]" />
            <span className="text-sm font-medium">Our Story</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            About{" "}
            <span className="bg-gradient-to-r from-[#FFC838] to-[#FFD970] bg-clip-text text-transparent">
              SkaiScraper
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            Revolutionizing trades operations with AI-powered intelligence. Built by tradesmen, for
            tradesmen.
          </p>
        </div>
      </section>

      <div className="mx-auto max-w-6xl space-y-24 px-4 py-24 sm:px-6 lg:px-8">
        {/* Mission Statement */}
        <section className="grid gap-12 md:grid-cols-2 md:items-center">
          <div>
            <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-[#117CFF]/10 px-4 py-2">
              <Target className="h-4 w-4 text-[#117CFF]" />
              <span className="text-sm font-medium text-[#117CFF]">Our Mission</span>
            </div>
            <h2 className="text-3xl font-bold tracking-tight">
              The operating system for <span className="text-[#117CFF]">modern trades</span>
            </h2>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              SkaiScraper helps trades professionals unify project intelligence, weather
              verification, AI damage analysis, and a trades collaboration network into a single,
              fast workflow.
            </p>
            <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
              We believe contractors deserve tools as sophisticated as the carriers they work with.
              No more spreadsheets. No more guessing. Just smart, data-driven claims management.
            </p>
          </div>
          <div className="rounded-3xl bg-gradient-to-br from-[#117CFF] to-[#004AAD] p-8 text-white">
            <div className="grid grid-cols-2 gap-6">
              <div className="text-center">
                <p className="text-4xl font-bold">AI</p>
                <p className="mt-1 text-sm text-white/70">Powered Analysis</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">100%</p>
                <p className="mt-1 text-sm text-white/70">Cloud-Based</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">24/7</p>
                <p className="mt-1 text-sm text-white/70">Access</p>
              </div>
              <div className="text-center">
                <p className="text-4xl font-bold">1</p>
                <p className="mt-1 text-sm text-white/70">Unified Platform</p>
              </div>
            </div>
          </div>
        </section>

        {/* What We're Building */}
        <section>
          <div className="mb-12 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              <span className="text-[#117CFF]">What</span> We&apos;re Building
            </h2>
            <p className="mt-4 text-lg text-muted-foreground">
              Four pillars of the modern trades workflow
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="group rounded-3xl border bg-card p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 p-3">
                <Brain className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#117CFF]">AI-Powered Accuracy</h3>
              <p className="mt-3 text-muted-foreground">
                Advanced damage detection and scope generation that saves hours per claim. Our AI
                sees what the naked eye might miss.
              </p>
            </div>

            <div className="group rounded-3xl border bg-card p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-cyan-500 to-sky-500 p-3">
                <Cloud className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#117CFF]">Weather Intelligence</h3>
              <p className="mt-3 text-muted-foreground">
                Precise storm verification and weather data to support your claims. Property-level
                accuracy that stands up to carrier scrutiny.
              </p>
            </div>

            <div className="group rounded-3xl border bg-card p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 p-3">
                <Zap className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#117CFF]">Seamless Workflow</h3>
              <p className="mt-3 text-muted-foreground">
                From intake to final packet, everything flows in one unified platform. No more
                switching between 5 different tools.
              </p>
            </div>

            <div className="group rounded-3xl border bg-card p-8 transition-all duration-300 hover:-translate-y-2 hover:shadow-xl">
              <div className="mb-4 inline-flex rounded-xl bg-gradient-to-br from-green-500 to-emerald-500 p-3">
                <Network className="h-6 w-6 text-white" />
              </div>
              <h3 className="text-xl font-bold text-[#117CFF]">Network Collaboration</h3>
              <p className="mt-3 text-muted-foreground">
                Connect with verified trades and suppliers to scale your operations. Your network is
                your net worth.
              </p>
            </div>
          </div>
        </section>

        {/* Future Roadmap */}
        <section className="rounded-3xl bg-gradient-to-br from-slate-50 to-slate-100 p-12 dark:from-slate-900 dark:to-slate-800">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              <span className="text-[#117CFF]">Future</span> Roadmap
            </h2>
            <p className="mt-4 text-muted-foreground">Where we&apos;re headed next</p>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {[
              "Deeper geospatial risk models for predictive insights",
              "Advanced carrier compliance automation",
              "Predictive maintenance insights and analytics",
              "Enhanced API integrations with industry tools",
              "Mobile-first field inspection tools",
              "AI-powered negotiation coaching",
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl bg-white p-4 shadow-sm dark:bg-slate-800"
              >
                <span
                  className={`h-2 w-2 rounded-full ${i < 3 ? "bg-[#117CFF]" : "bg-[#FFC838]"}`}
                />
                <span className="text-muted-foreground">{item}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Talk to Damien */}
        <section className="rounded-3xl bg-gradient-to-br from-[#FFC838] to-[#FFB800] p-12 text-center shadow-xl">
          <Users className="mx-auto mb-4 h-12 w-12 text-white" />
          <h2 className="text-3xl font-bold text-white">Want to see SkaiScraper in action?</h2>
          <p className="mx-auto mt-4 max-w-xl text-white/80">
            Reach out directly to Damien Willingham to discuss how SkaiScraper can transform your
            trades operation.
          </p>
          <div className="mt-8 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <a
              href="tel:+14809955820"
              className="rounded-full bg-white px-8 py-3 text-sm font-semibold text-[#117CFF] shadow-lg transition-all hover:scale-105"
            >
              📞 (480) 995-5820
            </a>
            <a
              href="mailto:damien@skaiscrape.com"
              className="rounded-full border-2 border-white/50 px-8 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
            >
              ✉️ damien@skaiscrape.com
            </a>
          </div>
        </section>

        {/* CTA */}
        <section className="text-center">
          <p className="mb-4 text-lg text-muted-foreground">Ready to transform your workflow?</p>
          <Link
            href="/pricing"
            className="inline-block rounded-full bg-gradient-to-r from-[#117CFF] to-[#004AAD] px-10 py-4 text-sm font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            View Pricing
          </Link>
        </section>

        {/* Enterprise Readiness */}
        <div className="mt-12 flex flex-col items-center gap-1 text-center">
          <a
            href="/enterprise-proof/presentation.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/40 transition-colors hover:text-muted-foreground/70"
          >
            Enterprise Readiness ↗
          </a>
          <a
            href="/enterprise-proof/readiness.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/30 transition-colors hover:text-muted-foreground/60"
          >
            Security & Architecture Summary ↗
          </a>
          <a
            href="/enterprise-proof/comparison.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/30 transition-colors hover:text-muted-foreground/60"
          >
            Cost Comparison ↗
          </a>
          <a
            href="/enterprise-proof/vision.html"
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-muted-foreground/25 transition-colors hover:text-muted-foreground/50"
          >
            Market Opportunity & Vision ↗
          </a>
        </div>
      </div>
    </main>
  );
}
