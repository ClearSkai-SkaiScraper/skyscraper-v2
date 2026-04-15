"use client";
// /maps/routes/page.tsx
import { useUser } from "@clerk/nextjs";
import { Navigation } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";
import useClaimProperties from "@/hooks/useClaimProperties";

export const dynamic = "force-dynamic";

export default function RoutesOptimizerPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.push("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn)
    return <div className="flex h-screen items-center justify-center">Loading...</div>;

  return <RoutesOptimizerClient />;
}

function RoutesOptimizerClient() {
  const claims = useClaimProperties();
  const [stops, setStops] = useState<string[]>([]);
  const [newStop, setNewStop] = useState("");

  function addStop() {
    if (newStop.trim()) {
      setStops([...stops, newStop.trim()]);
      setNewStop("");
    }
  }
  function removeStop(i: number) {
    setStops(stops.filter((_, idx) => idx !== i));
  }

  return (
    <PageContainer>
      <PageHero
        section="leads"
        title="Route Optimizer"
        subtitle="Plan efficient multi-stop field routes"
        icon={<Navigation className="h-5 w-5" />}
      />
      <PageSectionCard>
        <div className="grid gap-6 lg:grid-cols-[1.4fr,1fr]">
          <div className="space-y-4">
            <div className="space-y-4 rounded-xl border border-border bg-card p-6 shadow-sm">
              <h2 className="text-lg font-semibold text-foreground">Stops</h2>
              <div className="flex gap-2">
                <input
                  value={newStop}
                  onChange={(e) => setNewStop(e.target.value)}
                  placeholder="Address or Claim #"
                  className="flex-1 rounded-lg border border-border bg-background px-4 py-3 text-sm text-foreground placeholder-muted-foreground shadow-sm focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
                <Button onClick={addStop} disabled={!newStop.trim()}>
                  Add
                </Button>
              </div>
              <ul className="space-y-2 text-sm">
                {stops.map((s, i) => (
                  <li key={s + i} className="flex items-center gap-2 rounded-lg bg-muted/50 p-3">
                    <span className="flex-1 truncate text-foreground">{s}</span>
                    <button
                      onClick={() => removeStop(i)}
                      className="text-muted-foreground transition-colors hover:text-red-500"
                    >
                      ✕
                    </button>
                  </li>
                ))}
                {stops.length === 0 && (
                  <li className="rounded-lg bg-muted/30 p-4 text-center text-muted-foreground">
                    No stops added yet. Enter an address or claim # above.
                  </li>
                )}
              </ul>
            </div>
            <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground shadow-sm">
              <div className="flex items-center gap-2">
                <span className="text-lg">🧭</span>
                <span>Optimization engine ready – add stops to generate optimal route.</span>
              </div>
            </div>
          </div>
          <div className="space-y-4">
            <div className="rounded-xl border border-border bg-card p-6 shadow-sm">
              <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                <span className="text-lg">📍</span> Claim Properties
              </h3>
              <ul className="max-h-64 space-y-2 overflow-auto text-sm">
                {claims.map((c) => (
                  <li
                    key={c.id}
                    className="flex items-center justify-between rounded-lg bg-muted/50 p-3 text-foreground"
                  >
                    <span className="font-medium">{c.claimNumber}</span>
                    <span className="text-muted-foreground">{c.property}</span>
                  </li>
                ))}
                {claims.length === 0 && (
                  <li className="rounded-lg bg-muted/30 p-4 text-center text-muted-foreground">
                    No claim properties loaded.
                  </li>
                )}
              </ul>
            </div>
          </div>
        </div>
      </PageSectionCard>
    </PageContainer>
  );
}
