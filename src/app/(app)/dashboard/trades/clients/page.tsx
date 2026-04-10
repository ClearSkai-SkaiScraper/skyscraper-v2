/**
 * My Clients Page - Pro Dashboard
 * Shows all clients connected with the contractor
 */

import { format } from "date-fns";
import { Mail, MapPin, Phone, Users } from "lucide-react";
import Link from "next/link";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageHero } from "@/components/layout/PageHero";
import GlassPanel from "@/components/trades/GlassPanel";
import { Button } from "@/components/ui/button";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

export default async function MyClientsPage() {
  const ctx = await safeOrgContext();

  if (ctx.status !== "ok" || !ctx.orgId) {
    return <NoOrgMembershipBanner title="My Clients" />;
  }

  // Get contractor profile - orgId is not unique, must use findFirst
  const contractorProfile = await prisma.tradesCompanyMember.findFirst({
    where: { orgId: ctx.orgId },
    select: { id: true, companyId: true },
  });

  if (!contractorProfile) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8">
        <PageHero
          title="My Clients"
          subtitle="Manage your connected clients and opportunities"
          icon={<Users className="h-5 w-5" />}
        />
        <GlassPanel className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Set up your contractor profile first to connect with clients.
          </p>
        </GlassPanel>
      </div>
    );
  }

  // contractorId FK references tradesCompany.id, NOT tradesCompanyMember.id
  if (!contractorProfile.companyId) {
    return (
      <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8">
        <PageHero
          title="My Clients"
          subtitle="Manage your connected clients and opportunities"
          icon={<Users className="h-5 w-5" />}
        />
        <GlassPanel className="p-8 text-center">
          <p className="text-sm text-muted-foreground">
            Complete your company setup first to connect with clients.
          </p>
        </GlassPanel>
      </div>
    );
  }

  // Get all client connections — use companyId (tradesCompany.id) and uppercase status
  // Accept both "ACCEPTED" and legacy lowercase "accepted"/"connected"
  const connections = await prisma.clientProConnection.findMany({
    where: {
      contractorId: contractorProfile.companyId,
      status: { in: ["ACCEPTED", "accepted", "connected"] },
    },
    orderBy: { connectedAt: "desc" },
  });

  const clientIds = Array.from(new Set(connections.map((c) => c.clientId)));

  // Get the current pro user's email and Clerk userId to filter out self-connections
  const proUser = await prisma.users.findFirst({
    where: { orgId: ctx.orgId },
    select: { clerkUserId: true, email: true },
  });

  const clients = await prisma.client.findMany({
    where: {
      id: { in: clientIds },
      // Exclude ghost clients: clients with no orgId whose userId matches a pro
      // Also exclude self-connections (client with same email as the pro user)
      NOT: [
        ...(proUser?.clerkUserId ? [{ userId: proUser.clerkUserId }] : []),
        ...(proUser?.email ? [{ email: proUser.email }] : []),
      ],
    },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      postal: true,
      avatarUrl: true,
      coverPhotoUrl: true,
    },
  });

  const clientsById = new Map(clients.map((c) => [c.id, c] as const));

  return (
    <div className="mx-auto max-w-[1200px] space-y-6 px-6 py-8">
      <PageHero
        title="My Clients"
        subtitle={`${connections.length} connected client${connections.length !== 1 ? "s" : ""}`}
        icon={<Users className="h-5 w-5" />}
      >
        <Button asChild variant="default">
          <Link href="/dashboard/trades/opportunities">View Opportunities</Link>
        </Button>
      </PageHero>

      {connections.length === 0 ? (
        <GlassPanel className="p-12 text-center">
          <Users className="mx-auto h-16 w-16 text-muted-foreground/30" />
          <h3 className="mt-4 text-lg font-semibold text-foreground">No Clients Yet</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            When clients connect with you through the network, they&apos;ll appear here.
          </p>
        </GlassPanel>
      ) : (
        <div className="space-y-4">
          {connections.map((connection) => {
            const client = clientsById.get(connection.clientId);

            if (!client) return null;

            return (
              <GlassPanel key={connection.id} className="p-6">
                <Link
                  href={`/dashboard/trades/clients/${client.id}`}
                  className="block transition-transform hover:scale-[1.005]"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center overflow-hidden rounded-full bg-primary/10">
                          {client.avatarUrl ? (
                            <img
                              src={client.avatarUrl}
                              alt={client.name || ""}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Users className="h-6 w-6 text-primary" />
                          )}
                        </div>
                        <div>
                          <h3 className="text-lg font-semibold text-foreground">{client.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Connected{" "}
                            {connection.connectedAt
                              ? format(new Date(connection.connectedAt), "MMM d, yyyy")
                              : "recently"}
                          </p>
                        </div>
                      </div>

                      {/* Contact Info */}
                      <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
                        {client.email && (
                          <div className="flex items-center gap-2">
                            <Mail className="h-4 w-4" />
                            <span>{client.email}</span>
                          </div>
                        )}
                        {client.phone && (
                          <div className="flex items-center gap-2">
                            <Phone className="h-4 w-4" />
                            <span>{client.phone}</span>
                          </div>
                        )}
                        {client.address && (
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4" />
                            <span>
                              {client.address}
                              {client.city ? `, ${client.city}` : ""}
                              {client.state ? `, ${client.state}` : ""}
                              {client.postal ? ` ${client.postal}` : ""}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col gap-2" onClick={(e) => e.stopPropagation()}>
                      <Button asChild variant="default" size="sm">
                        <Link href={`/dashboard/trades/clients/${client.id}`}>View Profile</Link>
                      </Button>
                      <Button asChild variant="outline" size="sm">
                        <Link href={`/crm/contacts?clientId=${client.id}`}>View in CRM</Link>
                      </Button>
                    </div>
                  </div>
                </Link>
              </GlassPanel>
            );
          })}
        </div>
      )}
    </div>
  );
}
