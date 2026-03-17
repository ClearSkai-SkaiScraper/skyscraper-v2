import { currentUser } from "@clerk/nextjs/server";
import { CloudRain } from "lucide-react";
import { redirect } from "next/navigation";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

import { WeatherChainsClient } from "./WeatherChainsClient";

export const dynamic = "force-dynamic";

export default async function WeatherChainsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  return (
    <PageContainer>
      <PageHero
        section="claims"
        title="Weather Chains"
        subtitle="Research historical weather events that caused damage to a property"
        icon={<CloudRain className="h-5 w-5" />}
      />
      <WeatherChainsClient />
    </PageContainer>
  );
}
