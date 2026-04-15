/* eslint-disable @typescript-eslint/no-explicit-any */
/**
 * Clients & Connections Page
 *
 * Unified hub for all client relationships and network connections:
 * - Clients (from contacts + client_networks + portal connections)
 * - Vendors, Subcontractors, Contractors (from tradesCompanyMember)
 *
 * List format with profile photos, cover photos, and action buttons.
 * Separate from /contacts which handles contact cards (adjusters, subs, all types).
 */
import {
  Building2,
  HardHat,
  Lock,
  Mail,
  Package,
  Phone,
  Plus,
  Search,
  UserCheck,
  Users,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { ClientRowActions } from "./_components/ClientRowActions";

export const metadata: Metadata = {
  title: "Clients & Connections | SkaiScraper",
  description: "Manage your client relationships and professional network connections.",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── Tab Config ────────────────────────────────────────────────────────────
const TAB_TYPES = [
  { id: "all", label: "All", icon: Users },
  { id: "client", label: "Clients", icon: UserCheck },
  { id: "vendor", label: "Vendors", icon: Package },
  { id: "subcontractor", label: "Subs", icon: HardHat },
  { id: "contractor", label: "Contractors", icon: Building2 },
];

// ─── Main Export ───────────────────────────────────────────────────────────
interface PageProps {
  searchParams: { search?: string; tab?: string } | Promise<{ search?: string; tab?: string }>;
}

export default async function ClientsAndConnectionsPage({ searchParams }: PageProps) {
  try {
    return await renderPage(searchParams);
  } catch (error: any) {
    if (
      error?.digest?.startsWith?.("NEXT_REDIRECT") ||
      error?.digest?.startsWith?.("NEXT_NOT_FOUND")
    )
      throw error;
    logger.error("[ClientsConnections] FATAL PAGE ERROR:", { message: error?.message });
    return (
      <PageContainer maxWidth="6xl">
        <PageHero
          section="network"
          title="Clients & Connections"
          subtitle="Your relationships and professional network"
          icon={<Users className="h-5 w-5" />}
        />
        <div className="py-12 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h2 className="mb-2 text-xl font-bold">Unable to Load</h2>
          <p className="mb-4 text-sm text-slate-500">Please try refreshing the page.</p>
          <a
            href="/clients"
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            Refresh →
          </a>
        </div>
      </PageContainer>
    );
  }
}

// ─── Render Logic ──────────────────────────────────────────────────────────

async function renderPage(
  searchParams: { search?: string; tab?: string } | Promise<{ search?: string; tab?: string }>
) {
  let searchQuery = "";
  try {
    // Support both Next.js 14 (plain object) and 15 (Promise)
    const params = searchParams instanceof Promise ? await searchParams : searchParams;
    searchQuery = params?.search || "";
  } catch {
    // continue without search
  }

  let orgCtx;
  try {
    orgCtx = await safeOrgContext();
  } catch (error) {
    logger.error("[ClientsConnections] safeOrgContext failed:", error);
    return (
      <PageContainer maxWidth="6xl">
        <PageHero
          section="network"
          title="Clients & Connections"
          subtitle="Your network"
          icon={<Users className="h-5 w-5" />}
        />
        <div className="py-12 text-center">
          <Lock className="mx-auto mb-4 h-12 w-12 text-slate-400" />
          <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
          <p className="mb-4 text-sm text-slate-500">Please refresh the page.</p>
        </div>
      </PageContainer>
    );
  }

  if (orgCtx.status !== "ok" || !orgCtx.orgId) {
    return (
      <PageContainer maxWidth="6xl">
        <PageHero
          section="network"
          title="Clients & Connections"
          subtitle="Join an organization to get started"
          icon={<Users className="h-5 w-5" />}
        />
        <div className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-8 text-center dark:border-amber-800 dark:bg-amber-950/30">
          <p className="text-amber-800 dark:text-amber-200">
            You need to be part of an organization to view clients and connections.
          </p>
        </div>
      </PageContainer>
    );
  }

  const orgId = orgCtx.orgId;

  // ── Fetch Clients ──────────────────────────────────────────────────────
  let clients: any[] = [];
  try {
    const raw = await prisma.contacts.findMany({
      where: { orgId, isDemo: false },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        phone: true,
        company: true,
        city: true,
        state: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    clients = raw.map((c) => ({
      id: c.id,
      type: "client" as const,
      name: [c.firstName, c.lastName].filter(Boolean).join(" ") || c.company || "Unknown",
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email,
      phone: c.phone,
      company: c.company,
      city: c.city,
      state: c.state,
      createdAt: c.createdAt,
    }));
  } catch (error) {
    logger.error("[ClientsConnections] contacts query failed:", error);
  }

  // Also fetch from client_networks (CRM)
  try {
    const clientNetworks = await prisma.client_networks.findMany({
      where: { orgId, status: { not: "deleted" } },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        category: true,
        city: true,
        state: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 200,
    });
    const existingEmails = new Set(clients.map((c) => c.email?.toLowerCase()).filter(Boolean));
    const existingIds = new Set(clients.map((c) => c.id));
    for (const cn of clientNetworks) {
      if (cn.email && existingEmails.has(cn.email.toLowerCase())) continue;
      if (existingIds.has(cn.id)) continue;
      const nameParts = (cn.name || "Client").split(" ");
      clients.push({
        id: cn.id,
        type: "client" as const,
        name: cn.name || "Unknown",
        firstName: nameParts[0] || "",
        lastName: nameParts.slice(1).join(" ") || "",
        email: cn.email,
        phone: cn.phone,
        city: cn.city,
        state: cn.state,
        createdAt: cn.createdAt,
      });
    }
  } catch (error) {
    logger.error("[ClientsConnections] client_networks query failed:", error);
  }

  // ── Fetch Trade Connections ────────────────────────────────────────────
  let connections: any[] = [];
  try {
    const teamMembers = await prisma.tradesCompanyMember.findMany({
      where: { orgId },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            logo: true,
            coverimage: true,
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

    connections = teamMembers
      .filter((tm) => tm.company)
      .map((tm) => ({
        id: tm.id,
        type: (tm.role || "contractor") as string,
        name: tm.company?.name || "Unknown Company",
        logo: tm.company?.logo,
        coverImage: tm.company?.coverimage,
        verified: tm.company?.isVerified,
        city: tm.company?.city,
        state: tm.company?.state,
        specialties: tm.company?.specialties || [],
        phone: tm.company?.phone,
        email: tm.company?.email,
        companyId: tm.companyId,
        createdAt: tm.createdAt,
        profilePhoto: tm.profilePhoto,
        coverPhoto: tm.coverPhoto,
      }));
  } catch (error) {
    logger.error("[ClientsConnections] connections query failed:", error);
  }

  // ── Stats ──────────────────────────────────────────────────────────────
  const clientCount = clients.length;
  const vendorCount = connections.filter((c) => c.type === "vendor").length;
  const subCount = connections.filter((c) => c.type === "subcontractor").length;
  const contractorCount = connections.filter((c) => c.type === "contractor").length;
  const totalCount = clientCount + connections.length;

  // ── Search Filter ──────────────────────────────────────────────────────
  const lowerQ = searchQuery.toLowerCase();
  const filteredClients = lowerQ
    ? clients.filter(
        (c) =>
          c.name?.toLowerCase().includes(lowerQ) ||
          c.email?.toLowerCase().includes(lowerQ) ||
          c.phone?.includes(lowerQ) ||
          c.company?.toLowerCase().includes(lowerQ) ||
          c.city?.toLowerCase().includes(lowerQ)
      )
    : clients;

  const filteredConnections = lowerQ
    ? connections.filter(
        (c) =>
          c.name?.toLowerCase().includes(lowerQ) ||
          c.email?.toLowerCase().includes(lowerQ) ||
          c.phone?.includes(lowerQ) ||
          c.city?.toLowerCase().includes(lowerQ) ||
          c.specialties?.some((s: string) => s.toLowerCase().includes(lowerQ))
      )
    : connections;

  return (
    <PageContainer maxWidth="6xl">
      <PageHero
        section="network"
        title="Clients & Connections"
        subtitle="Your client relationships and professional network in one place"
        icon={<Users className="h-5 w-5" />}
      >
        <div className="flex gap-2">
          <Button asChild variant="outline">
            <Link href="/contacts">
              <Users className="mr-2 h-4 w-4" />
              Full CRM
            </Link>
          </Button>
          <Button asChild>
            <Link href="/contacts/new">
              <Plus className="mr-2 h-4 w-4" />
              Add New
            </Link>
          </Button>
        </div>
      </PageHero>

      {/* Stats Row */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:grid-cols-5">
        <StatBox
          icon={<Users className="h-5 w-5 text-blue-600" />}
          label="Total"
          value={totalCount}
        />
        <StatBox
          icon={<UserCheck className="h-5 w-5 text-cyan-600" />}
          label="Clients"
          value={clientCount}
        />
        <StatBox
          icon={<Package className="h-5 w-5 text-orange-600" />}
          label="Vendors"
          value={vendorCount}
        />
        <StatBox
          icon={<HardHat className="h-5 w-5 text-purple-600" />}
          label="Subs"
          value={subCount}
        />
        <StatBox
          icon={<Building2 className="h-5 w-5 text-green-600" />}
          label="Contractors"
          value={contractorCount}
        />
      </div>

      {/* Search */}
      <div className="mb-6">
        <form method="GET" className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            name="search"
            defaultValue={searchQuery}
            placeholder="Search clients & connections..."
            className="pl-10"
          />
        </form>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="all" className="w-full">
        <TabsList className="mb-6 w-full justify-start overflow-x-auto">
          {TAB_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <TabsTrigger key={t.id} value={t.id} className="gap-2">
                <Icon className="h-4 w-4" />
                {t.label}
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* All */}
        <TabsContent value="all">
          {filteredClients.length === 0 && filteredConnections.length === 0 ? (
            <EmptySearch query={searchQuery} />
          ) : (
            <div className="space-y-2">
              {filteredClients.map((c) => (
                <ClientRow key={c.id} client={c} />
              ))}
              {filteredConnections.map((c) => (
                <ConnectionRow key={c.id} connection={c} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Clients */}
        <TabsContent value="client">
          {filteredClients.length === 0 ? (
            <EmptyState message="No clients yet. Add your first client to get started." />
          ) : (
            <div className="space-y-2">
              {filteredClients.map((c) => (
                <ClientRow key={c.id} client={c} />
              ))}
            </div>
          )}
        </TabsContent>

        {/* Vendors */}
        <TabsContent value="vendor">
          <ConnectionList
            items={filteredConnections.filter((c) => c.type === "vendor")}
            empty="No vendors yet."
          />
        </TabsContent>

        {/* Subcontractors */}
        <TabsContent value="subcontractor">
          <ConnectionList
            items={filteredConnections.filter((c) => c.type === "subcontractor")}
            empty="No subcontractors yet."
          />
        </TabsContent>

        {/* Contractors */}
        <TabsContent value="contractor">
          <ConnectionList
            items={filteredConnections.filter((c) => c.type === "contractor")}
            empty="No contractor connections yet."
          />
        </TabsContent>
      </Tabs>
    </PageContainer>
  );
}

// ─── Components ────────────────────────────────────────────────────────────

function StatBox({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4 dark:bg-slate-800">
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm text-muted-foreground">{label}</span>
      </div>
      <p className="mt-1 text-2xl font-bold">{value}</p>
    </div>
  );
}

function ClientRow({ client }: { client: any }) {
  const initials = (() => {
    if (client.firstName && client.lastName) {
      return `${client.firstName[0]}${client.lastName[0]}`.toUpperCase();
    }
    const parts = (client.name || "?").split(" ").filter(Boolean);
    return (
      parts
        .slice(0, 2)
        .map((p: string) => p[0])
        .join("")
        .toUpperCase() || "?"
    );
  })();

  return (
    <Link
      href={`/contacts/${client.id}`}
      className="group flex items-center gap-4 rounded-xl border border-slate-200/60 bg-white px-4 py-3 transition hover:border-cyan-400/50 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800 dark:hover:border-cyan-500/50"
    >
      {/* Avatar */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-100 to-blue-100 text-sm font-bold text-cyan-700 dark:from-cyan-900/40 dark:to-blue-900/40 dark:text-cyan-300">
        {initials}
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-slate-900 group-hover:text-cyan-700 dark:text-white dark:group-hover:text-cyan-400">
            {client.name}
          </h3>
          <Badge
            variant="secondary"
            className="shrink-0 bg-cyan-100 text-xs text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400"
          >
            Client
          </Badge>
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {client.email && <span className="truncate">{client.email}</span>}
          {client.city && client.state && (
            <span className="hidden shrink-0 md:inline">
              {client.city}, {client.state}
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {client.phone && (
          <a
            href={`tel:${client.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 dark:hover:bg-green-900/20"
            title="Call"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
        {client.email && (
          <a
            href={`mailto:${client.email}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Email"
          >
            <Mail className="h-4 w-4" />
          </a>
        )}
        <ClientRowActions contactId={client.id} name={client.name} type="client" />
      </div>
    </Link>
  );
}

function ConnectionRow({ connection }: { connection: any }) {
  const typeConfig: Record<
    string,
    { color: string; badgeColor: string; label: string; icon: typeof Users }
  > = {
    vendor: {
      color: "from-orange-100 to-amber-100 dark:from-orange-900/40 dark:to-amber-900/40",
      badgeColor: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
      label: "Vendor",
      icon: Package,
    },
    subcontractor: {
      color: "from-purple-100 to-fuchsia-100 dark:from-purple-900/40 dark:to-fuchsia-900/40",
      badgeColor: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
      label: "Subcontractor",
      icon: HardHat,
    },
    contractor: {
      color: "from-green-100 to-emerald-100 dark:from-green-900/40 dark:to-emerald-900/40",
      badgeColor: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
      label: "Contractor",
      icon: Building2,
    },
  };
  const config = typeConfig[connection.type] || typeConfig.contractor;
  const Icon = config.icon;

  const href = connection.companyId ? `/trades/companies/${connection.companyId}` : "#";

  return (
    <Link
      href={href}
      className="group flex items-center gap-4 rounded-xl border border-slate-200/60 bg-white px-4 py-3 transition hover:border-amber-400/50 hover:shadow-md dark:border-slate-700/60 dark:bg-slate-800 dark:hover:border-amber-500/50"
    >
      {/* Logo / Avatar */}
      {connection.logo ? (
        <img
          src={connection.logo}
          alt={connection.name}
          className="h-12 w-12 shrink-0 rounded-full object-cover"
        />
      ) : (
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${config.color}`}
        >
          <Icon className="h-6 w-6 text-slate-600 dark:text-slate-300" />
        </div>
      )}

      {/* Info */}
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <h3 className="truncate font-semibold text-slate-900 group-hover:text-amber-700 dark:text-white dark:group-hover:text-amber-400">
            {connection.name}
          </h3>
          <Badge variant="secondary" className={`shrink-0 text-xs ${config.badgeColor}`}>
            {config.label}
          </Badge>
          {connection.verified && <UserCheck className="h-4 w-4 shrink-0 text-blue-500" />}
        </div>
        <div className="flex items-center gap-3 text-sm text-muted-foreground">
          {connection.city && connection.state && (
            <span>
              {connection.city}, {connection.state}
            </span>
          )}
          {connection.specialties?.length > 0 && (
            <span className="hidden truncate md:inline">
              {connection.specialties.slice(0, 2).join(", ")}
            </span>
          )}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="flex shrink-0 items-center gap-1">
        {connection.phone && (
          <a
            href={`tel:${connection.phone}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-2 text-green-600 transition hover:bg-green-50 dark:hover:bg-green-900/20"
            title="Call"
          >
            <Phone className="h-4 w-4" />
          </a>
        )}
        {connection.email && (
          <a
            href={`mailto:${connection.email}`}
            onClick={(e) => e.stopPropagation()}
            className="rounded-lg p-2 text-blue-600 transition hover:bg-blue-50 dark:hover:bg-blue-900/20"
            title="Email"
          >
            <Mail className="h-4 w-4" />
          </a>
        )}
        <ClientRowActions
          contactId={connection.id}
          name={connection.name}
          type={connection.type}
          connectionId={connection.id}
        />
      </div>
    </Link>
  );
}

function ConnectionList({ items, empty }: { items: any[]; empty: string }) {
  if (items.length === 0) {
    return <EmptyState message={empty} />;
  }
  return (
    <div className="space-y-2">
      {items.map((c) => (
        <ConnectionRow key={c.id} connection={c} />
      ))}
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/50">
      <Users className="mx-auto mb-4 h-12 w-12 text-slate-400" />
      <p className="mb-4 text-muted-foreground">{message}</p>
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

function EmptySearch({ query }: { query: string }) {
  if (query) {
    return (
      <div className="rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-8 text-center dark:border-slate-700 dark:bg-slate-800/50">
        <Search className="mx-auto mb-4 h-12 w-12 text-slate-400" />
        <h3 className="mb-2 text-lg font-semibold">No results for &ldquo;{query}&rdquo;</h3>
        <p className="text-muted-foreground">Try a different search term.</p>
      </div>
    );
  }
  return <EmptyState message="No clients or connections yet. Start building your network!" />;
}
