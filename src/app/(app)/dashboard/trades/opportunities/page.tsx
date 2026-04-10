/**
 * Pro Opportunities Page
 * Displays auto-matched job opportunities from the matching engine
 */

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import OpportunityCard from "./OpportunityCard";

export default async function OpportunitiesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <div className="space-y-6 text-foreground">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold md:text-4xl">Job Opportunities</h1>
        <p className="text-sm text-muted-foreground">
          Auto-matched jobs based on your location, specialties, and availability. These are updated
          every 5 minutes by our matching engine.
        </p>
      </div>
      <OpportunityCard />
    </div>
  );
}
