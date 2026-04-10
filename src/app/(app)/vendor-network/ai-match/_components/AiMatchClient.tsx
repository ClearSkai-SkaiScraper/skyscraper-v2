/**
 * VIN — AI Match Client
 * Form → POST /api/vin/ai-match → Scored vendor matches + AI suggestions
 */

"use client";

import {
  Building2,
  CreditCard,
  Gift,
  Loader2,
  Phone,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { TRADE_TYPE_LABELS } from "@/lib/vendors/vin-types";

interface MatchResult {
  vendor: {
    id: string;
    name: string;
    slug: string;
    logo: string | null;
    category: string;
    tradeTypes: string[];
    vendorTypes: string[];
    rating: number | null;
    reviewCount: number | null;
    isFeatured: boolean;
    isVerified: boolean;
    financingAvail: boolean;
    rebatesAvail: boolean;
    emergencyPhone: string | null;
    primaryPhone: string | null;
    certifications: string[];
  };
  score: number;
  reasons: string[];
}

interface AiSuggestion {
  vendorId: string;
  vendorName: string;
  headline: string;
  reason: string;
}

interface FormData {
  trade: string;
  zip: string;
  urgency: "low" | "medium" | "high" | "emergency";
  budget: string;
  description: string;
}

export function AiMatchClient() {
  const [form, setForm] = useState<FormData>({
    trade: "",
    zip: "",
    urgency: "medium",
    budget: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);
  const [matches, setMatches] = useState<MatchResult[]>([]);
  const [suggestions, setSuggestions] = useState<AiSuggestion[]>([]);
  const [searched, setSearched] = useState(false);

  const runMatch = async () => {
    if (!form.trade) {
      toast.error("Select a trade to match");
      return;
    }
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch("/api/vin/ai-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trade: form.trade,
          zip: form.zip || undefined,
          urgency: form.urgency,
          budget: form.budget ? parseFloat(form.budget) : undefined,
          description: form.description || undefined,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setMatches(data.matches);
        setSuggestions(data.aiSuggestions || []);
      } else {
        toast.error(data.error || "Match failed");
      }
    } catch {
      toast.error("AI match request failed");
    } finally {
      setLoading(false);
    }
  };

  const tradeOptions = Object.entries(TRADE_TYPE_LABELS);

  return (
    <div className="space-y-6">
      {/* Input Form */}
      <Card className="p-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {/* Trade */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Trade *</label>
            <select
              value={form.trade}
              onChange={(e) => setForm((f) => ({ ...f, trade: e.target.value }))}
              aria-label="Select trade"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="">Select trade…</option>
              {tradeOptions.map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </select>
          </div>

          {/* ZIP */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">ZIP Code</label>
            <Input
              placeholder="e.g. 85001"
              value={form.zip}
              onChange={(e) => setForm((f) => ({ ...f, zip: e.target.value }))}
            />
          </div>

          {/* Urgency */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Urgency</label>
            <select
              value={form.urgency}
              onChange={(e) =>
                setForm((f) => ({ ...f, urgency: e.target.value as FormData["urgency"] }))
              }
              aria-label="Select urgency"
              className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="emergency">Emergency</option>
            </select>
          </div>

          {/* Budget */}
          <div>
            <label className="mb-1.5 block text-sm font-medium">Budget ($)</label>
            <Input
              type="number"
              placeholder="e.g. 15000"
              value={form.budget}
              onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
            />
          </div>
        </div>

        {/* Description */}
        <div className="mt-4">
          <label className="mb-1.5 block text-sm font-medium">Project Description (optional)</label>
          <textarea
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
            rows={3}
            placeholder="Describe the scope — helps AI refine matches…"
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
          />
        </div>

        <div className="mt-4 flex justify-end">
          <Button onClick={runMatch} disabled={loading}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Find Best Vendors
          </Button>
        </div>
      </Card>

      {/* AI Suggestions */}
      {suggestions.length > 0 && (
        <Card className="border-primary/30 bg-primary/5 p-5">
          <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-primary">
            <Sparkles className="h-4 w-4" /> AI Recommendations
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {suggestions.map((s) => (
              <div
                key={s.vendorId}
                className="rounded-lg border border-primary/20 bg-background p-3"
              >
                <h4 className="text-sm font-semibold">{s.vendorName}</h4>
                <p className="text-xs font-medium text-primary">{s.headline}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.reason}</p>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Match Results */}
      {searched && !loading && (
        <>
          <h2 className="text-lg font-semibold">
            {matches.length} Vendor{matches.length !== 1 && "s"} Matched
          </h2>

          {matches.length === 0 ? (
            <Card className="p-12 text-center">
              <Search className="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
              <h3 className="text-lg font-semibold">No matches found</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                Try adjusting your criteria or selecting a different trade.
              </p>
            </Card>
          ) : (
            <div className="space-y-4">
              {matches.map((m, idx) => (
                <Card key={m.vendor.id} className="overflow-hidden">
                  <div className="flex items-start gap-4 p-5">
                    {/* Rank */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-lg font-bold text-primary">
                      {idx + 1}
                    </div>

                    {/* Logo */}
                    {m.vendor.logo ? (
                      <img
                        src={m.vendor.logo}
                        alt={m.vendor.name}
                        className="h-12 w-12 rounded-lg border object-contain"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg border bg-muted">
                        <Building2 className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Content */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base font-semibold">{m.vendor.name}</h3>
                        {m.vendor.isVerified && <ShieldCheck className="h-4 w-4 text-green-600" />}
                        {m.vendor.isFeatured && (
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{m.vendor.category}</p>

                      {/* Match Score */}
                      <div className="mt-2 flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                          <Zap className="h-4 w-4 text-primary" />
                          <span className="text-sm font-bold text-primary">{m.score}% match</span>
                        </div>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                          <div
                            className="h-full rounded-full bg-primary transition-all"
                            {...{ style: { width: `${m.score}%` } }}
                          />
                        </div>
                      </div>

                      {/* Reasons */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.reasons.map((r, i) => (
                          <Badge key={i} variant="outline" className="text-xs">
                            {r}
                          </Badge>
                        ))}
                      </div>

                      {/* Feature tags */}
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {m.vendor.financingAvail && (
                          <span className="inline-flex items-center gap-1 rounded bg-blue-50 px-2 py-0.5 text-xs text-blue-700">
                            <CreditCard className="h-3 w-3" /> Financing
                          </span>
                        )}
                        {m.vendor.rebatesAvail && (
                          <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-xs text-green-700">
                            <Gift className="h-3 w-3" /> Rebates
                          </span>
                        )}
                        {m.vendor.emergencyPhone && (
                          <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs text-red-700">
                            <Phone className="h-3 w-3" /> Emergency
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col gap-2">
                      <Link href={`/vendor-network/${m.vendor.slug}`}>
                        <Button size="sm" className="w-full">
                          View
                        </Button>
                      </Link>
                      {m.vendor.primaryPhone && (
                        <a href={`tel:${m.vendor.primaryPhone}`}>
                          <Button size="sm" variant="outline" className="w-full">
                            <Phone className="mr-1 h-3 w-3" /> Call
                          </Button>
                        </a>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
