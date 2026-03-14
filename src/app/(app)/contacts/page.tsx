import {
  Briefcase,
  Building2,
  HardHat,
  Lock,
  Package,
  Shield,
  UserCheck,
  Users,
  UsersRound,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { CRMCard } from "@/components/crm/CRMCard";
import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";
import { isTestMode } from "@/lib/testMode";

import { UniversalContactCard } from "@/components/contacts/UniversalContactCard";

import { ConnectionCard } from "./_components/ConnectionCard";
import { TeamMemberCard } from "./_components/TeamMemberCard";

export const metadata: Metadata = {
  title: "Company Contacts | SkaiScraper",
  description:
    "Manage your CRM — clients, adjusters, team members, vendors, and business relationships",
};

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Connection type configuration
const CONNECTION_TYPES = [
  { id: "all", label: "All", icon: Users },
  { id: "client", label: "Clients", icon: UserCheck },
  { id: "vendor", label: "Vendors", icon: Package },
  { id: "subcontractor", label: "Subcontractors", icon: HardHat },
  { id: "contractor", label: "Contractors", icon: Building2 },
];

export default async function CompanyContactsPage() {
  // ULTRA-DEFENSIVE: Wrap entire page in try-catch to prevent ANY uncaught errors
  try {
    return await renderContactsPage();
  } catch (error) {
    // CRITICAL: Re-throw NEXT_REDIRECT — Next.js uses thrown errors for navigation
    if (
      error?.digest?.startsWith?.("NEXT_REDIRECT") ||
      error?.digest?.startsWith?.("NEXT_NOT_FOUND")
    )
      throw error;
    logger.error("[CompanyContacts] FATAL PAGE ERROR:", {
      message: error?.message,
      stack: error?.stack,
      name: error?.name,
    });
    // Return safe fallback instead of throwing
    return (
      <PageContainer>
        <PageHero
          section="network"
          title="Company Contacts"
          subtitle="Manage your network of contacts and connections"
          icon={<Users className="h-5 w-5" />}
        />
        <PageSectionCard>
          <div className="py-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h2 className="mb-2 text-xl font-bold">Unable to Load Contacts</h2>
            <p className="mb-4 text-sm text-slate-500">
              There was an issue loading your contacts. Please try again.
            </p>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Go to Dashboard →
            </Link>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }
}

async function renderContactsPage() {
  let orgCtx;
  try {
    orgCtx = await safeOrgContext();
  } catch (error) {
    logger.error("[CompanyContacts] safeOrgContext failed:", error);
    // Return unauthenticated view on error
    return (
      <PageContainer>
        <PageHero
          section="network"
          title="Company Contacts"
          subtitle="Manage your network of contacts and connections"
          icon={<Users className="h-5 w-5" />}
        />
        <PageSectionCard>
          <div className="py-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h2 className="mb-2 text-xl font-bold">Something went wrong</h2>
            <p className="mb-4 text-sm text-slate-500">Please try signing in again.</p>
            <Link
              href="/sign-in?redirect_url=/contacts"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Sign In →
            </Link>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  if (orgCtx.status === "unauthenticated") {
    return (
      <PageContainer>
        <PageHero
          section="network"
          title="Company Contacts"
          subtitle="Manage your network of contacts and connections"
          icon={<Users className="h-5 w-5" />}
        />
        <PageSectionCard>
          <div className="py-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h2 className="mb-2 text-xl font-bold">Sign In Required</h2>
            <p className="mb-4 text-sm text-slate-500">Please sign in to manage your contacts.</p>
            <Link
              href="/sign-in?redirect_url=/contacts"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Sign In →
            </Link>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  // Handle error state from safeOrgContext
  if (orgCtx.status === "error" || orgCtx.status === "noMembership") {
    logger.error("[CompanyContacts] Org context error:", orgCtx.error || orgCtx.reason);
    return (
      <PageContainer>
        <PageHero
          section="network"
          title="Company Contacts"
          subtitle="Manage your network of contacts and connections"
          icon={<Users className="h-5 w-5" />}
        />
        <PageSectionCard>
          <div className="py-8 text-center">
            <Lock className="mx-auto mb-4 h-12 w-12 text-slate-400" />
            <h2 className="mb-2 text-xl font-bold">Setup Required</h2>
            <p className="mb-4 text-sm text-slate-500">
              Please complete your workspace setup to access contacts.
            </p>
            <Link
              href="/onboarding/start"
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Complete Setup →
            </Link>
          </div>
        </PageSectionCard>
      </PageContainer>
    );
  }

  const userId = orgCtx.userId;
  const organizationId = orgCtx.orgId;

  // Check test mode
  let testMode = false;
  try {
    testMode = isTestMode();
  } catch {
    testMode = false;
  }

  // In test mode, allow missing org (for testing)
  if (!organizationId && !testMode) {
    redirect("/onboarding/start");
  }

  // ── Demo / seed data filter patterns ──
  // NOTE: Only filter obviously fake data, NOT real-sounding names
  const DEMO_EMAIL_PATTERNS = [
    "@example.com",
    "@test.com",
    "@demo.com",
    "@fake.com",
    "@mailinator.com",
    "@tempmail.com",
  ];
  const DEMO_NAME_PATTERNS = [
    "demo user",
    "test user",
    "seed user",
    "sample user",
    "fake user",
    "lorem ipsum",
    "placeholder",
  ];

  const isDemoContact = (c: {
    email?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    name?: string | null;
  }) => {
    const email = (c.email || "").toLowerCase();
    const fullName = `${c.firstName || ""} ${c.lastName || ""} ${c.name || ""}`
      .toLowerCase()
      .trim();
    if (DEMO_EMAIL_PATTERNS.some((p) => email.includes(p))) return true;
    if (DEMO_NAME_PATTERNS.some((p) => fullName.includes(p))) return true;
    return false;
  };

  let contacts: any[] = [];
  let connections: any[] = [];
  let teamMembers: any[] = [];
  let adjusters: any[] = [];
  let vendorCount = 0;
  let subCount = 0;
  let contractorCount = 0;
  let myCompanyId: string | null = null;

  // Only query if we have a valid organization ID
  if (organizationId) {
    try {
      // Fetch contacts (clients) from CRM contacts table
      const raw = await prisma.contacts.findMany({
        where: { orgId: organizationId, isDemo: false },
        orderBy: { createdAt: "desc" },
        take: 200,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
          tags: true,
          createdAt: true,
        },
      });
      contacts = raw
        .filter((c) => !isDemoContact(c))
        .map((c) => ({
          id: c.id,
          type: "client",
          name: `${c.firstName || ""} ${c.lastName || ""}`.trim() || "Unknown",
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          tags: c.tags || [],
          createdAt: c.createdAt ? String(c.createdAt) : null,
        }));

      // ── Also fetch client_networks (CRM client records) ──
      try {
        const clientNetworks = await prisma.client_networks.findMany({
          where: { orgId: organizationId, status: { not: "deleted" } },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            category: true,
            status: true,
            city: true,
            state: true,
            createdAt: true,
          },
        });

        const existingEmails = new Set(
          contacts.map((c: any) => c.email?.toLowerCase()).filter(Boolean)
        );
        const existingIds = new Set(contacts.map((c: any) => c.id));

        for (const cn of clientNetworks) {
          if (isDemoContact({ email: cn.email, name: cn.name })) continue;
          if (cn.email && existingEmails.has(cn.email.toLowerCase())) continue;
          if (existingIds.has(cn.id)) continue;

          const nameParts = (cn.name || "Client").split(" ");
          contacts.push({
            id: cn.id,
            type: "client",
            name: cn.name || "Unknown",
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: cn.email,
            phone: cn.phone,
            tags: [cn.category || "client"].filter(Boolean),
            createdAt: cn.createdAt ? String(cn.createdAt) : null,
          });
        }
      } catch (cnErr) {
        logger.error("[CompanyContacts] client_networks query failed:", cnErr);
      }

      // ── Also fetch claim homeowners / insured names as client contacts ──
      try {
        const claimClients = await prisma.claims.findMany({
          where: {
            orgId: organizationId,
            insured_name: { not: null },
            isDemo: false,
          },
          orderBy: { createdAt: "desc" },
          take: 200,
          select: {
            id: true,
            insured_name: true,
            homeownerEmail: true,
            homeowner_email: true,
            claimNumber: true,
            createdAt: true,
          },
        });

        const existingEmails2 = new Set(
          contacts.map((c: any) => c.email?.toLowerCase()).filter(Boolean)
        );
        const existingNames = new Set(
          contacts.map((c: any) => c.name?.toLowerCase()).filter(Boolean)
        );

        for (const cl of claimClients) {
          const name = cl.insured_name?.trim();
          if (!name) continue;
          if (isDemoContact({ name, email: cl.homeownerEmail || cl.homeowner_email })) continue;
          const email = cl.homeownerEmail || cl.homeowner_email;
          if (email && existingEmails2.has(email.toLowerCase())) continue;
          if (existingNames.has(name.toLowerCase())) continue;

          const nameParts = name.split(" ");
          contacts.push({
            id: `claim-${cl.id}`,
            type: "client",
            contactType: "homeowner",
            name,
            firstName: nameParts[0] || "",
            lastName: nameParts.slice(1).join(" ") || "",
            email: email || null,
            phone: null,
            tags: ["claim", cl.claimNumber || ""].filter(Boolean),
            createdAt: cl.createdAt ? String(cl.createdAt) : null,
            // Navigate to claim, not broken /contacts/claim-xxx
            href: `/claims/${cl.id}`,
            claimId: cl.id,
          });
        }
      } catch (claimErr) {
        logger.error("[CompanyContacts] claims insured query failed:", claimErr);
      }

      // ── Also fetch connected portal clients (ClientProConnection) ──
      try {
        const membership = await prisma.tradesCompanyMember.findFirst({
          where: { orgId: organizationId },
          select: { companyId: true },
        });

        myCompanyId = membership?.companyId || null;

        if (membership?.companyId) {
          const portalClients = await prisma.clientProConnection.findMany({
            where: {
              contractorId: membership.companyId,
              status: { in: ["accepted", "ACCEPTED"] },
            },
            include: {
              Client: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                  phone: true,
                  createdAt: true,
                },
              },
            },
            orderBy: { connectedAt: "desc" },
          });

          const existingEmails = new Set(contacts.map((c) => c.email).filter(Boolean));
          const existingIds = new Set(contacts.map((c) => c.id));

          for (const pc of portalClients) {
            if (!pc.Client) continue;
            // Skip demo data
            if (isDemoContact({ email: pc.Client.email, name: pc.Client.name })) continue;
            // Skip if already in contacts by email or ID
            if (pc.Client.email && existingEmails.has(pc.Client.email)) continue;
            if (existingIds.has(pc.Client.id)) continue;

            const nameParts = (pc.Client.name || "Client").split(" ");
            contacts.push({
              id: pc.Client.id,
              type: "client",
              name: pc.Client.name || "Portal Client",
              firstName: nameParts[0] || "",
              lastName: nameParts.slice(1).join(" ") || "",
              email: pc.Client.email,
              phone: pc.Client.phone,
              tags: ["portal", "connected"],
              createdAt: pc.Client.createdAt ? String(pc.Client.createdAt) : null,
            });
          }
        }
      } catch (portalErr) {
        logger.error("[CompanyContacts] Portal clients query failed:", portalErr);
      }

      // ── Fetch trade connections (vendors, subs, contractors) via accepted user connections ──
      try {
        const tradesConnectionModel = prisma.tradesConnection as any;
        const userConnections = await tradesConnectionModel.findMany({
          where: {
            OR: [{ requesterId: userId }, { addresseeId: userId }],
            status: "accepted",
          },
          orderBy: { connectedAt: "desc" },
        });

        // Get member profiles (with company info) for connected users
        const connectedUserIds = userConnections.map((c: any) =>
          c.requesterId === userId ? c.addresseeId : c.requesterId
        );

        if (connectedUserIds.length > 0) {
          const connectedMembers = await prisma.tradesCompanyMember.findMany({
            where: { userId: { in: connectedUserIds } },
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
          });

          connections = connectedMembers
            .filter(
              (m: any) =>
                m.company && !isDemoContact({ email: m.company.email, firstName: m.company.name })
            )
            .map((m: any) => {
              const companyType = (m.tradeType || m.role || "contractor").toLowerCase();
              return {
                id: m.id,
                type: companyType,
                name: m.company?.name || m.companyName || "Unknown Company",
                logo: m.company?.logo,
                verified: m.company?.isVerified,
                city: m.company?.city || m.city,
                state: m.company?.state || m.state,
                specialties: m.company?.specialties || m.specialties || [],
                phone: m.company?.phone || m.phone,
                email: m.company?.email || m.email,
                companyId: m.companyId,
                createdAt: m.createdAt ? String(m.createdAt) : null,
              };
            });
        }
      } catch (e) {
        logger.error("[CompanyContacts] Trade connections query failed:", e);
        connections = [];
      }

      vendorCount = connections.filter((c) => c.type === "vendor").length;
      subCount = connections.filter((c) => c.type === "subcontractor").length;
      contractorCount = connections.filter((c) => c.type === "contractor").length;

      // ── Fetch team members (company seats) ──
      try {
        if (myCompanyId) {
          const members = await prisma.tradesCompanyMember.findMany({
            where: {
              companyId: myCompanyId,
              isActive: true,
              // Exclude current user from the team list (they can see themselves elsewhere)
              NOT: { userId },
            },
            select: {
              id: true,
              userId: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true,
              avatar: true,
              profilePhoto: true,
              jobTitle: true,
              role: true,
              isOwner: true,
              isAdmin: true,
              companyId: true,
              companyName: true,
            },
            orderBy: [{ isOwner: "desc" }, { isAdmin: "desc" }, { createdAt: "asc" }],
          });
          teamMembers = members.filter((m) => !isDemoContact(m));
        }
      } catch (teamErr) {
        logger.error("[CompanyContacts] Team members query failed:", teamErr);
        teamMembers = [];
      }

      // ══════════════════════════════════════════════════════════════════════════
      // ADJUSTERS — Fetch unique adjusters from claims
      // ══════════════════════════════════════════════════════════════════════════
      try {
        const claimsWithAdjusters = await prisma.claims.findMany({
          where: {
            orgId: organizationId,
            adjusterName: { not: null },
            isDemo: false,
          },
          orderBy: { updatedAt: "desc" },
          select: {
            id: true,
            claimNumber: true,
            adjusterName: true,
            adjusterEmail: true,
            adjusterPhone: true,
            carrier: true,
            createdAt: true,
          },
        });

        // Deduplicate adjusters by name+email combo
        const adjusterMap = new Map<string, any>();

        for (const cl of claimsWithAdjusters) {
          const name = cl.adjusterName?.trim();
          if (!name) continue;
          if (isDemoContact({ name, email: cl.adjusterEmail })) continue;

          // Use name+email as unique key
          const key = `${name.toLowerCase()}-${(cl.adjusterEmail || "").toLowerCase()}`;

          if (!adjusterMap.has(key)) {
            const nameParts = name.split(" ");
            adjusterMap.set(key, {
              id: `adjuster-${cl.id}`,
              type: "adjuster",
              contactType: "adjuster",
              name,
              firstName: nameParts[0] || "",
              lastName: nameParts.slice(1).join(" ") || "",
              email: cl.adjusterEmail || null,
              phone: cl.adjusterPhone || null,
              company: cl.carrier || null,
              tags: [cl.carrier, cl.claimNumber].filter(Boolean),
              createdAt: cl.createdAt ? String(cl.createdAt) : null,
              href: `/claims/${cl.id}`,
              claimId: cl.id,
              claimIds: [cl.id],
            });
          } else {
            // Add this claim to the existing adjuster's tags
            const existing = adjusterMap.get(key);
            if (cl.claimNumber && !existing.tags.includes(cl.claimNumber)) {
              existing.tags.push(cl.claimNumber);
            }
            if (!existing.claimIds.includes(cl.id)) {
              existing.claimIds.push(cl.id);
            }
          }
        }

        adjusters = Array.from(adjusterMap.values());
      } catch (adjErr) {
        logger.error("[CompanyContacts] Adjusters query failed:", adjErr);
        adjusters = [];
      }
    } catch (error) {
      logger.error("[CONTACTS_API_ERROR]", {
        error: error?.message,
        code: error?.code,
        organizationId,
        userId,
      });

      // Treat errors as empty state - friendly UI instead of scary error
      logger.debug("[ClientContactsPage] Treating DB error as empty state");
      contacts = [];
    }
  }

  // Filter connections by type
  const vendors = connections.filter((c) => c.type === "vendor");
  const subcontractors = connections.filter((c) => c.type === "subcontractor");
  const contractors = connections.filter((c) => c.type === "contractor");

  // Combine all items
  const allItems = [...contacts, ...connections, ...teamMembers, ...adjusters];
  const totalCount = allItems.length;
  const clientCount = contacts.length;
  const teamCount = teamMembers.length;
  const adjusterCount = adjusters.length;

  // Helper to render contact card - Uses UniversalContactCard for all contact types
  const renderContactCard = (contact: any) => (
    <UniversalContactCard
      key={contact.id}
      contact={{
        id: contact.id,
        name: contact.name,
        firstName: contact.firstName,
        lastName: contact.lastName,
        email: contact.email,
        phone: contact.phone,
        tags: contact.tags,
        contactType: contact.contactType || contact.type || "client",
        href: contact.href,
        claimId: contact.claimId,
      }}
    />
  );

  // Helper to render connection card - Uses client component for onClick handlers
  const renderConnectionCard = (conn: any) => <ConnectionCard key={conn.id} conn={conn} />;

  // Helper to render team member card
  const renderTeamMemberCard = (member: any) => <TeamMemberCard key={member.id} member={member} />;

  // Company Contacts page: unified view of clients + trade connections + team
  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="network"
        title="Company Contacts"
        subtitle={`${totalCount} contact${totalCount !== 1 ? "s" : ""} & connections in your workspace`}
        icon={<Users className="h-5 w-5" />}
      >
        {testMode && (
          <Badge variant="secondary" className="bg-muted text-foreground">
            Test mode enabled
          </Badge>
        )}
        <Link
          href="/claims"
          className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium text-white hover:bg-white/20"
        >
          <UserCheck className="h-4 w-4" />
          Import from Claims
        </Link>
      </PageHero>

      {totalCount === 0 ? (
        <CRMCard className="px-8 py-20 text-center">
          <h2 className="mb-2 text-2xl font-semibold text-foreground">No contacts yet</h2>
          <p className="mx-auto max-w-lg text-sm text-muted-foreground">
            Add clients from your claims or connect with vendors and subcontractors to build your
            network.
          </p>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Link href="/claims" className="text-sm font-medium text-primary underline">
              Go to Claims
            </Link>
            <span className="text-muted-foreground">•</span>
            <Link href="/trades" className="text-sm font-medium text-primary underline">
              Network Hub
            </Link>
          </div>
        </CRMCard>
      ) : (
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="mb-6 grid w-full grid-cols-7 lg:inline-flex lg:w-auto">
            <TabsTrigger value="all" className="gap-2">
              <Users className="h-4 w-4" />
              All ({totalCount})
            </TabsTrigger>
            <TabsTrigger value="clients" className="gap-2">
              <UserCheck className="h-4 w-4" />
              Clients ({clientCount})
            </TabsTrigger>
            <TabsTrigger value="adjusters" className="gap-2">
              <Shield className="h-4 w-4" />
              Adjusters ({adjusterCount})
            </TabsTrigger>
            <TabsTrigger value="team" className="gap-2">
              <UsersRound className="h-4 w-4" />
              Team ({teamCount})
            </TabsTrigger>
            <TabsTrigger value="vendors" className="gap-2">
              <Package className="h-4 w-4" />
              Vendors ({vendorCount})
            </TabsTrigger>
            <TabsTrigger value="subcontractors" className="gap-2">
              <HardHat className="h-4 w-4" />
              Subs ({subCount})
            </TabsTrigger>
            <TabsTrigger value="contractors" className="gap-2">
              <Building2 className="h-4 w-4" />
              Contractors ({contractorCount})
            </TabsTrigger>
          </TabsList>

          {/* All Contacts Tab */}
          <TabsContent value="all" className="space-y-6">
            {teamMembers.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <UsersRound className="h-5 w-5 text-indigo-600" />
                  Team Members ({teamCount})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {teamMembers.map(renderTeamMemberCard)}
                </div>
              </div>
            )}
            {contacts.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <UserCheck className="h-5 w-5 text-blue-600" />
                  Clients ({clientCount})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {contacts.map(renderContactCard)}
                </div>
              </div>
            )}
            {adjusters.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Shield className="h-5 w-5 text-orange-600" />
                  Insurance Adjusters ({adjusterCount})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {adjusters.map(renderContactCard)}
                </div>
              </div>
            )}
            {connections.length > 0 && (
              <div>
                <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-foreground">
                  <Building2 className="h-5 w-5 text-amber-600" />
                  Trade Connections ({connections.length})
                </h3>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {connections.map(renderConnectionCard)}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Clients Tab */}
          <TabsContent value="clients">
            {contacts.length === 0 ? (
              <CRMCard className="px-8 py-12 text-center">
                <UserCheck className="mx-auto mb-4 h-12 w-12 text-blue-400" />
                <h3 className="mb-2 text-lg font-semibold">No clients yet</h3>
                <p className="text-sm text-muted-foreground">
                  Add clients from your claims to see them here.
                </p>
              </CRMCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {contacts.map(renderContactCard)}
              </div>
            )}
          </TabsContent>

          {/* Adjusters Tab */}
          <TabsContent value="adjusters">
            {adjusters.length === 0 ? (
              <CRMCard className="px-8 py-12 text-center">
                <Shield className="mx-auto mb-4 h-12 w-12 text-orange-400" />
                <h3 className="mb-2 text-lg font-semibold">No adjusters yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Adjusters are automatically saved when you add their info to a claim.
                </p>
                <Link
                  href="/claims"
                  className="inline-flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700"
                >
                  <Briefcase className="h-4 w-4" />
                  Go to Claims →
                </Link>
              </CRMCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {adjusters.map(renderContactCard)}
              </div>
            )}
          </TabsContent>

          {/* Team Members Tab */}
          <TabsContent value="team">
            {teamMembers.length === 0 ? (
              <CRMCard className="px-8 py-12 text-center">
                <UsersRound className="mx-auto mb-4 h-12 w-12 text-indigo-400" />
                <h3 className="mb-2 text-lg font-semibold">No team members yet</h3>
                <p className="mb-4 text-sm text-muted-foreground">
                  Invite team members from your Company Seats page.
                </p>
                <Link
                  href="/teams"
                  className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700"
                >
                  Manage Company Seats →
                </Link>
              </CRMCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {teamMembers.map(renderTeamMemberCard)}
              </div>
            )}
          </TabsContent>

          {/* Vendors Tab */}
          <TabsContent value="vendors">
            {vendors.length === 0 ? (
              <CRMCard className="px-8 py-12 text-center">
                <Package className="mx-auto mb-4 h-12 w-12 text-amber-400" />
                <h3 className="mb-2 text-lg font-semibold">No vendors yet</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with vendors in the Network Hub.
                </p>
              </CRMCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {vendors.map(renderConnectionCard)}
              </div>
            )}
          </TabsContent>

          {/* Subcontractors Tab */}
          <TabsContent value="subcontractors">
            {subcontractors.length === 0 ? (
              <CRMCard className="px-8 py-12 text-center">
                <HardHat className="mx-auto mb-4 h-12 w-12 text-green-400" />
                <h3 className="mb-2 text-lg font-semibold">No subcontractors yet</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with subcontractors in the Network Hub.
                </p>
              </CRMCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {subcontractors.map(renderConnectionCard)}
              </div>
            )}
          </TabsContent>

          {/* Contractors Tab */}
          <TabsContent value="contractors">
            {contractors.length === 0 ? (
              <CRMCard className="px-8 py-12 text-center">
                <Building2 className="mx-auto mb-4 h-12 w-12 text-purple-400" />
                <h3 className="mb-2 text-lg font-semibold">No contractors yet</h3>
                <p className="text-sm text-muted-foreground">
                  Connect with contractors in the Network Hub.
                </p>
              </CRMCard>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {contractors.map(renderConnectionCard)}
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}

      {totalCount > 0 && (
        <div className="mt-8 text-center text-sm text-slate-500 dark:text-slate-400">
          Showing {totalCount} total ({clientCount} clients, {adjusterCount} adjusters, {teamCount}{" "}
          team, {connections.length} trade connections)
        </div>
      )}
    </PageContainer>
  );
}
