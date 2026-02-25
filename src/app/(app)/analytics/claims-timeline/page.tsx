import { currentUser } from "@clerk/nextjs/server";
import { Calendar, Clock, Filter } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export default async function ClaimsTimelinePage() {
  let user;
  try {
    user = await currentUser();
  } catch {
    redirect("/sign-in");
  }
  if (!user) redirect("/sign-in");

  return (
    <PageContainer>
      <PageHero
        section="command"
        title="Claims Timeline"
        subtitle="Visualize claim lifecycle and identify bottlenecks"
        icon={<Clock className="h-5 w-5" />}
      >
        <div className="flex gap-2">
          <Button variant="outline">
            <Filter className="mr-2 h-4 w-4" />
            Filter
          </Button>
          <Link href="/analytics">
            <Button variant="outline">Back to Analytics</Button>
          </Link>
        </div>
      </PageHero>

      <PageSectionCard>
        {/* Timeline Stats */}
        <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-4">
          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-sm text-slate-400">Avg Time to Close</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-50">0 days</div>
              <p className="mt-1 text-xs text-slate-500">No data yet</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-sm text-slate-400">Active Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-50">0</div>
              <p className="mt-1 text-xs text-slate-500">In progress</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-sm text-slate-400">Overdue Claims</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">0</div>
              <p className="mt-1 text-xs text-slate-500">Needs attention</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/50">
            <CardHeader>
              <CardTitle className="text-sm text-slate-400">Closed This Month</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">0</div>
              <p className="mt-1 text-xs text-slate-500">Successfully closed</p>
            </CardContent>
          </Card>
        </div>

        {/* Timeline Visualization Placeholder */}
        <Card className="mb-6 border-slate-800 bg-slate-900/50">
          <CardHeader>
            <CardTitle className="text-slate-50">Claim Lifecycle Timeline</CardTitle>
            <CardDescription>Visual representation of claim stages and durations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {["New", "Inspection", "Estimate", "Approval", "Payment", "Closed"].map(
                (stage, idx) => (
                  <div key={idx} className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-800 text-sm font-semibold text-slate-400">
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-slate-50">{stage}</div>
                      <div className="text-xs text-slate-500">0 claims</div>
                    </div>
                    <div className="text-sm text-slate-400">0 days avg</div>
                  </div>
                )
              )}
            </div>
          </CardContent>
        </Card>

        {/* Empty State */}
        <Card className="border-slate-800 bg-slate-900/50">
          <CardContent className="flex min-h-[300px] items-center justify-center py-12">
            <div className="max-w-md text-center">
              <Calendar className="mx-auto h-16 w-16 text-slate-600" />
              <h3 className="mt-4 text-lg font-semibold text-slate-400">
                Timeline Visualization Coming Soon
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Interactive timeline view to track claim progress and identify delays
              </p>
              <Link href="/claims">
                <Button className="mt-4 bg-sky-600 hover:bg-sky-700">View All Claims</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageSectionCard>
    </PageContainer>
  );
}
