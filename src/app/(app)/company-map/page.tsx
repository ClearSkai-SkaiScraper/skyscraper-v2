// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { getCompanyLocations } from "./actions";
import CompanyMapClient from "./CompanyMapClient";

export const dynamic = "force-dynamic";

export default async function CompanyMapPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const locations = await getCompanyLocations();

  return (
    <div className="mx-auto max-w-7xl px-4 py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[color:var(--text)]">Company Map</h1>
        <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
          View all properties, projects, and claims on an interactive map. {locations.length}{" "}
          locations loaded.
        </p>
      </div>

      <CompanyMapClient locations={locations} />

      {locations.length === 0 && (
        <div className="mt-8 rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <h3 className="text-lg font-medium text-yellow-900">No locations yet</h3>
          <p className="mt-2 text-sm text-yellow-700">
            Add properties with addresses to see them on the map. Properties are automatically
            geocoded and displayed here.
          </p>
        </div>
      )}
    </div>
  );
}
