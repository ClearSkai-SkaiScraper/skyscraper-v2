/**
 * Company Connections Page
 *
 * Central hub for all business connections:
 * - Vendors (suppliers, material providers)
 * - Subcontractors (subs you hire for jobs)
 * - Contractors (peers you collaborate with)
 * - Clients (customers - linked to Client Contacts)
 */

import { currentUser } from "@clerk/nextjs/server";
import { Building2, HardHat, Package, Plus, Search, UserCheck, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
  title: "Company Connections | SkaiScraper",
  description: "Manage vendors, subcontractors, contractors, and client relationships.",
};

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

// Connection type configuration
const CONNECTION_TYPES = [
  {
    id: "all",
    label: "All",
    icon: Users,
    description: "All connections",
  },
  {
    id: "vendor",
    label: "Vendors",
    icon: Package,
    description: "Material suppliers and providers",
  },
  {
    id: "subcontractor",
    label: "Subcontractors",
    icon: HardHat,
    description: "Trades you hire for jobs",
  },
  {
    id: "contractor",
    label: "Contractors",
    icon: Building2,
    description: "Peers you collaborate with",
  },
  {
    id: "client",
    label: "Clients",
    icon: UserCheck,
    description: "Your customers",
  },
];

export default async function CompanyConnectionsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  const orgCtx = await safeOrgContext();
  const orgId = orgCtx.status === "ok" ? orgCtx.orgId : null;

  // Fetch connections from TradesTeam and contacts
  let connections: any[] = [];
  let clientCount = 0;
  let vendorCount = 0;
  let subCount = 0;
  let contractorCount = 0;

  if (orgId) {
    try {
      // Fetch team connections via tradesCompanyMember which has orgId
      // and includes the company relation
      const teamMembers = await prisma.tradesCompanyMember.findMany({
        where: { orgId },
        include: {
          company: {
            select: {
              id: true,
              name: true,
              logo: true,
              isVerified: true,
              city: true,
              state: true,
              specialties: true,
              phone: true,
              email: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });

      // Map to unified format
      connections = teamMembers
        .filter((tm) => tm.company) // Only include members with a company
        .map((tm) => ({
          id: tm.id,
          type: tm.role || "contractor",
          name: tm.company?.name || "Unknown Company",
          logo: tm.company?.logo,
          verified: tm.company?.isVerified,
          city: tm.company?.city,
          state: tm.company?.state,
          specialties: tm.company?.specialties || [],
          phone: tm.company?.phone,
          email: tm.company?.email,
          companyId: tm.companyId,
          createdAt: tm.createdAt,
        }));

      // Count by type
      vendorCount = connections.filter((c) => c.type === "vendor").length;
      subCount = connections.filter((c) => c.type === "subcontractor").length;
      contractorCount = connections.filter((c) => c.type === "contractor").length;

      // Fetch client contacts count
      clientCount = await prisma.contacts.count({
        where: { orgId },
      });
    } catch (error) {
      logger.error("[CompanyConnections] Error fetching data:", error);
    }
  }

  const totalConnections = connections.length + clientCount;

  return (
    <PageContainer maxWidth="6xl">
      <PageHero
        section="network"
        title="Trades Connections"
        subtitle="Manage your network of vendors, subcontractors, contractors, and clients"
      >
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/trades">Browse Network</Link>
          </Button>
          <Button asChild>
            <Link href="/contacts/new">
              <Plus className="mr-2 h-4 w-4" />
              Add Connection
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Stats */}
      <div className="mb-8 grid grid-cols-2 gap-4 md:grid-cols-5">
        <div className="rounded-xl border bg-white p-4 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <Users className="h-5 w-5 text-blue-600" />
            <span className="text-sm text-muted-foreground">Total</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{totalConnections}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <Package className="h-5 w-5 text-orange-600" />
            <span className="text-sm text-muted-foreground">Vendors</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{vendorCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <HardHat className="h-5 w-5 text-purple-600" />
            <span className="text-sm text-muted-foreground">Subs</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{subCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-green-600" />
            <span className="text-sm text-muted-foreground">Contractors</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{contractorCount}</p>
        </div>
        <div className="rounded-xl border bg-white p-4 dark:bg-slate-800">
          <div className="flex items-center gap-2">
            <UserCheck className="h-5 w-5 text-cyan-600" />
            <span className="text-sm text-muted-foreground">Clients</span>
          </div>
          <p className="mt-1 text-2xl font-bold">{clientCount}</p>
        </div>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search connections..." className="pl-10" />
        </div>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto">
          {CONNECTION_TYPES.map((type) => {
            const Icon = type.icon;
            return (
              <TabsTrigger key={type.id} value={type.id} className="gap-2">
                <Icon className="h-4 w-4" />
                {type.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* All Connections */}
        <TabsContent value="all" className="space-y-4">
          {totalConnections === 0 ? (
            <EmptyState />
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {connections.map((connection) => (
                <ConnectionCard key={connection.id} connection={connection} />
              ))}
              {/* Show link to clients */}
              {clientCount > 0 && (
                <Link
                  href="/contacts"
                  className="flex items-center justify-center rounded-xl border-2 border-dashed border-slate-300 p-6 text-center transition hover:border-blue-500 hover:bg-blue-50 dark:border-slate-600 dark:hover:bg-blue-900/20"
                >
                  <div>
                    <UserCheck className="mx-auto mb-2 h-8 w-8 text-cyan-600" />
                    <p className="font-medium">View {clientCount} Clients</p>
                    <p className="text-sm text-muted-foreground">In Company Contacts</p>
                  </div>
                </Link>
              )}
            </div>
          )}
        </TabsContent>

        {/* Vendors */}
        <TabsContent value="vendor" className="space-y-4">
          <ConnectionList
            connections={connections.filter((c) => c.type === "vendor")}
            emptyMessage="No vendors yet. Add material suppliers and providers."
          />
        </TabsContent>

        {/* Subcontractors */}
        <TabsContent value="subcontractor" className="space-y-4">
          <ConnectionList
            connections={connections.filter((c) => c.type === "subcontractor")}
            emptyMessage="No subcontractors yet. Add trades you hire for jobs."
          />
        </TabsContent>

        {/* Contractors */}
        <TabsContent value="contractor" className="space-y-4">
          <ConnectionList
            connections={connections.filter((c) => c.type === "contractor")}
            emptyMessage="No contractor connections yet. Browse the network to connect."
          />
        </TabsContent>

        {/* Clients */}
        <TabsContent value="client" className="space-y-4">
          <div className="rounded-xl border bg-white p-8 text-center dark:bg-slate-800">
            <UserCheck className="mx-auto mb-4 h-12 w-12 text-cyan-600" />
            <h3 className="mb-2 text-lg font-semibold">Company Contacts</h3>
            <p className="mb-4 text-muted-foreground">
              Your {clientCount} clients are managed in the Contacts section.
            </p>
            <Button asChild>
              <Link href="/contacts">View Company Contacts</Link>
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

// Connection Card Component
function ConnectionCard({ connection }: { connection: any }) {
  const typeConfig: Record<string, { color: string; icon: typeof Users }> = {
    vendor: { color: "text-orange-600", icon: Package },
    subcontractor: { color: "text-purple-600", icon: HardHat },
    contractor: { color: "text-green-600", icon: Building2 },
  };

  const config = typeConfig[connection.type] || { color: "text-blue-600", icon: Users };
  const Icon = config.icon;

  return (
    <div className="rounded-xl border bg-white p-4 transition hover:shadow-md dark:bg-slate-800">
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-3">
          {connection.logo ? (
            <img
              src={connection.logo}
              alt={connection.name}
              className="h-12 w-12 rounded-lg object-cover"
            />
          ) : (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-700">
              <Icon className={`h-6 w-6 ${config.color}`} />
            </div>
          )}
          <div>
            <h3 className="font-semibold">{connection.name}</h3>
            {connection.city && (
              <p className="text-sm text-muted-foreground">
                {connection.city}, {connection.state}
              </p>
            )}
          </div>
        </div>
        {connection.verified && (
          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-900 dark:text-blue-300">
            Verified
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-1">
        {(connection.specialties || []).slice(0, 3).map((spec: string) => (
          <span
            key={spec}
            className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          >
            {spec}
          </span>
        ))}
      </div>
      {connection.companyId && (
        <Link
          href={`/trades/companies/${connection.companyId}`}
          className="mt-3 block text-sm text-blue-600 hover:underline"
        >
          View Profile →
        </Link>
      )}
    </div>
  );
}

// Connection List Component
function ConnectionList({
  connections,
  emptyMessage,
}: {
  connections: any[];
  emptyMessage: string;
}) {
  if (connections.length === 0) {
    return (
      <div className="rounded-xl border border-dashed bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <p className="text-muted-foreground">{emptyMessage}</p>
        <Button asChild variant="outline" className="mt-4">
          <Link href="/trades">Browse Network</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
      {connections.map((connection) => (
        <ConnectionCard key={connection.id} connection={connection} />
      ))}
    </div>
  );
}

// Empty State Component
function EmptyState() {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
      <Users className="mx-auto mb-4 h-12 w-12 text-slate-400" />
      <h3 className="mb-2 text-lg font-semibold">No connections yet</h3>
      <p className="mb-6 text-muted-foreground">
        Start building your network by browsing the Trades Network or adding connections manually.
      </p>
      <div className="flex justify-center gap-3">
        <Button asChild variant="outline">
          <Link href="/contacts/new">Add Manually</Link>
        </Button>
        <Button asChild>
          <Link href="/trades">Browse Network</Link>
        </Button>
      </div>
    </div>
  );
}
