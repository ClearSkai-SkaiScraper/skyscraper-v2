// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Shield } from "lucide-react";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

export const dynamic = "force-dynamic";

export default async function GovernancePage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="settings"
        title="Governance"
        subtitle="Permissions, audit logs, and compliance settings"
        icon={<Shield className="h-5 w-5" />}
      />
      <div className="py-12 text-center text-muted-foreground">
        <p>This feature is being rebuilt. Check back soon.</p>
      </div>
    </PageContainer>
  );
}
