/**
 * Client Detail View Page
 * Full profile view of a connected client - visible to pros
 * Route: /dashboard/trades/clients/[clientId]
 */

import { format } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  FileText,
  Home,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Shield,
  User,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";

interface ClientDetailPageProps {
  params: Promise<{ clientId: string }>;
}

export default async function ClientDetailPage({ params }: ClientDetailPageProps) {
  const { clientId } = await params;
  const ctx = await safeOrgContext();

  if (ctx.status !== "ok" || !ctx.orgId) {
    return <NoOrgMembershipBanner title="Client Detail" />;
  }

  // Get the contractor profile for access check
  const contractorProfile = await prisma.tradesCompanyMember.findFirst({
    where: { orgId: ctx.orgId },
    select: { id: true, companyId: true },
  });

  if (!contractorProfile?.companyId) {
    redirect("/dashboard/trades/clients");
  }

  // Verify the pro is connected to this client — use companyId (tradesCompany.id)
  const connection = await prisma.clientProConnection.findFirst({
    where: {
      clientId,
      contractorId: contractorProfile.companyId,
      status: { in: ["accepted", "connected"] },
    },
  });

  if (!connection) {
    notFound();
  }

  // Fetch full client data
  const client = await prisma.client.findUnique({
    where: { id: clientId },
    select: {
      id: true,
      userId: true,
      name: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      address: true,
      city: true,
      state: true,
      postal: true,
      avatarUrl: true,
      coverPhotoUrl: true,
      propertyPhotoUrl: true,
      createdAt: true,
    },
  });

  if (!client) {
    notFound();
  }

  // Fetch related claims for this client (if any)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let claims: any[] = [];
  try {
    claims = await prisma.claims.findMany({
      where: { clientId: client.id },
      select: {
        id: true,
        claimNumber: true,
        status: true,
        dateOfLoss: true,
        createdAt: true,
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });
  } catch {
    // Claims table may not link to client userId
  }

  const displayName =
    client.name ||
    `${client.firstName || ""} ${client.lastName || ""}`.trim() ||
    client.email?.split("@")[0] ||
    "Client";

  const initials =
    (client.firstName?.[0] || client.name?.[0] || "").toUpperCase() +
      (client.lastName?.[0] || "").toUpperCase() || "C";

  const locationString = [client.city, client.state].filter(Boolean).join(", ");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-green-50/20">
      {/* Cover Photo */}
      <div className="relative h-48 overflow-hidden rounded-t-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 md:h-64">
        {client.coverPhotoUrl && (
          <Image src={client.coverPhotoUrl} alt="Cover" fill className="object-cover" priority />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />

        {/* Back button */}
        <div className="absolute left-6 top-6">
          <Link href="/dashboard/trades/clients">
            <Button variant="secondary" size="sm" className="gap-2 shadow-lg">
              <ArrowLeft className="h-4 w-4" />
              Back to Clients
            </Button>
          </Link>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 pb-16">
        {/* Profile Header - overlaps cover */}
        <div className="relative z-10 -mt-20 mb-8 flex flex-col items-start gap-6 md:flex-row md:items-end">
          {/* Avatar */}
          <div className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl border-4 border-white bg-white shadow-lg md:h-36 md:w-36">
            {client.avatarUrl ? (
              <Image src={client.avatarUrl} alt={displayName} fill className="object-cover" />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-emerald-400 to-teal-600 text-4xl font-bold text-white">
                {initials}
              </div>
            )}
          </div>

          {/* Name & Quick Info */}
          <div className="flex-1">
            <h1 className="text-3xl font-bold text-gray-900">{displayName}</h1>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-gray-500">
              {locationString && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  {locationString}
                </span>
              )}
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                Connected{" "}
                {connection.connectedAt
                  ? format(new Date(connection.connectedAt), "MMM d, yyyy")
                  : "recently"}
              </span>
            </div>

            {/* Quick Actions */}
            <div className="mt-4 flex flex-wrap gap-2">
              <Link href={`/trades/messages?clientId=${client.id}`}>
                <Button size="sm" className="gap-2">
                  <MessageSquare className="h-4 w-4" />
                  Message
                </Button>
              </Link>
              {client.phone && (
                <a href={`tel:${client.phone}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                </a>
              )}
              {client.email && (
                <a href={`mailto:${client.email}`}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                </a>
              )}
              <Link href={`/crm/contacts?clientId=${client.id}`}>
                <Button variant="outline" size="sm" className="gap-2">
                  <FileText className="h-4 w-4" />
                  View in CRM
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-3">
          {/* Main Column */}
          <div className="space-y-6 md:col-span-2">
            {/* Contact Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <User className="h-5 w-5 text-blue-600" />
                  Contact Information
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                {client.email && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Email</p>
                    <a href={`mailto:${client.email}`} className="text-blue-600 hover:underline">
                      {client.email}
                    </a>
                  </div>
                )}
                {client.phone && (
                  <div>
                    <p className="text-sm font-medium text-gray-500">Phone</p>
                    <a href={`tel:${client.phone}`} className="text-blue-600 hover:underline">
                      {client.phone}
                    </a>
                  </div>
                )}
                {client.address && (
                  <div className="sm:col-span-2">
                    <p className="text-sm font-medium text-gray-500">Address</p>
                    <p className="text-gray-900">
                      {client.address}
                      {client.city ? `, ${client.city}` : ""}
                      {client.state ? `, ${client.state}` : ""}
                      {client.postal ? ` ${client.postal}` : ""}
                    </p>
                  </div>
                )}
                <div>
                  <p className="text-sm font-medium text-gray-500">Client Since</p>
                  <p className="text-gray-900">
                    {client.createdAt
                      ? format(new Date(client.createdAt), "MMMM d, yyyy")
                      : "Unknown"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Property Photo */}
            {client.propertyPhotoUrl && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Home className="h-5 w-5 text-emerald-600" />
                    Property Photo
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="relative aspect-video overflow-hidden rounded-lg">
                    <Image
                      src={client.propertyPhotoUrl}
                      alt="Property"
                      fill
                      className="object-cover"
                    />
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Claims History */}
            {claims.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Shield className="h-5 w-5 text-amber-600" />
                    Claims History
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {claims.map((claim) => (
                      <div
                        key={claim.id}
                        className="flex items-center justify-between rounded-lg border p-3"
                      >
                        <div>
                          <p className="font-medium text-gray-900">
                            {claim.claimNumber || "Claim"}
                          </p>
                          <p className="text-sm text-gray-500">
                            {claim.dateOfLoss
                              ? format(new Date(claim.dateOfLoss), "MMM d, yyyy")
                              : "No date"}
                          </p>
                        </div>
                        <Badge
                          variant={
                            claim.status === "completed"
                              ? "default"
                              : claim.status === "active"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {claim.status || "Unknown"}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Connection Status */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connection</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="h-2.5 w-2.5 rounded-full bg-green-500" />
                  <span className="text-sm font-medium text-green-700">Connected</span>
                </div>
                <div className="text-sm text-gray-500">
                  <div className="flex items-center gap-2">
                    <Clock className="h-4 w-4" />
                    {connection.connectedAt
                      ? format(new Date(connection.connectedAt), "MMM d, yyyy 'at' h:mm a")
                      : "Recently"}
                  </div>
                </div>
                {connection.notes && (
                  <div>
                    <p className="text-xs font-medium text-gray-500">Notes</p>
                    <p className="text-sm text-gray-900">{connection.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Stats</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Total Claims</span>
                  <span className="font-semibold">{claims.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">Has Property Photo</span>
                  <span className="font-semibold">{client.propertyPhotoUrl ? "Yes" : "No"}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
