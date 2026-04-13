// src/app/(marketing)/pricing/page.tsx
import { Check, Shield, Users, Zap } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { Button } from "@/components/ui/button";

import SeatCalculatorWidget from "./SeatCalculatorWidget";

export const metadata: Metadata = {
  title: "Pricing – SkaiScraper",
  description:
    "Simple, transparent pricing. $80 per seat per month. No tiers, no minimums, no hidden fees. Scale from 1 to 500 seats.",
  alternates: {
    canonical: "/pricing",
  },
  openGraph: {
    title: "Pricing – SkaiScraper",
    description:
      "Simple, transparent pricing. $80 per seat per month. No tiers, no minimums, no hidden fees.",
  },
};
// Page can be static — SeatCalculatorWidget is a client island
export const revalidate = 3600;

const PRICE_PER_SEAT = 80;

// JSON-LD structured data for pricing (M6 Enhancement)
const pricingJsonLd = {
  "@context": "https://schema.org",
  "@type": "Product",
  name: "SkaiScraper Pro",
  description:
    "AI-powered operations hub for roofing and restoration contractors. Includes damage detection, weather verification, claims management, and client portal.",
  brand: {
    "@type": "Brand",
    name: "SkaiScraper",
  },
  offers: {
    "@type": "Offer",
    price: "80.00",
    priceCurrency: "USD",
    priceValidUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    availability: "https://schema.org/InStock",
    url: "https://skaiscrape.com/pricing",
    description: "Per seat, per month. No minimums, no hidden fees.",
    seller: {
      "@type": "Organization",
      name: "ClearSkai Technologies",
    },
  },
};

const EXAMPLES = [
  { seats: 1, label: "Solo Operator" },
  { seats: 5, label: "Small Crew" },
  { seats: 10, label: "Growing Team" },
  { seats: 25, label: "Regional Branch" },
  { seats: 50, label: "Multi-Crew" },
  { seats: 100, label: "Mid-Market" },
  { seats: 200, label: "Enterprise" },
  { seats: 500, label: "Max Scale" },
];

const FEATURES = [
  "Unlimited claims & leads",
  "Full AI-powered damage reports",
  "Quick DOL & weather verification",
  "Crew scheduling & management",
  "Client portal & notifications",
  "Pipeline & CRM tools",
  "Real-time team analytics",
  "Custom branding & white-label PDFs",
  "Supplement builder with carrier intelligence",
  "Photo AI mockups & roof measurements",
  "Stripe billing portal & invoices",
  "Priority support & onboarding",
];

