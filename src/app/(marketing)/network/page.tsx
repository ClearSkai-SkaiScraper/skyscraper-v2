import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Eye,
  Hammer,
  Handshake,
  Home,
  Network as NetworkIcon,
  ShieldCheck,
  Wrench,
  XCircle,
} from "lucide-react";
import Link from "next/link";

export const metadata = {
  title: "The SkaiScraper Network | Where Clients and Trades Work as One",
  description:
    "Real-time collaboration between homeowners, contractors, and verified trades — from first inspection to final invoice.",
};

const problems = [
  {
    text: "Trades disconnected from the claim lifecycle",
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  },
  {
    text: "Clients left guessing about progress",
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  },
  {
    text: "Documents live in emails, texts, and screenshots",
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  },
  {
    text: "Zero visibility on retail and financed jobs",
    icon: <XCircle className="h-5 w-5 text-red-500" />,
  },
];

const roles = [
  {
    title: "Clients",
    subtitle: "Homeowners, Business Owners, Property Managers",
    icon: <Home className="h-8 w-8" />,
    color: "emerald",
    features: [
      "See claim and job progress in real time",
      "View documents as they're uploaded",
      "Track milestones (inspection → scope → work → closeout)",
      "No chasing updates — everything flows to you",
    ],
  },
  {
    title: "Contractors",
    subtitle: "Restoration Pros, Adjusters, GCs",
    icon: <Building2 className="h-8 w-8" />,
    color: "blue",
    features: [
      "Central command for claims, jobs, and trades",
      "Share scopes, photos, and documents instantly",
      "Keep everyone aligned without micromanaging",
      "Invite clients to see their job in real time",
    ],
  },
  {
    title: "Trades Professionals",
    subtitle: "Roofing, HVAC, Mitigation, Exteriors",
    icon: <Wrench className="h-8 w-8" />,
    color: "amber",
    features: [
      "Verified company profiles with team members",
      "Live job access — no more chasing info",
      "Upload photos, notes, and completion status",
      "Build reputation through completed work",
    ],
  },
];

const tradesFeatures = [
  { title: "Company-Based Profiles", desc: "Real businesses, not random listings" },
  { title: "Team Members", desc: "Link employees to verified companies" },
  { title: "Work History", desc: "Connected to actual jobs, not marketing fluff" },
  { title: "Grows With You", desc: "Profiles improve with completed work" },
];

