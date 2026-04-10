/**
 * Pro Connections Page
 * Displays incoming connection requests from clients
 */

// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import ConnectionRequestCard from "./ConnectionRequestCard";

export default async function ConnectionsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <div className="space-y-6 text-foreground">
      <div className="space-y-2">
        <h1 className="text-3xl font-semibold md:text-4xl">Connection Requests</h1>
        <p className="text-sm text-muted-foreground">
          Review and respond to client requests. Accepting a request automatically creates a lead in
          your CRM.
        </p>
      </div>
      <ConnectionRequestCard />
    </div>
  );
}
