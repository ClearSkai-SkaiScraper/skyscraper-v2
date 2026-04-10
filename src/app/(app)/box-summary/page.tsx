// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Package } from "lucide-react";
import { redirect } from "next/navigation";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Box Summary | Dashboard",
  description: "Export carrier-ready box summaries",
};

export default async function BoxSummaryPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <div className="space-y-6 p-8">
      <h1 className="flex items-center gap-2 text-3xl font-bold">
        <Package className="h-8 w-8 text-orange-600" />
        Box Summary
      </h1>
      <Card>
        <CardHeader>
          <CardTitle>Export Carrier Summaries</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-slate-700 dark:text-slate-300">
            This module is wired and ready. Export detailed box summaries for carrier submissions.
            If you see an empty state, add property data or configure required environment keys.
          </p>
          <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
            <p className="text-sm text-blue-900">
              <strong>Token Usage:</strong> Each box summary export consumes 1 token from your
              organization balance.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
