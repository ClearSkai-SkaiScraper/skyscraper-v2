// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getScheduledStops } from "./actions";
import RouteOptimizationClient from "./RouteOptimizationClient";

export const dynamic = "force-dynamic";

export default async function RouteOptimizationPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const stops = await getScheduledStops();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[color:var(--text)]">Route Optimization</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          Optimize routes for inspections and jobs. {stops.length} stops loaded.
        </p>
      </div>

      <RouteOptimizationClient stops={stops} />
    </div>
  );
}
