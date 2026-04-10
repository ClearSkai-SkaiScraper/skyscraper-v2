"use client";
import { Loader2 } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

interface ClaimLite { id: string; claimNumber: string | null; damageType: string | null; lossDate: Date | string | null; }

export default function ClaimAppealClient({ claims, initialClaimId }: { claims: ClaimLite[]; initialClaimId?: string }) {
  const [claimId, setClaimId] = useState(initialClaimId || "");
  const [objective, setObjective] = useState("Carrier denial due to alleged insufficient damage scope – seeking full coverage reconsideration.");
  const [tone, setTone] = useState("professional");
  const [includeBadFaith, setIncludeBadFaith] = useState(true);
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  async function generateAppeal() {
    setLoading(true); setError(null); setResult(null);
    try {
      const res = await fetch(`/api/claims/${claimId}/appeal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ objective, tone, includeBadFaith }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      setResult(data);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (e:any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container mx-auto space-y-6 p-6">
      <h1 className="text-2xl font-semibold">Claim Appeal Builder</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium">Select Claim</label>
            <Select value={claimId} onValueChange={setClaimId}>
              <SelectTrigger className="mt-1"><SelectValue placeholder="Choose claim" /></SelectTrigger>
              <SelectContent>
                {claims.map(c => (
                  <SelectItem key={c.id} value={c.id}>{c.claimNumber || c.id} • {c.damageType || "Damage"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium">Appeal Objective</label>
            <Textarea value={objective} onChange={e=>setObjective(e.target.value)} rows={4} className="mt-1" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="text-sm font-medium">Tone</label>
              <Select value={tone} onValueChange={setTone}>
                <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="professional">Professional</SelectItem>
                  <SelectItem value="firm">Firm</SelectItem>
                  <SelectItem value="legal">Legal</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <label className="mt-5 flex items-center gap-2 text-sm">
                <input type="checkbox" checked={includeBadFaith} onChange={e=>setIncludeBadFaith(e.target.checked)} /> Include Bad Faith Analysis
              </label>
            </div>
          </div>
          <Button disabled={!claimId || loading} onClick={generateAppeal} className="w-full">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Generate Appeal"}
          </Button>
          {error && <div className="rounded-md bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        </div>
        <div className="space-y-4">
          {!result && <div className="rounded-md border p-6 text-sm text-muted-foreground">Result will appear here after generation.</div>}
          {result && (
            <div className="space-y-6">
              <div className="rounded-lg border p-4">
                <h2 className="mb-2 text-lg font-semibold">Appeal Letter</h2>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{result.appealLetter}</p>
              </div>
              {Array.isArray(result.sections) && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">Sections</h3>
                  // eslint-disable-next-line react/jsx-no-comment-textnodes
                  <ul className="space-y-2 text-sm">
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    {result.sections.map((s:any,i:number)=>(
                      <li key={i} className="rounded-md border p-2">
                        <div className="flex justify-between"><span className="font-semibold">{s.title}</span><span className="text-xs uppercase tracking-wide text-muted-foreground">{s.strength}</span></div>
                        <p className="mt-1 text-xs leading-relaxed">{s.summary}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {Array.isArray(result.recommendedActions) && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">Recommended Actions</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {result.recommendedActions.map((a:string,i:number)=>(<li key={i}>{a}</li>))}
                  </ul>
                </div>
              )}
              {Array.isArray(result.citations) && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">Citations</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {result.citations.map((c:string,i:number)=>(<li key={i}>{c}</li>))}
                  </ul>
                </div>
              )}
              {Array.isArray(result.attachments) && (
                <div className="rounded-lg border p-4">
                  <h3 className="mb-2 font-medium">Suggested Attachments</h3>
                  <ul className="list-disc space-y-1 pl-5 text-sm">
                    {result.attachments.map((c:string,i:number)=>(<li key={i}>{c}</li>))}
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