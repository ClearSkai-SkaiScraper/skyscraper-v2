// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import { ArrowLeft, Calendar, DollarSign, MapPin, User } from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

interface ClaimDetail {
  id: string;
  claimNumber: string | null;
  title: string | null;
  status: string | null;
  estimatedValue: unknown;
  createdAt: Date;
  updatedAt: Date;
  properties: {
    street: string | null;
    city: string | null;
    state: string | null;
    zipCode: string | null;
  } | null;
  contacts: {
    firstName: string | null;
    lastName: string | null;
    email: string | null;
    phone: string | null;
  } | null;
}

interface JobDetail {
  id: string;
  title: string | null;
  status: string | null;
  estimatedValue: unknown;
  createdAt: Date;
  updatedAt: Date;
}

export const dynamic = "force-dynamic";

export default async function ContractDetailPage({ params }: { params: { id: string } }) {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { orgId } = await getCurrentUserPermissions();
  if (!orgId) return <NoOrgMembershipBanner title="Contract Detail" />;

  // Try to find as a claim first
  let claim: ClaimDetail | null = null;
  let job: JobDetail | null = null;

  try {
    claim = (await prisma.claims.findFirst({
      where: { id: params.id, orgId },
      select: {
        id: true,
        claimNumber: true,
        title: true,
        status: true,
        estimatedValue: true,
        createdAt: true,
        updatedAt: true,
        properties: {
          select: {
            street: true,
            city: true,
            state: true,
            zipCode: true,
          },
        },
        contacts: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
          },
        },
      } as unknown as Record<string, unknown>,
    })) as unknown as ClaimDetail | null;
  } catch (e) {
    logger.error("[ContractDetail] Error fetching claim:", e);
  }

  // If not a claim, try as a job
  if (!claim) {
    try {
      job = (await prisma.jobs.findFirst({
        where: { id: params.id, orgId },
        select: {
          id: true,
          title: true,
          status: true,
          estimatedValue: true,
          createdAt: true,
          updatedAt: true,
        } as unknown as Record<string, boolean>,
      })) as unknown as JobDetail | null;
    } catch (e) {
      logger.error("[ContractDetail] Error fetching job:", e);
    }
  }

  if (!claim && !job) {
    notFound();
  }

  const contract = claim || job;
  const isClaim = !!claim;

  const statusColor =
    contract?.status === "completed"
      ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
      : contract?.status === "in_progress"
        ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400"
        : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";

  return (
    <PageContainer maxWidth="5xl">
      <div className="mb-6">
        <Link
          href="/contracts"
          className="inline-flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Contracts
        </Link>
      </div>

      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            {isClaim
              ? claim?.claimNumber || claim?.title || "Claim Contract"
              : job?.title || "Job Contract"}
          </h1>
          <div className="mt-2 flex items-center gap-3">
            <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusColor}`}>
              {contract?.status?.replace(/_/g, " ") || "Pending"}
            </span>
            <span className="text-sm text-slate-500">
              {isClaim ? "Insurance Claim" : "Retail Job"}
            </span>
          </div>
        </div>
        <Button variant="outline" asChild>
          <Link href={isClaim ? `/claims/${contract?.id}` : `/jobs/retail/${contract?.id}`}>
            Open Full Details →
          </Link>
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Contract Value */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-green-600" />
              Contract Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-700 dark:text-green-400">
              ${Number(contract?.estimatedValue || 0).toLocaleString()}
            </p>
          </CardContent>
        </Card>

        {/* Dates */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Calendar className="h-4 w-4 text-blue-600" />
              Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Created</span>
              <span>{new Date(contract?.createdAt ?? "").toLocaleDateString()}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600 dark:text-slate-400">Last Updated</span>
              <span>{new Date(contract?.updatedAt ?? "").toLocaleDateString()}</span>
            </div>
          </CardContent>
        </Card>

        {/* Property (Claims only) */}
        {isClaim && claim?.properties && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <MapPin className="h-4 w-4 text-amber-600" />
                Property
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm">
                {claim?.properties?.street || "Address pending"}
                {claim?.properties?.city &&
                  `, ${claim.properties.city}, ${claim.properties.state} ${claim.properties.zipCode}`}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Contact (Claims only) */}
        {isClaim && claim?.contacts && (
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="flex items-center gap-2 text-sm font-medium">
                <User className="h-4 w-4 text-purple-600" />
                Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p className="font-medium">
                {claim?.contacts?.firstName} {claim?.contacts?.lastName}
              </p>
              {claim?.contacts?.email && (
                <p className="text-slate-600 dark:text-slate-400">{claim.contacts.email}</p>
              )}
              {claim?.contacts?.phone && (
                <p className="text-slate-600 dark:text-slate-400">{claim.contacts.phone}</p>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </PageContainer>
  );
}
