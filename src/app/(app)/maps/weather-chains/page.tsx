// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { CloudRain } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";

export default async function WeatherChainsMapsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const targetHref = "/weather-chains";
  return (
    <PageContainer>
      <PageHero
        section="jobs"
        title="Weather Chains"
        subtitle="Historical and event-based weather data for your claims"
        icon={<CloudRain className="h-5 w-5" />}
      >
        <Button asChild>
          <Link href={targetHref}>Open Weather Chains</Link>
        </Button>
      </PageHero>

      <PageSectionCard>
        {/* existing map or placeholder widget here */}
        <div className="flex items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">
            Ready to generate a weather chain for a specific property?
          </p>
          <Link href={targetHref}>
            <Button size="sm">Open Weather Chains</Button>
          </Link>
        </div>
      </PageSectionCard>
    </PageContainer>
  );
}
