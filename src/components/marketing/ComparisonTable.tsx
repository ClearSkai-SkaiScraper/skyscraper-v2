"use client";

import { CheckCircle2, Minus, Shield, X } from "lucide-react";

interface ComparisonRow {
  feature: string;
  skaiscraper: "yes" | "partial" | "no";
  acculynx: "yes" | "partial" | "no";
  jobnimbus: "yes" | "partial" | "no";
  generic: "yes" | "partial" | "no";
}

const comparisonData: ComparisonRow[] = [
  {
    feature: "AI Supplement Generation",
    skaiscraper: "yes",
    acculynx: "no",
    jobnimbus: "no",
    generic: "no",
  },
  {
    feature: "Weather Verification (NOAA + Mesonet)",
    skaiscraper: "yes",
    acculynx: "partial",
    jobnimbus: "no",
    generic: "no",
  },
  {
    feature: "ClaimIQ Assembly (17 sections)",
    skaiscraper: "yes",
    acculynx: "partial",
    jobnimbus: "partial",
    generic: "no",
  },
  {
    feature: "Material Estimation & ABC Supply Integration",
    skaiscraper: "yes",
    acculynx: "partial",
    jobnimbus: "no",
    generic: "no",
  },
  {
    feature: "QuickBooks Auto-Sync",
    skaiscraper: "yes",
    acculynx: "yes",
    jobnimbus: "yes",
    generic: "partial",
  },
  {
    feature: "Bad Faith Detection",
    skaiscraper: "yes",
    acculynx: "no",
    jobnimbus: "no",
    generic: "no",
  },
  {
    feature: "Branded Client Portal",
    skaiscraper: "yes",
    acculynx: "yes",
    jobnimbus: "partial",
    generic: "partial",
  },
  {
    feature: "One-Click Data Migration",
    skaiscraper: "yes",
    acculynx: "no",
    jobnimbus: "no",
    generic: "no",
  },
  {
    feature: "AI Damage Report Builder",
    skaiscraper: "yes",
    acculynx: "no",
    jobnimbus: "no",
    generic: "no",
  },
  {
    feature: "Commission Tracking",
    skaiscraper: "yes",
    acculynx: "yes",
    jobnimbus: "partial",
    generic: "no",
  },
  {
    feature: "Claim Velocity Analytics",
    skaiscraper: "yes",
    acculynx: "no",
    jobnimbus: "no",
    generic: "no",
  },
  {
    feature: "Mortgage Check Tracking",
    skaiscraper: "yes",
    acculynx: "partial",
    jobnimbus: "no",
    generic: "no",
  },
];

function StatusIcon({ status }: { status: "yes" | "partial" | "no" }) {
  if (status === "yes") {
    return <CheckCircle2 className="mx-auto h-5 w-5 text-emerald-500" />;
  }
  if (status === "partial") {
    return <Minus className="mx-auto h-5 w-5 text-amber-400" />;
  }
  return <X className="mx-auto h-5 w-5 text-slate-300 dark:text-slate-600" />;
}

export function ComparisonTable() {
  return (
    <section className="px-4">
      <div className="mx-auto max-w-6xl">
        <div className="mb-12 text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-emerald-100 px-4 py-2 dark:bg-emerald-900/30">
            <Shield className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Why Contractors Switch
            </span>
          </div>
          <h2 className="text-4xl font-bold tracking-tight text-slate-900 dark:text-white md:text-5xl">
            SkaiScraper vs. The Rest
          </h2>
          <p className="mx-auto mt-4 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
            Other tools do project management. SkaiScraper does claim intelligence. Here&apos;s what
            you&apos;re missing.
          </p>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700">
                <th className="px-6 py-4 text-left font-semibold text-slate-700 dark:text-slate-300">
                  Feature
                </th>
                <th className="px-4 py-4 text-center">
                  <div className="font-bold text-[#117CFF]">SkaiScraper</div>
                </th>
                <th className="px-4 py-4 text-center">
                  <div className="font-semibold text-slate-500">AccuLynx</div>
                </th>
                <th className="px-4 py-4 text-center">
                  <div className="font-semibold text-slate-500">JobNimbus</div>
                </th>
                <th className="px-4 py-4 text-center">
                  <div className="font-semibold text-slate-500">Generic CRM</div>
                </th>
              </tr>
            </thead>
            <tbody>
              {comparisonData.map((row, idx) => (
                <tr
                  key={row.feature}
                  className={
                    idx % 2 === 0
                      ? "bg-white dark:bg-slate-900"
                      : "bg-slate-50/50 dark:bg-slate-800/30"
                  }
                >
                  <td className="px-6 py-3 font-medium text-slate-800 dark:text-slate-200">
                    {row.feature}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusIcon status={row.skaiscraper} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusIcon status={row.acculynx} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusIcon status={row.jobnimbus} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <StatusIcon status={row.generic} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="mt-6 text-center text-sm text-slate-500 dark:text-slate-500">
          <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-500" /> Full support{" "}
          <Minus className="ml-3 mr-1 inline h-4 w-4 text-amber-400" /> Partial / add-on{" "}
          <X className="ml-3 mr-1 inline h-4 w-4 text-slate-300" /> Not available
        </p>
      </div>
    </section>
  );
}