export default function PricingPage() {
  return (
    <main className="min-h-screen bg-background">
      {/* JSON-LD Structured Data (M6) */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(pricingJsonLd) }}
      />
      {/* ── Hero ───────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden bg-gradient-to-br from-[#117CFF] via-[#0066DD] to-[#004AAD] py-24 text-white">
        <div className="absolute inset-0 bg-[url('/grid.svg')] opacity-10" />
        <div className="absolute -right-40 -top-40 h-80 w-80 rounded-full bg-[#FFC838]/20 blur-3xl" />
        <div className="absolute -bottom-20 -left-20 h-60 w-60 rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 backdrop-blur-sm">
            <Zap className="h-4 w-4 text-[#FFC838]" />
            <span className="text-sm font-medium">One Price. Every Feature. Zero Surprises.</span>
          </div>

          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl md:text-6xl">
            <span className="bg-gradient-to-r from-[#FFC838] to-[#FFD970] bg-clip-text text-transparent">
              $80
            </span>{" "}
            per seat / month
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/80">
            No tiers. No minimums. No discount ladders. Just{" "}
            <strong className="text-white">$80 per active seat per month</strong>, with every
            feature unlocked from day one. Scale from 1 to 500 seats.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Button
              asChild
              size="lg"
              className="rounded-full bg-[#FFC838] px-8 text-slate-900 hover:bg-[#FFD970]"
            >
              <Link href="/sign-up">Start Free Beta</Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="rounded-full border-white/30 px-8 text-white hover:bg-white/10"
            >
              <Link href="#calculator">See Pricing Calculator ↓</Link>
            </Button>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 lg:px-8">
        {/* ── Pricing Calculator ───────────────────────────────────── */}
        <section id="calculator" className="scroll-mt-8">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Pricing <span className="text-[#117CFF]">Calculator</span>
            </h2>
            <p className="mt-2 text-muted-foreground">
              Pick your team size, see exactly what you&apos;ll pay, and subscribe instantly.
            </p>
          </div>

          {/* Interactive Seat Calculator */}
          <SeatCalculatorWidget />

          {/* Quick Reference Grid */}
          <div className="mt-12">
            <h3 className="mb-4 text-center text-lg font-semibold text-muted-foreground">
              Quick Reference
            </h3>
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-4">
              {EXAMPLES.map(({ seats, label }) => (
                <div
                  key={seats}
                  className="rounded-2xl border bg-card p-6 text-center transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    {label}
                  </div>
                  <div className="mt-2 flex items-center justify-center gap-1">
                    <Users className="h-4 w-4 text-[#117CFF]" />
                    <span className="text-lg font-bold">
                      {seats} seat{seats !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="mt-3 text-3xl font-bold text-[#117CFF]">
                    ${(seats * PRICE_PER_SEAT).toLocaleString()}
                  </div>
                  <div className="text-sm text-muted-foreground">per month</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    ${(seats * PRICE_PER_SEAT * 12).toLocaleString()}/year
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Everything Included ──────────────────────────────────── */}
        <section className="mt-24">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              Everything <span className="text-[#117CFF]">Included</span>
            </h2>
            <p className="mt-2 text-muted-foreground">
              Every seat gets full access to every feature. No feature gates, no add-ons.
            </p>
          </div>

          <div className="mx-auto max-w-3xl">
            <div className="grid gap-3 sm:grid-cols-2">
              {FEATURES.map((feature) => (
                <div key={feature} className="flex items-start gap-3 rounded-xl border bg-card p-4">
                  <Check className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#117CFF]" />
                  <span className="text-sm text-foreground">{feature}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How It Works ─────────────────────────────────────────── */}
        <section className="mt-24">
          <div className="mb-8 text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              How <span className="text-[#117CFF]">Billing Works</span>
            </h2>
          </div>

          <div className="mx-auto grid max-w-4xl gap-6 md:grid-cols-3">
            <div className="rounded-2xl border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#117CFF]/10 text-xl font-bold text-[#117CFF]">
                1
              </div>
              <h3 className="font-semibold">Pick Your Seats</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Choose 1 to 500 seats. Each seat is one active team member with full platform
                access.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#117CFF]/10 text-xl font-bold text-[#117CFF]">
                2
              </div>
              <h3 className="font-semibold">Scale Anytime</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Add or remove seats whenever you need. Stripe automatically handles prorated charges
                and credits.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6 text-center">
              <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#117CFF]/10 text-xl font-bold text-[#117CFF]">
                3
              </div>
              <h3 className="font-semibold">One Invoice</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Clean monthly invoice. No surprise charges. Cancel anytime from the Stripe billing
                portal.
              </p>
            </div>
          </div>
        </section>

        {/* ── FAQ ──────────────────────────────────────────────────── */}
        <section className="mt-24 space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight">
              <span className="text-[#117CFF]">Frequently</span> Asked Questions
            </h2>
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <div className="rounded-2xl border bg-card p-6">
              <p className="font-semibold text-foreground">
                Why per-seat pricing instead of tiers?
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Tiers create artificial limits and upgrade pressure. With per-seat pricing, a solo
                operator pays the same rate as a 200-person company. Everyone gets every feature.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <p className="font-semibold text-foreground">Can I add seats mid-month?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes! Stripe prorates automatically. If you add 5 seats halfway through the month,
                you only pay for the remaining days.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <p className="font-semibold text-foreground">What counts as a &ldquo;seat&rdquo;?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                A seat is one team member who can log in and use the platform. Each user needs their
                own seat. Client portal access is free and unlimited.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <p className="font-semibold text-foreground">Is there a free trial?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                During our beta period, everything is free. After beta, all new accounts get a 3-day
                free trial with full access to evaluate the platform.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <p className="font-semibold text-foreground">Do you offer enterprise discounts?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Our pricing is already competitive at scale. For 100+ seats, contact us to discuss
                custom onboarding and support packages.
              </p>
            </div>
            <div className="rounded-2xl border bg-card p-6">
              <p className="font-semibold text-foreground">Can I cancel anytime?</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Yes. No contracts, no cancellation fees. Cancel from the Stripe billing portal and
                keep access until the end of your billing period.
              </p>
            </div>
          </div>
        </section>

        {/* ── Contact CTA ──────────────────────────────────────────── */}
        <section className="mt-24">
          <div className="rounded-3xl bg-gradient-to-br from-[#117CFF] to-[#004AAD] p-12 text-center text-white shadow-2xl">
            <Shield className="mx-auto mb-4 h-8 w-8 text-[#FFC838]" />
            <h3 className="text-2xl font-bold">Ready to onboard your team?</h3>
            <p className="mt-4 text-white/80">
              Talk directly with our team for custom onboarding, training, and support.
            </p>
            <div className="mt-6 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
              <a
                href="tel:+14809955820"
                className="rounded-full bg-white px-6 py-3 text-sm font-semibold text-[#117CFF] transition-all hover:scale-105"
              >
                Call (480) 995-5820
              </a>
              <a
                href="mailto:damien@skaiscrape.com"
                className="rounded-full border-2 border-white/30 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                damien@skaiscrape.com
              </a>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
