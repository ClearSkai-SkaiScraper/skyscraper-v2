"use client";

import { logger } from "@/lib/logger";
import { format, isValid } from "date-fns";
import { ArrowRight, CheckCircle, Clock, FileText, MapPin, Shield } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import PortalPageHero from "@/components/portal/portal-page-hero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

/**
 * Claims List Page - Client Portal
 * Rich view of all claims shared with or belonging to the client
 */

interface Claim {
  id: string;
  claimNumber: string;
  address: string;
  status: string;
  dateOfLoss?: string;
  createdAt: string;
  updatedAt: string;
}

export default function ClaimsListPage() {
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchClaims();
  }, []);

  async function fetchClaims() {
    try {
      const res = await fetch("/api/portal/claims");
      if (res.ok) {
        const data = await res.json();
        setClaims(data.claims || []);
      }
    } catch (error) {
      logger.error("Failed to fetch claims:", error);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const date = new Date(dateStr);
    return isValid(date) ? format(date, "MMM d, yyyy") : "N/A";
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case "open":
      case "active":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "in_progress":
      case "in progress":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "completed":
      case "closed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "pending":
        return "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300";
      default:
        return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300";
    }
  };

  const activeClaims = claims.filter((c) =>
    ["open", "active", "in_progress", "in progress"].includes(c.status.toLowerCase())
  );
  const completedClaims = claims.filter((c) =>
    ["completed", "closed"].includes(c.status.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex items-center gap-3">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-600 border-t-transparent" />
          <p className="text-slate-500 dark:text-slate-400">Loading your claims...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <PortalPageHero
        title="My Claims"
        subtitle="Track your insurance claims, view project progress, and access all your documents in one place."
        icon={Shield}
        badge="Insurance Claims"
        gradient="amber"
        stats={[
          { label: "Total Claims", value: claims.length },
          { label: "Active", value: activeClaims.length },
          { label: "Completed", value: completedClaims.length },
        ]}
      />

      {claims.length === 0 ? (
        <Card className="border-2 border-dashed bg-gradient-to-br from-slate-50 to-white dark:from-slate-800/50 dark:to-slate-900">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-orange-600 shadow-lg shadow-amber-500/30">
              <FileText className="h-10 w-10 text-white" />
            </div>
            <h3 className="mb-2 text-xl font-semibold dark:text-white">No claims yet</h3>
            <p className="max-w-md text-slate-500 dark:text-slate-400">
              When your contractor shares project claims with you, they&apos;ll appear here with
              full access to photos, documents, and progress updates.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {claims.map((claim) => (
            <Card key={claim.id} className="transition-shadow hover:shadow-md">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">{claim.claimNumber}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-1">
                      <MapPin className="h-3 w-3" />
                      {claim.address || "No address"}
                    </CardDescription>
                  </div>
                  <Badge className={getStatusColor(claim.status)}>{claim.status}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {claim.dateOfLoss && (
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <Clock className="h-3 w-3" />
                      <span>DOL: {formatDate(claim.dateOfLoss)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                    <CheckCircle className="h-3 w-3" />
                    <span>Updated: {formatDate(claim.updatedAt)}</span>
                  </div>
                </div>

                <Link href={`/portal/claims/${claim.id}`}>
                  <Button variant="outline" size="sm" className="w-full">
                    View Details
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
