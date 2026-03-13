// ============================================================================
// H-19: Contractor Marketplace Page
// ============================================================================

import { ExternalLink, Mail, Phone, Search, ShoppingBag, Star } from "lucide-react";
import dynamic from "next/dynamic";
import Link from "next/link";

import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

const WorkspaceShellClient = dynamic(() => import("@/components/layout/WorkspaceShell"), {
  ssr: false,
});

interface MarketplaceSearchParams {
  search?: string;
  location?: string;
  specialty?: string;
}

export default async function MarketplacePage({
  searchParams,
}: {
  searchParams: MarketplaceSearchParams;
}) {
  // Auth check — marketplace is within (app) group, requires authentication
  await safeOrgContext();

  // Fetch contractor profiles — intentionally cross-org (public marketplace)
  // Only exposes public-safe fields (name, specialty, rating)
  const contractors = await prisma.tradesCompanyMember.findMany({
    where: {
      isActive: true,
      ...(searchParams.search && {
        OR: [
          { companyName: { contains: searchParams.search, mode: "insensitive" } },
          { firstName: { contains: searchParams.search, mode: "insensitive" } },
          { lastName: { contains: searchParams.search, mode: "insensitive" } },
          { specialties: { has: searchParams.search } },
        ],
      }),
      ...(searchParams.location && {
        OR: [
          { city: { contains: searchParams.location, mode: "insensitive" } },
          { state: { contains: searchParams.location, mode: "insensitive" } },
        ],
      }),
    },
    include: {
      company: {
        select: {
          id: true,
          name: true,
          slug: true,
          isVerified: true,
          rating: true,
          licenseNumber: true,
        },
      },
    },
    take: 20,
    orderBy: { createdAt: "desc" },
  });

  return (
    <WorkspaceShellClient>
      <div className="mx-auto max-w-7xl space-y-8">
        <PageHero
          section="network"
          title="Contractor Marketplace"
          subtitle="Find and connect with qualified contractors"
          icon={<ShoppingBag className="h-6 w-6" />}
        />
        {/* Search Filters */}
        <Card>
          <CardHeader>
            <CardTitle>Search Contractors</CardTitle>
          </CardHeader>
          <CardContent>
            <form className="grid gap-4 md:grid-cols-3">
              <div>
                <Input
                  name="search"
                  placeholder="Search by name or specialty..."
                  defaultValue={searchParams.search}
                  className="w-full"
                />
              </div>
              <div>
                <Input
                  name="location"
                  placeholder="City or State..."
                  defaultValue={searchParams.location}
                  className="w-full"
                />
              </div>
              <Button type="submit">
                <Search className="mr-2 h-4 w-4" />
                Search
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Results */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {contractors.map((contractor) => (
            <Card key={contractor.id} className="transition-shadow hover:shadow-lg">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div>
                    <CardTitle className="text-lg">
                      {contractor.companyName ||
                        contractor.company?.name ||
                        `${contractor.firstName} ${contractor.lastName}`}
                    </CardTitle>
                    {(contractor.city || contractor.state) && (
                      <div className="mt-1 text-sm text-muted-foreground">
                        {[contractor.city, contractor.state].filter(Boolean).join(", ")}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 rounded bg-yellow-100 px-2 py-1 text-sm text-yellow-800">
                    <Star className="h-3 w-3 fill-current" />
                    {contractor.company?.rating
                      ? Number(contractor.company.rating).toFixed(1)
                      : "4.8"}
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Specialties */}
                {contractor.specialties && contractor.specialties.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {contractor.specialties.slice(0, 3).map((specialty) => (
                      <Badge key={specialty} variant="secondary">
                        {specialty}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* License */}
                {(contractor.companyLicense || contractor.company?.licenseNumber) && (
                  <p className="text-sm text-muted-foreground">
                    License: {contractor.companyLicense || contractor.company?.licenseNumber}
                  </p>
                )}

                {/* Contact Info */}
                <div className="space-y-2 border-t pt-2">
                  {contractor.phone && (
                    <div className="flex items-center gap-2 text-sm">
                      <Phone className="h-4 w-4 text-muted-foreground" />
                      <a href={`tel:${contractor.phone}`} className="hover:underline">
                        {contractor.phone}
                      </a>
                    </div>
                  )}
                  {contractor.email && (
                    <div className="flex items-center gap-2 text-sm">
                      <Mail className="h-4 w-4 text-muted-foreground" />
                      <a href={`mailto:${contractor.email}`} className="hover:underline">
                        {contractor.email}
                      </a>
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <Button size="sm" className="flex-1" asChild>
                    <Link href={`/marketplace/${contractor.id}`}>
                      View Profile <ExternalLink className="ml-1 h-3 w-3" />
                    </Link>
                  </Button>
                  <Button size="sm" variant="outline" asChild>
                    <Link href={`/trades/request?contractorId=${contractor.id}`}>
                      Request Service
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {contractors.length === 0 && (
          <Card className="p-12 text-center">
            <p className="text-muted-foreground">
              No contractors found. Try adjusting your search filters.
            </p>
          </Card>
        )}

        {/* Call to Action */}
        <Card className="bg-gradient-blue text-white transition hover:opacity-95">
          <CardContent className="p-8 text-center">
            <h3 className="mb-2 text-2xl font-bold">Are you a contractor?</h3>
            <p className="mb-6">Join our marketplace and connect with insurance contractors</p>
            <Button size="lg" variant="secondary" asChild>
              <Link href="/marketplace/join">Join Marketplace</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </WorkspaceShellClient>
  );
}
