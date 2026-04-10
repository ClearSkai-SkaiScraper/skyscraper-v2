/* eslint-disable @typescript-eslint/await-thenable */
// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import { Network } from "lucide-react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { TradesFeed } from "@/components/trades/TradesFeed";

export default async function TradesFeedPage() {
  const { userId } = await auth();

  return (
    <PageContainer maxWidth="5xl">
      <PageHero
        title="Trades Network"
        description="Connect with contractors, share projects, and discover opportunities"
        icon={<Network className="h-6 w-6" />}
        section="trades"
      />
      <TradesFeed isAuthenticated={!!userId} />
    </PageContainer>
  );
}
