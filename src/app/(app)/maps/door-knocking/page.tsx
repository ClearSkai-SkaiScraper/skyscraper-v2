import { DoorOpen } from "lucide-react";
import { Metadata } from "next";
import nextDynamic from "next/dynamic";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";

export const metadata: Metadata = {
  title: "Door Knocking Tracker | SkaiScraper",
  description:
    "Track door-to-door canvassing — drop pins, save notes, tag areas, and plan follow-ups",
};

export const dynamic = "force-dynamic";

// Dynamic import — Mapbox can't run in SSR
const DoorKnockMapClient = nextDynamic(() => import("./_components/DoorKnockMapClient"), {
  ssr: false,
  loading: () => (
    <div className="flex h-[60vh] items-center justify-center rounded-xl border bg-muted/10">
      <div className="text-center">
        <div className="mb-3 text-4xl">🚪</div>
        <p className="text-sm text-muted-foreground">Loading door-knocking map…</p>
      </div>
    </div>
  ),
});

export default function DoorKnockingPage() {
  return (
    <PageContainer maxWidth="full">
      <PageHero
        section="leads"
        title="Door Knocking Tracker"
        subtitle="Drop pins on houses you visit, track outcomes, tag areas, and plan your next moves"
        icon={<DoorOpen className="h-5 w-5" />}
        size="compact"
      />
      <div className="mt-4">
        <DoorKnockMapClient />
      </div>
    </PageContainer>
  );
}
