import { currentUser } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

import { NetworkInviteForm } from "@/components/network/NetworkInviteForm";
import { Card } from "@/components/ui/card";
import { getCurrentUserPermissions } from "@/lib/permissions";

export default async function NetworkInvitePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const { orgId } = await getCurrentUserPermissions();
  if (!orgId) redirect("/onboarding/start");

  return (
    <div className="container mx-auto max-w-2xl py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Invite to Network</h1>
        <p className="mt-2 text-gray-600">
          Invite vendors or clients to join your network. They&apos;ll receive an email to complete their
          profile.
        </p>
      </div>

      <Card className="p-6">
        <NetworkInviteForm orgId={orgId} />
      </Card>
    </div>
  );
}
