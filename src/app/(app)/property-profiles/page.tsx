/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */
// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { AlertTriangle, Calendar, Home, MapPin, Plus, TrendingUp } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getResolvedOrgResult } from "@/lib/auth/orgResolver";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";
export const revalidate = 0;

async function getPropertyProfiles(orgId: string) {
  try {
    // Try property_profiles first (detailed model with health scores)
    const profiles = await prisma.property_profiles.findMany({
      where: { orgId },
      include: {
        property_health_scores: { orderBy: { createdAt: "desc" }, take: 1 },
        _count: {
          select: {
            property_digital_twins: true,
            maintenance_schedules: true,
            property_inspections: true,
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    if (profiles.length > 0) {
      return profiles.map((p) => ({
        ...p,
        healthScores: p.property_health_scores,
        _count: {
          digitalTwins: p._count.property_digital_twins,
          maintenanceSchedules: p._count.maintenance_schedules,
          inspectionRecords: p._count.property_inspections,
        },
      }));
    }

    // Fallback to basic properties model
    const basicProps = await prisma.properties.findMany({
      where: { orgId },
      include: {
        _count: {
          select: { claims: true, inspections: true, jobs: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    return basicProps.map((p) => ({
      ...p,
      streetAddress: p.street,
      healthScores: [],
      _count: {
        ...p._count,
        digitalTwins: 0,
        maintenanceSchedules: 0,
        inspectionRecords: 0,
      },
    }));
  } catch (error) {
    logger.error("[PropertyProfiles] Error loading properties:", error);
    return [];
  }
}

export default async function PropertyProfilesPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Get org context
  const orgResult = await getResolvedOrgResult();
  if (!orgResult.ok) return <NoOrgMembershipBanner title="Property Profiles" />;

  const orgId = orgResult.orgId;

  const properties = await getPropertyProfiles(orgId);

  return (
    <PageContainer>
      <PageHero
        section="leads"
        title="Property Profiles"
        subtitle="Manage property intelligence, digital twins, and health scores"
        icon={<Home className="h-5 w-5" />}
      >
        <Link href="/property-profiles/new">
          <Button size="lg" className="gap-2">
            <Plus className="h-4 w-4" />
            Add Property
          </Button>
        </Link>
      </PageHero>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Properties</CardTitle>
            <Home className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{properties.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avg Health Score</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {properties.length > 0 && properties.some((p: any) => p.healthScores?.length > 0)
                ? Math.round(
                    properties
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      .filter((p: any) => p.healthScores?.length > 0)
                      .reduce(
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        (sum: number, p: any) => sum + (p.healthScores[0]?.overallScore || 0),
                        0
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      ) / properties.filter((p: any) => p.healthScores?.length > 0).length
                  )
                : 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">High Risk</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Maintenance Due</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {properties.filter((p: any) => p._count?.maintenanceSchedules > 0).length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Properties Grid */}
      {properties.length === 0 ? (
        <Card className="p-12 text-center">
          <Home className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
          <h3 className="mb-2 text-lg font-semibold">No Properties Yet</h3>
          <p className="mb-4 text-muted-foreground">
            Start building your property intelligence database
          </p>
          <Link href="/property-profiles/new">
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Your First Property
            </Button>
          </Link>
        </Card>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {properties.map((property: any) => {
            const healthScore = property.healthScores?.[0];
            const riskScore = property.insuranceRiskScore || 0;
            const riskLevel =
              riskScore >= 80
                ? "Critical"
                : riskScore >= 60
                  ? "High"
                  : riskScore >= 40
                    ? "Moderate"
                    : riskScore >= 20
                      ? "Low"
                      : "Minimal";

            const riskColor =
              riskScore >= 60 ? "destructive" : riskScore >= 40 ? "warning" : "success";

            return (
              <Link key={property.id} href={`/property-profiles/${property.id}`}>
                <Card className="h-full cursor-pointer transition-shadow hover:shadow-lg">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <CardTitle className="line-clamp-1">
                          {property.streetAddress || "Unnamed Property"}
                        </CardTitle>
                        <CardDescription className="mt-1 flex items-center gap-1">
                          <MapPin className="h-3 w-3" />
                          {property.city}, {property.state} {property.zipCode}
                        </CardDescription>
                      </div>
                      {healthScore && (
                        <div className="flex flex-col items-center">
                          <div
                            className={`text-2xl font-bold ${
                              healthScore.overallScore >= 80
                                ? "text-green-600"
                                : healthScore.overallScore >= 60
                                  ? "text-yellow-600"
                                  : "text-red-600"
                            }`}
                          >
                            {healthScore.overallScore}
                          </div>
                          <div className="text-xs text-muted-foreground">Health</div>
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Year Built</span>
                      <span className="font-medium">{property.yearBuilt || "N/A"}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Square Footage</span>
                      <span className="font-medium">
                        {property.squareFootage ? property.squareFootage.toLocaleString() : "N/A"}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Risk Level</span>
                      <Badge variant={riskColor as any}>{riskLevel}</Badge>
                    </div>
                    <div className="grid grid-cols-3 gap-2 border-t pt-2 text-center text-xs">
                      <div>
                        <div className="font-semibold">{property._count?.digitalTwins || 0}</div>
                        <div className="text-muted-foreground">Twins</div>
                      </div>
                      <div>
                        <div className="font-semibold">
                          {property._count?.maintenanceSchedules || 0}
                        </div>
                        <div className="text-muted-foreground">Schedules</div>
                      </div>
                      <div>
                        <div className="font-semibold">
                          {property._count?.inspectionRecords || 0}
                        </div>
                        <div className="text-muted-foreground">Inspections</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}
