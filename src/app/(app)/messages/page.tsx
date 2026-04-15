import { MessageSquare } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import MessagesClient from "@/components/messages/MessagesClient";
import { getOrg } from "@/lib/org/getOrg";

export const dynamic = "force-dynamic";

export default async function MessagesPage() {
  // Use getOrg with mode: "required" - redirects to /sign-in or /onboarding if no org
  const orgResult = await getOrg({ mode: "required" });

  // If we get here, org is guaranteed (otherwise would have redirected)
  if (!orgResult.ok) {
    throw new Error("Unexpected: getOrg(required) returned not ok without redirecting");
  }

  return (
    <PageContainer>
      <PageHero
        title="Messages"
        subtitle="Centralized communication between your team, clients, and carriers"
        icon={<MessageSquare className="h-6 w-6" />}
        section="network"
      />
      <MessagesClient userId={orgResult.userId} orgId={orgResult.orgId} />
    </PageContainer>
  );
}
