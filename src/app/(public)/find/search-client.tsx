"use client";
/* eslint-disable react/jsx-no-comment-textnodes */

import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";
import { TRADE_LABELS } from "@/lib/trades/trade-types";

type ContractorLite = {
  slug: string;
  businessName: string;
  logoUrl?: string | null;
  baseCity?: string | null;
  baseState?: string | null;
  baseZip?: string | null;
  verified: boolean;
  trades: string[] | null;
};

export default function ContractorsSearchPage({
  initialZip,
  initialTrade,
}: {
  initialZip?: string;
  initialTrade?: string;
}) {
  const [zip, setZip] = useState(initialZip || "");
  const [trade, setTrade] = useState(initialTrade || "");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<ContractorLite[]>([]);
  const [searched, setSearched] = useState(false);

  async function search() {
    if (!zip && !trade) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (zip) params.set("zip", zip);
      if (trade) params.set("trade", trade);
      const res = await fetch(`/api/public/search?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setResults(data.contractors || []);
        setSearched(true);
      } else {
        logger.error(data.error);
      }
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialZip || initialTrade) {
      void search();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mx-auto max-w-5xl space-y-6 py-8">
      <header className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Find a Trusted Pro</h1>
        <p className="text-sm text-slate-600">
          Search for roofers, plumbers, electricians, HVAC, and more. No pay-to-play, no junk leads
          — just real pros who run on SkaiScraper.
        </p>
      </header>

      <div className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
        <div className="grid items-end gap-3 md:grid-cols-[1.2fr,1fr,auto]">
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-600">ZIP code (recommended)</label>
            <input
              className="rounded-md border px-2 py-1.5 text-sm"
              placeholder="86327"
              value={zip}
              onChange={(e) => setZip(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-[11px] text-slate-600">Trade</label>
            <select
              title="Trade"
              className="rounded-md border px-2 py-1.5 text-sm"
              value={trade}
              onChange={(e) => setTrade(e.target.value)}
            >
              <option value="">Any trade</option>
              {TRADE_LABELS.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <button
            onClick={search}
            disabled={loading || (!zip && !trade)}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800 disabled:opacity-50"
          >
            {loading ? "Searching..." : "Search"}
          </button>
        </div>
        <p className="text-[11px] text-slate-500">
          Pro tip: add each pro you like to your <strong>Trade Team</strong> so you always know who
          to call when something breaks.
        </p>
      </div>

      {searched && results.length === 0 && (
        <div className="rounded-xl border border-dashed bg-slate-50 px-4 py-6 text-sm text-slate-600">
          No contractors found yet for that area/trade. Try widening the search or check back soon
          as more pros join the network.
        </div>
      )}

      {results.length > 0 && (
        <div className="grid gap-4 md:grid-cols-2">
          {results.map((c) => (
            <a
              key={c.slug}
              href={`/c/${c.slug}`}
              className="flex flex-col gap-3 rounded-xl border bg-white p-4 shadow-sm transition-shadow hover:shadow-md"
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            >
              <div className="flex items-center gap-3">
                {c.logoUrl ? (
                  <img
                    src={c.logoUrl}
                    alt={c.businessName}
                    className="h-10 w-10 rounded-full border object-cover"
                  />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold">
                    {c.businessName.charAt(0)}
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-semibold">{c.businessName}</span>
                  <span className="text-[11px] text-slate-500">
                    {c.baseCity && c.baseState
                      ? `${c.baseCity}, ${c.baseState}`
                      : c.baseZip || "Location available in profile"}
                  </span>
                </div>
                {c.verified && (
                  <span className="ml-auto rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-medium text-emerald-700">
                    Verified
                  </span>
                )}
              </div>
              {Array.isArray(c.trades) && c.trades.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {c.trades.slice(0, 3).map((t) => {
                    const label = TRADE_LABELS.find((x) => x.id === t)?.label || t;
                    return (
                      <span
                        key={t}
                        className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] text-slate-700"
                      >
                        {label}
                      </span>
                    );
                  })}
                  {c.trades.length > 3 && (
                    <span className="text-[10px] text-slate-500">+{c.trades.length - 3} more</span>
                  )}
                </div>
              )}
              <div className="text-[11px] text-slate-600">
                Click to view profile & request service →
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
