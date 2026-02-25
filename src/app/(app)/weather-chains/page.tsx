import { currentUser } from "@clerk/nextjs/server";
import { AlertTriangle, CloudRain } from "lucide-react";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

export default async function WeatherChainsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Weather Chains"
        subtitle="Track historical weather events that caused damage to a property"
        icon={<CloudRain className="h-5 w-5" />}
      >
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600" />
            <span className="text-sm font-medium text-amber-600 dark:text-amber-400">
              Coming Soon: Multi-year storm causation analysis
            </span>
          </div>
        </div>
      </PageHero>

      <PageSectionCard>
        <div className="grid gap-6 lg:grid-cols-2">
          <div>
            <h2 className="text-lg font-semibold">Query</h2>
            <form className="mt-4 space-y-4 text-sm" onSubmit={(e) => e.preventDefault()}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Property Address</label>
                <input
                  aria-label="Property Address"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  placeholder="123 Main St"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Historical Span (Years)</label>
                <input
                  aria-label="Historical Span"
                  type="number"
                  className="w-full rounded-lg border border-border bg-background px-3 py-2.5 text-foreground placeholder:text-muted-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
                  defaultValue={5}
                />
              </div>
              <div className="mt-6 flex gap-3">
                <Button type="submit" aria-label="Generate weather chains" disabled>
                  Generate Weather Chains (Coming Soon)
                </Button>
                <Button type="button" variant="outline" disabled>
                  Clear
                </Button>
              </div>
            </form>
          </div>

          <div>
            <h2 className="text-lg font-semibold">Event Timeline</h2>
            <div className="mt-4 min-h-[220px] rounded-lg border border-border bg-muted/30 p-4 text-sm text-muted-foreground">
              <p className="mb-3 font-medium">What you&apos;ll see here:</p>
              <ul className="space-y-2 text-xs">
                <li>• Storm events by date with severity ratings</li>
                <li>• Hail size reports (NOAA verified)</li>
                <li>• Wind speed measurements from nearby stations</li>
                <li>• Lightning strike density maps</li>
                <li>• Radar imagery showing storm paths</li>
              </ul>
              <p className="mt-4 text-xs italic">
                Once live, this tool will help establish causation for insurance claims by showing
                weather patterns over multiple years.
              </p>
            </div>
          </div>
        </div>
      </PageSectionCard>
    </PageContainer>
  );
}
