import { ArrowRight, Shield, TrendingUp, Users, Zap } from "lucide-react";
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Investors - Dominus AI | Autonomous Claims Intelligence",
  description:
    "Join us in revolutionizing the $80B restoration industry with AI-powered autonomous agents. $40B in recoverable profit awaits.",
};

export default function InvestorsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      {/* Hero */}
      <section className="relative overflow-hidden px-4 pb-16 pt-32">
        <div className="bg-grid-white/[0.02] absolute inset-0 bg-[size:50px_50px]" />
        <div className="absolute inset-0 bg-gradient-to-b from-blue-500/10 via-transparent to-transparent" />
        <div className="relative mx-auto max-w-6xl text-center">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-sm font-medium text-blue-400">
            <Zap className="h-4 w-4" /> Now Raising: $500K Seed Round
          </div>
          <h1 className="mb-6 text-5xl font-bold leading-tight md:text-7xl">
            The Future of Claims <br />
            <span className="bg-gradient-to-r from-blue-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent">
              Is Autonomous
            </span>
          </h1>
          <p className="mx-auto mb-10 max-w-3xl text-xl leading-relaxed text-slate-700 dark:text-slate-300">
            Dominus AI turns contractors into 24/7 AI-powered claims departments. We capture the
            $40B in profit lost annually to administrative chaos.
          </p>
          <a
            href="mailto:damien@skaiscrape.com?subject=Investor Inquiry - Dominus AI"
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-8 py-4 text-lg font-semibold text-white shadow-lg shadow-blue-500/25 transition-all hover:scale-105 hover:bg-blue-700 hover:shadow-blue-500/40"
          >
            Request Deck <ArrowRight className="h-5 w-5" />
          </a>
        </div>
      </section>

      {/* Metrics */}
      <section className="mx-auto grid max-w-6xl gap-8 px-6 pb-24 md:grid-cols-3">
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <TrendingUp className="h-6 w-6 text-blue-400" />
          <h3 className="font-semibold">$80B Market</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">Restoration & roofing claims processing TAM.</p>
        </div>
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <Shield className="h-6 w-6 text-blue-400" />
          <h3 className="font-semibold">AI Defense Layer</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">Bad faith detection + autonomous appeal agents.</p>
        </div>
        <div className="space-y-3 rounded-xl border border-slate-800 bg-slate-900/60 p-6">
          <Users className="h-6 w-6 text-blue-400" />
          <h3 className="font-semibold">Contractor Leverage</h3>
          <p className="text-sm text-slate-700 dark:text-slate-300">Turns small teams into 24/7 AI claims orgs.</p>
        </div>
      </section>

      {/* Closing */}
      <section className="mx-auto max-w-4xl space-y-6 px-6 pb-32 text-center">
        <h2 className="text-3xl font-bold">Raising Strategic Seed</h2>
        <p className="text-slate-700 dark:text-slate-300">
          Funds fuel autonomous claim/rebuttal agents, legal risk intelligence, network flywheel,
          and direct carrier negotiation modules.
        </p>
        <p className="text-sm text-slate-600 dark:text-slate-400">Contact: damien@skaiscrape.com</p>
      </section>
    </div>
  );
}