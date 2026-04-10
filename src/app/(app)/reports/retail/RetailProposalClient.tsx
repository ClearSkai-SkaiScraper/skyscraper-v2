"use client";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface LeadLite {
  id: string;
  title: string | null;
  status: string | null;
  source: string | null;
}
interface ClaimLite {
  id: string;
  claimNumber: string | null;
  damageType: string | null;
}

export default function RetailProposalClient({
  leads,
  claims,
}: {
  leads: LeadLite[];
  claims: ClaimLite[];
}) {
  const [leadId, setLeadId] = useState("");
  const [claimId, setClaimId] = useState("none");
  const [scope, setScope] = useState(
    "Full exterior restoration including roofing, gutters, and ventilation improvements."
  );
  const [upsell, setUpsell] = useState(
    "Upgrade attic ventilation system, enhanced impact-resistant shingles, reflective underlayment."
  );
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateProposal() {
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/reports/retail/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leadId,
          claimId: claimId === "none" ? null : claimId,
          scope,
          upsell,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to generate proposal");
        setLoading(false);
        return;
      }
      setResult(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <p className="text-sm">
        <a href="/reports/history" className="text-blue-600 hover:underline">
          ← Back to Report History
        </a>
      </p>
      <h1 className="text-2xl font-semibold">Retail Proposal Builder</h1>
      <div className="grid gap-6 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select Lead</label>
            <Select value={leadId} onValueChange={setLeadId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Lead" />
              </SelectTrigger>
              <SelectContent>
                {leads.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.title || l.id} • {l.status || "status"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">(Optional) Link Claim</label>
            <Select value={claimId} onValueChange={setClaimId}>
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="Claim" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">None</SelectItem>
                {claims.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.claimNumber || c.id} • {c.damageType || "damage"}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Project Scope</label>
            <Textarea
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              rows={4}
              className="mt-1"
            />
          </div>
          <div>
            <label className="text-sm font-medium">Upsell Opportunities</label>
            <Textarea
              value={upsell}
              onChange={(e) => setUpsell(e.target.value)}
              rows={3}
              className="mt-1"
            />
          </div>
          <Button disabled={!leadId || loading} onClick={generateProposal} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Proposal"}
          </Button>
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>
        <div className="space-y-4">
          {!result && (
            <div className="rounded-md border p-6 text-sm text-muted-foreground">
              Proposal will appear here.
            </div>
          )}
          {result && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <h2 className="mb-2 text-lg font-semibold">Executive Summary</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.summary}</p>
              </div>
              {Array.isArray(result.lineItems) && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">Line Items</h3>
                  // eslint-disable-next-line react/jsx-no-comment-textnodes
                  <ul className="space-y-2 text-sm">
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    {result.lineItems.map((li: any, i: number) => (
                      <li key={i} className="flex justify-between rounded-md border p-2">
                        <span>{li.item}</span>
                        <span className="text-xs text-muted-foreground">
                          {li.estimatedCost ? `$${li.estimatedCost}` : ""}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(result.upsellRecommendations) && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">Upsell Recommendations</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {result.upsellRecommendations.map((u: string, i: number) => (
                      <li key={i}>{u}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
