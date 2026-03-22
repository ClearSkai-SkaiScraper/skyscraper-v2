import { CloudRain, Compass, DoorOpen, Map, Route } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Maps & Field Tools | SkaiScraper",
  description: "Interactive maps, door-knocking, routing, and weather intelligence",
};

const MAP_TOOLS = [
  {
    href: "/maps/map-view",
    title: "Map View",
    description: "Interactive map of all jobs, leads, and vendor locations.",
    icon: Map,
    color: "text-blue-600 dark:text-blue-400",
    bg: "bg-blue-50 dark:bg-blue-950/30",
  },
  {
    href: "/maps/door-knocking",
    title: "Door Knocking",
    description: "Plan and track door-to-door canvassing campaigns.",
    icon: DoorOpen,
    color: "text-orange-600 dark:text-orange-400",
    bg: "bg-orange-50 dark:bg-orange-950/30",
  },
  {
    href: "/maps/routes",
    title: "Route Planner",
    description: "Optimize driving routes across multiple job sites.",
    icon: Route,
    color: "text-green-600 dark:text-green-400",
    bg: "bg-green-50 dark:bg-green-950/30",
  },
  {
    href: "/maps/weather",
    title: "Weather Intel",
    description: "Real-time weather overlays and storm tracking.",
    icon: CloudRain,
    color: "text-purple-600 dark:text-purple-400",
    bg: "bg-purple-50 dark:bg-purple-950/30",
  },
  {
    href: "/maps/weather-chains",
    title: "Storm Chains",
    description: "Historical storm chain analysis for claims support.",
    icon: Compass,
    color: "text-red-600 dark:text-red-400",
    bg: "bg-red-50 dark:bg-red-950/30",
  },
] as const;

export default function MapsHubPage() {
  return (
    <PageContainer>
      <PageHero
        title="Maps & Field Tools"
        subtitle="Interactive mapping, canvassing, and weather intelligence tools for your field operations."
        icon={<Map className="h-7 w-7" />}
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {MAP_TOOLS.map((tool) => {
          const Icon = tool.icon;
          return (
            <Link key={tool.href} href={tool.href} className="group">
              <Card className="h-full transition-all duration-200 hover:shadow-md hover:ring-1 hover:ring-primary/20 dark:hover:ring-primary/30">
                <CardHeader className="flex flex-row items-start gap-4">
                  <div className={`rounded-lg p-2.5 ${tool.bg}`}>
                    <Icon className={`h-5 w-5 ${tool.color}`} />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-base transition-colors group-hover:text-primary">
                      {tool.title}
                    </CardTitle>
                    <CardDescription className="mt-1 text-sm">{tool.description}</CardDescription>
                  </div>
                </CardHeader>
              </Card>
            </Link>
          );
        })}
      </div>
    </PageContainer>
  );
}