export default function MarketingNetworkPage() {
  return (
    <div className="space-y-24 pb-24">
      {/* Hero */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F4DB2] via-[#117CFF] to-[#F6C343] px-6 py-16 text-white shadow-2xl">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(255,255,255,0.12),transparent_25%),radial-gradient(circle_at_80%_0%,rgba(255,255,255,0.16),transparent_28%)]" />
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-2 text-xs font-semibold uppercase tracking-widest">
            <NetworkIcon className="h-4 w-4" /> The SkaiScraper Network
          </div>
          <h1 className="text-4xl font-extrabold leading-tight md:text-5xl lg:text-6xl">
            Where clients and trades
            <br />
            work as one
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-white/90">
            Real-time collaboration between homeowners, contractors, and verified trades — from
            first inspection to final invoice.
          </p>
          <p className="mx-auto mt-4 max-w-xl text-base font-medium italic text-white/80">
            We work better together.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/sign-up"
              className="rounded-full bg-white px-8 py-3 text-sm font-bold text-[#0F4DB2] shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Get Started
              <ArrowRight className="ml-2 inline h-4 w-4" />
            </Link>
            <Link
              href="#how-it-works"
              className="rounded-full border border-white/60 px-8 py-3 text-sm font-semibold text-white/90 transition hover:bg-white/10"
            >
              See How It Works
            </Link>
          </div>
        </div>
      </section>

      {/* The Problem */}
      <section className="px-2">
        <div className="mx-auto max-w-4xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-red-600">
              Industry Truth
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
              The old way is broken
            </h2>
          </div>
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {problems.map((p, i) => (
              <div
                key={i}
                className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-950"
              >
                {p.icon}
                <span className="text-sm font-medium text-red-900 dark:text-red-200">{p.text}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* The Network - Three Roles */}
      <section id="how-it-works" className="px-2">
        <div className="mx-auto max-w-6xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-widest text-[#117CFF]">
              The Solution
            </p>
            <h2 className="mt-2 text-3xl font-bold text-slate-900 dark:text-white">
              A shared workspace for the entire job
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
              SkaiScraper connects clients, contractors, and trades professionals into a single live
              workflow — replacing phone calls, silos, and guesswork with shared clarity.
            </p>
          </div>
          <div className="mt-12 grid gap-8 md:grid-cols-3">
            {roles.map((role) => (
              <div
                key={role.title}
                className={`rounded-2xl border-2 bg-white p-6 shadow-lg transition hover:-translate-y-1 hover:shadow-xl dark:bg-slate-900 ${
                  role.color === "emerald"
                    ? "border-emerald-500/50"
                    : role.color === "blue"
                      ? "border-[#117CFF]/50"
                      : "border-amber-500/50"
                }`}
              >
                <div
                  className={`mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl ${
                    role.color === "emerald"
                      ? "bg-emerald-500/10 text-emerald-600"
                      : role.color === "blue"
                        ? "bg-[#117CFF]/10 text-[#117CFF]"
                        : "bg-amber-500/10 text-amber-600"
                  }`}
                >
                  {role.icon}
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{role.title}</h3>
                <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{role.subtitle}</p>
                <ul className="space-y-2">
                  {role.features.map((f, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-300"
                    >
                      <CheckCircle2
                        className={`mt-0.5 h-4 w-4 flex-shrink-0 ${
                          role.color === "emerald"
                            ? "text-emerald-500"
                            : role.color === "blue"
                              ? "text-[#117CFF]"
                              : "text-amber-500"
                        }`}
                      />
                      {f}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How Trades Profiles Work */}
      <section className="px-2">
        <div className="mx-auto max-w-5xl">
          <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-50 to-white p-8 shadow-xl dark:border-slate-800 dark:from-slate-900 dark:to-slate-800 md:p-12">
            <div className="flex flex-col gap-8 md:flex-row md:items-center">
              <div className="flex-1">
                <p className="text-sm font-semibold uppercase tracking-widest text-amber-600">
                  Trades Directory
                </p>
                <h2 className="mt-2 text-2xl font-bold text-slate-900 dark:text-white">
                  Built for real trades — not directories
                </h2>
                <p className="mt-4 text-slate-600 dark:text-slate-400">
                  This isn&apos;t Angi or Thumbtack. SkaiScraper trades profiles are tied to actual work,
                  real companies, and verified team members.
                </p>
                <div className="mt-6 grid gap-4 sm:grid-cols-2">
                  {tradesFeatures.map((tf) => (
                    <div key={tf.title} className="flex items-start gap-3">
                      <ShieldCheck className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-500" />
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{tf.title}</p>
                        <p className="text-sm text-slate-500 dark:text-slate-400">{tf.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex-shrink-0">
                <div className="flex h-48 w-48 items-center justify-center rounded-2xl bg-amber-500/10">
                  <Hammer className="h-20 w-20 text-amber-500" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Real-Time Transparency */}
      <section className="px-2">
        <div className="mx-auto max-w-4xl text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-[#117CFF]/10 text-[#117CFF]">
            <Eye className="h-8 w-8" />
          </div>
          <h2 className="text-3xl font-bold text-slate-900 dark:text-white">
            Everyone sees the same truth
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-slate-600 dark:text-slate-400">
            Documents shared live. Updates visible instantly. Works for insurance, retail, and
            financed jobs. No more telephone games between parties.
          </p>
          <p className="mx-auto mt-6 max-w-xl text-lg font-semibold italic text-slate-700 dark:text-slate-300">
            This isn&apos;t about software. It&apos;s about accountability and trust.
          </p>
        </div>
      </section>

      {/* Philosophy */}
      <section className="px-2">
        <div className="mx-auto max-w-4xl rounded-3xl border border-slate-200 bg-white p-10 text-center shadow-xl dark:border-slate-800 dark:bg-slate-900">
          <div className="mx-auto mb-6 flex h-14 w-14 items-center justify-center rounded-full bg-[#117CFF]/10 text-[#117CFF]">
            <Handshake className="h-6 w-6" />
          </div>
          <blockquote className="text-2xl font-bold text-slate-900 dark:text-white">
            We believe construction works best when everyone is aligned.
          </blockquote>
          <p className="mx-auto mt-4 max-w-xl text-slate-600 dark:text-slate-400">
            Fewer calls. Fewer surprises. Better outcomes.
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-4">
            <Link
              href="/sign-up"
              className="rounded-full bg-[#117CFF] px-8 py-3 text-sm font-bold text-white shadow-lg transition hover:-translate-y-0.5 hover:shadow-xl"
            >
              Join the Network
            </Link>
            <Link
              href="/contact"
              className="rounded-full border border-slate-300 px-8 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              Build Better Together
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
