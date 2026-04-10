// eslint-disable-next-line simple-import-sort/imports, no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";


import { getJobsForMap } from "./actions";
import JobsMapClient from "./JobsMapClient";

export const dynamic = "force-dynamic";

export default async function JobsMapPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // eslint-disable-next-line no-restricted-syntax
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const jobs = await getJobsForMap();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[color:var(--text)]">Jobs Map</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          View all active jobs and projects on an interactive map. {jobs.length} jobs loaded.
        </p>
      </div>

      {!token && (
        <div className="mb-6 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800">
          Mapbox token missing or not loaded. Set NEXT_PUBLIC_MAPBOX_TOKEN to enable map rendering.
        </div>
      )}
      <JobsMapClient jobs={jobs} />

      {jobs.length === 0 && (
        <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h3 className="text-lg font-medium text-yellow-900">No jobs yet</h3>
          <p className="mt-2 text-sm text-yellow-700">
            Create projects and jobs with addresses to see them on the map.
          </p>
        </div>
      )}
    </div>
  );
}
