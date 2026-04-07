/**
 * 🎯 PROJECT OPPORTUNITIES WIDGET
 *
 * Shows nearby project opportunities for Pro users to bid on.
 * Displayed on the Pro dashboard.
 */

"use client";

import { ArrowRight, Clock, DollarSign, MapPin, Sparkles, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectOpportunity {
  id: string;
  title: string;
  type: string;
  budget: string;
  location: {
    city: string;
    distance: number;
  };
  urgency: "emergency" | "urgent" | "normal" | "flexible";
  postedAt: string;
  bidsCount: number;
}

const URGENCY_COLORS = {
  emergency: "bg-red-500 text-white",
  urgent: "bg-orange-500 text-white",
  normal: "bg-blue-500 text-white",
  flexible: "bg-green-500 text-white",
};

// Mock data - will be replaced with API call
const MOCK_OPPORTUNITIES: ProjectOpportunity[] = [
  {
    id: "p1",
    title: "Emergency Roof Repair",
    type: "roofing",
    budget: "5000-10000",
    location: { city: "Phoenix", distance: 4.2 },
    urgency: "emergency",
    postedAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    bidsCount: 2,
  },
  {
    id: "p2",
    title: "Kitchen Plumbing Fix",
    type: "plumbing",
    budget: "1000-5000",
    location: { city: "Scottsdale", distance: 8.7 },
    urgency: "urgent",
    postedAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    bidsCount: 3,
  },
  {
    id: "p3",
    title: "HVAC Maintenance",
    type: "hvac",
    budget: "500-1000",
    location: { city: "Tempe", distance: 12.1 },
    urgency: "normal",
    postedAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    bidsCount: 5,
  },
];

function formatTimeAgo(dateString: string) {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

  if (diffHours < 1) return "Just posted";
  if (diffHours < 24) return `${diffHours}h ago`;
  return `${Math.floor(diffHours / 24)}d ago`;
}

function OpportunityCard({ project }: { project: ProjectOpportunity }) {
  return (
    <div className="group relative rounded-lg border bg-white p-4 transition-all hover:border-blue-300 hover:shadow-md dark:bg-slate-900">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <Badge className={URGENCY_COLORS[project.urgency]} variant="secondary">
              {project.urgency === "emergency" && "🚨 "}
              {project.urgency.charAt(0).toUpperCase() + project.urgency.slice(1)}
            </Badge>
            <span className="text-xs text-slate-500">{formatTimeAgo(project.postedAt)}</span>
          </div>

          <h4 className="mt-2 font-semibold group-hover:text-blue-600">{project.title}</h4>

          <div className="mt-2 flex flex-wrap items-center gap-3 text-sm text-slate-500">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />${project.budget.replace("-", "-$")}
            </span>
            <span className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {project.location.distance} mi
            </span>
            <span className="flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              {project.bidsCount} bids
            </span>
          </div>
        </div>

        <Button
          size="sm"
          variant="ghost"
          className="opacity-0 transition-opacity group-hover:opacity-100"
          asChild
        >
          <Link href={`/projects/browse?id=${project.id}`}>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="space-y-3">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-lg border p-4">
          <Skeleton className="mb-2 h-5 w-20" />
          <Skeleton className="mb-2 h-5 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}

export function ProjectOpportunitiesWidget() {
  const [opportunities, setOpportunities] = useState<ProjectOpportunity[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulating API call
    const loadOpportunities = async () => {
      await new Promise((r) => setTimeout(r, 800));
      setOpportunities(MOCK_OPPORTUNITIES);
      setIsLoading(false);
    };
    void loadOpportunities();
  }, []);

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Project Opportunities</CardTitle>
          </div>
          <Badge variant="secondary" className="bg-blue-50 text-blue-600">
            {opportunities.length} New
          </Badge>
        </div>
        <CardDescription>Projects near you looking for quotes</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        {isLoading ? (
          <LoadingSkeleton />
        ) : opportunities.length === 0 ? (
          <div className="py-6 text-center text-slate-500">
            <Clock className="mx-auto mb-2 h-8 w-8 text-slate-300" />
            <p>No new opportunities right now</p>
            <p className="text-sm">Check back soon!</p>
          </div>
        ) : (
          <>
            {opportunities.map((project) => (
              <OpportunityCard key={project.id} project={project} />
            ))}
            <Button variant="outline" className="w-full" asChild>
              <Link href="/projects/browse">
                View All Projects
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

export default ProjectOpportunitiesWidget;
