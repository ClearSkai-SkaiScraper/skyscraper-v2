"use client";

import { useState } from "react";

import { logger } from "@/lib/logger";
import { TRADE_LABELS } from "@/lib/trades/trade-types";

type ContractorPublic = {
  id: string;
  slug: string;
  businessName: string;
  logoUrl?: string | null;
  coverPhotoUrl?: string | null;
  about?: string | null;
  baseCity?: string | null;
  baseState?: string | null;
  baseZip?: string | null;
  trades?: string[] | null;
  services?: { name: string; description?: string }[] | null;
  phone?: string | null;
  email?: string | null;
  website?: string | null;
  verified: boolean;
  gallery?: { url: string; caption?: string }[] | null;
};

export default function ContractorPublicPage({ contractor }: { contractor: ContractorPublic }) {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [details, setDetails] = useState("");
  const [trade, setTrade] = useState<string>("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name) return;

    try {
      setSubmitting(true);
      const res = await fetch("/api/public/submit", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contractorSlug: contractor.slug,
          name,
          email,
          phone,
          address,
          details: { message: details, trade },
          trade,
        }),
      });
      if (!res.ok) {
        logger.error("Failed to submit request");
        return;
      }
      setSubmitted(true);
    } finally {
      setSubmitting(false);
    }
  }

  const humanTrades =
    contractor.trades?.map((t) => TRADE_LABELS.find((x) => x.id === t)?.label || t) || [];

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-slate-900 text-white">
        <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-6 md:flex-row md:items-end">
          <div className="flex items-center gap-4">
            {contractor.logoUrl ? (
              <img
                src={contractor.logoUrl}
                alt={contractor.businessName}
                className="h-14 w-14 rounded-full border border-slate-700 bg-white object-cover"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-full bg-slate-800 text-lg font-semibold">
                {contractor.businessName.charAt(0)}
              </div>
            )}
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-semibold">{contractor.businessName}</h1>
                {contractor.verified && (
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-500/15 px-2 py-0.5 text-[10px] font-medium text-emerald-200">
                    SkaiScraper Verified
                  </span>
                )}
              </div>
              <div className="text-xs text-slate-700 dark:text-slate-300">
                {contractor.baseCity && contractor.baseState
                  ? `${contractor.baseCity}, ${contractor.baseState}`
                  : contractor.baseZip || "Service area available on request"}
              </div>
              {humanTrades.length > 0 && (
                <div className="mt-1 flex flex-wrap gap-1">
                  {humanTrades.slice(0, 3).map((t) => (
                    <span key={t} className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px]">
                      {t}
                    </span>
                  ))}
                  {humanTrades.length > 3 && (
                    <span className="text-[10px] text-slate-700 dark:text-slate-300">
                      +{humanTrades.length - 3} more
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="flex flex-col gap-1 text-xs text-slate-700 dark:text-slate-300 md:ml-auto">
            {contractor.phone && <div>📞 {contractor.phone}</div>}
            {contractor.email && <div>✉️ {contractor.email}</div>}
            {contractor.website && (
              <a
                href={contractor.website}
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-white"
              >
                🌐 Visit website
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto grid max-w-5xl gap-6 px-4 py-8 md:grid-cols-[1.5fr,1fr]">
        <div className="space-y-4">
          {contractor.about && (
            <section className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="mb-1 text-sm font-semibold">About</h2>
              <p className="whitespace-pre-line text-sm text-slate-600">{contractor.about}</p>
            </section>
          )}

          {contractor.services && contractor.services.length > 0 && (
            <section className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold">Services</h2>
              <ul className="space-y-2 text-sm text-slate-600">
                {contractor.services.map((s, idx) => (
                  <li key={idx} className="border-b pb-2 last:border-0 last:pb-0">
                    <div className="font-medium">{s.name}</div>
                    {s.description && (
                      <div className="mt-0.5 text-xs text-slate-500">{s.description}</div>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          )}

          {contractor.gallery && contractor.gallery.length > 0 && (
            <section className="rounded-xl border bg-white p-4 shadow-sm">
              <h2 className="mb-2 text-sm font-semibold">Project Gallery</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {contractor.gallery.slice(0, 6).map((g, idx) => (
                  <figure key={idx} className="space-y-1">
                    <img
                      src={g.url}
                      alt={g.caption || "Project photo"}
                      className="h-28 w-full rounded-lg border object-cover"
                    />
                    {g.caption && (
                      <figcaption className="text-[11px] text-slate-500">{g.caption}</figcaption>
                    )}
                  </figure>
                ))}
              </div>
            </section>
          )}
        </div>

        <section className="space-y-3 rounded-xl border bg-white p-4 shadow-sm">
          <h2 className="text-sm font-semibold">Request Service</h2>
          {submitted ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-700">
              Your request has been sent. The contractor will reach out to you soon. You&apos;ll
              have the option to add them to your Trade Team after they connect with you.
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-2 text-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-600">Name *</label>
                <input
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-md border px-2 py-1.5 text-sm"
                  placeholder="Your name"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-600">Email</label>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="rounded-md border px-2 py-1.5 text-sm"
                  placeholder="you@example.com"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-600">Phone</label>
                <input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="rounded-md border px-2 py-1.5 text-sm"
                  placeholder="(555) 555-5555"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-600">Service address</label>
                <input
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="rounded-md border px-2 py-1.5 text-sm"
                  placeholder="Where is the work needed?"
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
                  <option value="">Choose trade</option>
                  {TRADE_LABELS.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[11px] text-slate-600">What&apos;s going on?</label>
                <textarea
                  value={details}
                  onChange={(e) => setDetails(e.target.value)}
                  className="min-h-[80px] rounded-md border px-2 py-1.5 text-sm"
                  placeholder="Example: Roof leak above kitchen after last storm..."
                />
              </div>
              <button
                type="submit"
                disabled={submitting || !name}
                className="mt-1 inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {submitting ? "Sending..." : "Send Request"}
              </button>
              <p className="text-[10px] text-slate-500">
                Your info goes directly to this contractor. No spam. No reselling your data.
              </p>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
