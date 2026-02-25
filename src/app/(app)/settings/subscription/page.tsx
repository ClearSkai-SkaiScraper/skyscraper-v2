import { currentUser } from "@clerk/nextjs/server";
import { CreditCard } from "lucide-react";
import { redirect } from "next/navigation";

import { SubscriptionClient } from "@/components/billing/SubscriptionClient";
import { PageHero } from "@/components/layout/PageHero";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function SubscriptionPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { orgId } = await getCurrentUserPermissions();

  if (!orgId) {
    redirect("/onboarding/start");
  }

  // Fetch org with subscription data
  const org = await prisma.org.findUnique({
    where: { id: orgId },
    include: {
      BillingSettings: true,
      Subscription: true,
    },
  });

  // Get member count for seat usage - users model doesn't have isActive field
  const memberCount = await prisma.users.count({
    where: {
      orgId: orgId,
    },
  });

  // Get seat limit from plan or default to 5
  const seatLimit = 5; // Org doesn't have seatLimit field

  return (
    <>
      <PageHero
        section="settings"
        title="Subscription Management"
        subtitle="Manage your billing and plan"
        icon={<CreditCard className="h-6 w-6" />}
      />
      <SubscriptionClient
        currentPlanName={null}
        subscriptionStatus={org?.Subscription?.status || null}
        stripeSubscriptionId={org?.Subscription?.stripeSubId || null}
        orgId={orgId}
        seatUsage={{ current: memberCount, limit: seatLimit }}
      />
    </>
  );
}
