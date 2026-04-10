// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { Award, DollarSign, Gift, Link2, Share2, TrendingUp, Users } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatCard } from "@/components/ui/MetricCard";
import { logger } from "@/lib/logger";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ReferralProgramPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { orgId } = await getCurrentUserPermissions();
  if (!orgId) return <NoOrgMembershipBanner title="Referral Program" />;

  // ── Real data: leads that came from referral source ───────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let referralLeads: any[] = [];
  try {
    referralLeads = await prisma.leads.findMany({
      where: {
        orgId,
        source: { in: ["referral", "word_of_mouth", "Referral", "Word of Mouth"] },
      },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        title: true,
        stage: true,
        value: true,
        createdAt: true,
        source: true,
        contactId: true,
        contacts: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  } catch (e) {
    logger.error("[Referrals] Error fetching referral leads:", e);
  }

  // ── Real data: client connections (referrals from client portal) ──
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let clientConnections: any[] = [];
  try {
    clientConnections = await prisma.clientProConnection.findMany({
      where: {
        tradesCompany: { orgId },
        invitedBy: { not: null },
      },
      orderBy: { invitedAt: "desc" },
      take: 20,
      select: {
        id: true,
        status: true,
        invitedAt: true,
        invitedBy: true,
        Client: {
          select: { firstName: true, lastName: true, email: true },
        },
      },
    });
  } catch (e) {
    logger.error("[Referrals] Error fetching client connections:", e);
  }

  // ── Compute stats ────────────────────────────────────────────────
  const totalReferrals = referralLeads.length + clientConnections.length;
  const converted = referralLeads.filter(
    (l) => l.stage === "won" || l.stage === "closed_won" || l.stage === "completed"
  ).length;
  const totalValue = referralLeads.reduce((sum, l) => sum + (Number(l.value) || 0), 0);
  const pendingReferrals = referralLeads.filter(
    (l) => l.stage === "new" || l.stage === "contacted" || l.stage === "qualifying"
  ).length;

  // Referral link (org-specific)
  const referralLink = `https://skaiscrape.com/refer/${orgId?.slice(0, 12) || "org"}`;

  return (
    <div className="space-y-6 p-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">Referral Program</h1>
          <p className="text-gray-600">Track referrals and client introductions</p>
        </div>
        <Button asChild className="gap-2">
          <Link href="/leads/new">
            <Share2 className="mr-2 h-5 w-5" />
            Add Referral Lead
          </Link>
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <StatCard
          variant="gradient"
          gradientColor="blue"
          label="Total Referrals"
          value={totalReferrals}
          icon={<Users className="h-8 w-8" />}
        />

        <StatCard
          variant="gradient"
          gradientColor="success"
          label="Converted"
          value={converted}
          icon={<Award className="h-8 w-8" />}
        />

        <StatCard
          variant="gradient"
          gradientColor="purple"
          label="Total Value"
          value={`$${totalValue.toLocaleString()}`}
          icon={<DollarSign className="h-8 w-8" />}
        />

        <StatCard
          variant="gradient"
          gradientColor="warning"
          label="Pending"
          value={pendingReferrals}
          icon={<TrendingUp className="h-8 w-8" />}
        />
      </div>

      {/* Referral Leads Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Gift className="h-5 w-5 text-blue-600" />
            Referral Leads
          </CardTitle>
        </CardHeader>
        <CardContent>
          {referralLeads.length === 0 ? (
            <p className="py-8 text-center text-gray-500">
              No referral leads yet. When leads come from referrals, they&apos;ll appear here.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Customer
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Source
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Stage</th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                      Est. Value
                    </th>
                    <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y">
                  {referralLeads.map((lead) => (
                    <tr key={lead.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <Link
                          href={`/leads/${lead.id}`}
                          className="font-medium text-blue-600 hover:underline"
                        >
                          {lead.contacts
                            ? `${lead.contacts.firstName} ${lead.contacts.lastName}`.trim()
                            : lead.title || "Unknown"}
                        </Link>
                        {lead.contacts?.email && (
                          <div className="text-sm text-gray-600">{lead.contacts.email}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 capitalize">{lead.source}</td>
                      <td className="px-6 py-4">
                        <Badge
                          variant={
                            lead.stage === "won" || lead.stage === "closed_won"
                              ? "default"
                              : "outline"
                          }
                          className="capitalize"
                        >
                          {lead.stage?.replace(/_/g, " ") || "new"}
                        </Badge>
                      </td>
                      <td className="px-6 py-4 font-semibold">
                        {lead.value ? `$${Number(lead.value).toLocaleString()}` : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {new Date(lead.createdAt).toLocaleDateString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Client Connections */}
      {clientConnections.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Link2 className="h-5 w-5 text-green-600" />
              Client Introductions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="divide-y">
              {clientConnections.map((conn) => (
                <div key={conn.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium">
                      {[conn.Client?.firstName, conn.Client?.lastName].filter(Boolean).join(" ") ||
                        "Client"}
                    </p>
                    {conn.Client?.email && (
                      <p className="text-sm text-gray-500">{conn.Client.email}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge
                      variant={conn.status === "connected" ? "default" : "outline"}
                      className="capitalize"
                    >
                      {conn.status}
                    </Badge>
                    <span className="text-sm text-gray-500">
                      {new Date(conn.invitedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Referral Link Section */}
      <div className="rounded-lg bg-gradient-to-r from-blue-600 to-indigo-700 p-8 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h2 className="mb-2 text-2xl font-bold">Your Referral Link</h2>
            <p className="mb-4 text-blue-100">
              Share this link with clients to track referrals automatically
            </p>
            <div className="flex items-center gap-3 rounded-lg bg-white/20 p-4">
              <code className="flex-1 font-mono text-white">{referralLink}</code>
            </div>
          </div>
          <Share2 className="h-16 w-16 opacity-50" />
        </div>
      </div>
    </div>
  );
}
