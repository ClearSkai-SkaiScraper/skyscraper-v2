"use client";

import { Clock, FileText, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { type ClaimStage,ProgressTimeline } from "@/components/portal/ProgressTimeline";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ClaimWithStage {
  id: string;
  claimNumber: string;
  address: string;
  currentStage: ClaimStage;
  stageDetails?: Partial<Record<ClaimStage, { date?: string; note?: string }>>;
}

/**
 * 📍 Client Portal - Project Timeline Page
 *
 * Shows a visual timeline of all milestones and progress
 * across the client's active claims and projects.
 */
export default function TimelinePage() {
  const [claims, setClaims] = useState<ClaimWithStage[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await fetch("/api/portal/claims");
        if (res.ok) {
          const data = await res.json();
          // Map claim statuses to stage format
          const mappedClaims: ClaimWithStage[] = (data.claims || []).map(
            (claim: {
              id: string;
              claimNumber: string;
              address: string;
              status: string;
              createdAt: string;
            }) => ({
              id: claim.id,
              claimNumber: claim.claimNumber,
              address: claim.address,
              currentStage: mapStatusToStage(claim.status),
              stageDetails: {
                submitted: { date: claim.createdAt },
              },
            })
          );
          setClaims(mappedClaims);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    void fetchClaims();
  }, []);

  function mapStatusToStage(status: string): ClaimStage {
    const statusMap: Record<string, ClaimStage> = {
      open: "submitted",
      active: "reviewing",
      in_progress: "in_progress",
      "in progress": "in_progress",
      completed: "completed",
      closed: "completed",
      pending: "reviewing",
    };
    return statusMap[status.toLowerCase()] || "submitted";
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <PortalPageHero
        title="Project Timeline"
        subtitle="Track every milestone of your restoration project from start to finish."
        icon={Clock}
        badge="Progress Tracking"
        gradient="blue"
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
        </div>
      )}

      {/* No Claims State */}
      {!loading && claims.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-slate-400" />
            <h3 className="text-lg font-semibold">No Active Claims</h3>
            <p className="text-sm text-slate-500">
              When you have active claims, their progress will appear here.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Claims with Timelines */}
      {!loading &&
        claims.map((claim) => (
          <Card key={claim.id}>
            <CardHeader>
              <CardTitle className="text-lg">{claim.claimNumber}</CardTitle>
              <CardDescription>{claim.address || "Address pending"}</CardDescription>
            </CardHeader>
            <CardContent>
              <ProgressTimeline
                currentStage={claim.currentStage}
                stageDetails={claim.stageDetails}
              />
            </CardContent>
          </Card>
        ))}
    </div>
  );
}
