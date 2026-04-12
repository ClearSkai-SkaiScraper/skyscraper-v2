// eslint-disable-next-line no-restricted-imports
import { currentUser } from "@clerk/nextjs/server";
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  DollarSign,
  FileSignature,
  FileText,
  Mail,
  MoreHorizontal,
  PlusIcon,
  Share2,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { logger } from "@/lib/logger";
import { getCurrentUserPermissions } from "@/lib/permissions";
import prisma from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function ContractsPage() {
  const user = await currentUser();
  if (!user) redirect("/sign-in");
  const { orgId } = await getCurrentUserPermissions();

  if (!orgId) {
    return <NoOrgMembershipBanner title="Contracts" />;
  }

  // ── Real data from claims + jobs ──────────────────────────────────
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let insuranceClaims: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let retailJobs: any[] = [];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let allJobs: any[] = [];

  try {
    insuranceClaims = await prisma.claims.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        claimNumber: true,
        title: true,
        status: true,
        estimatedValue: true,
        updatedAt: true,
      },
    });
  } catch (e) {
    logger.error("[Contracts] Error fetching claims:", e);
  }

  try {
    allJobs = await prisma.jobs.findMany({
      where: { orgId },
      orderBy: { updatedAt: "desc" },
      select: {
        id: true,
        title: true,
        status: true,
        jobType: true,
        updatedAt: true,
      },
    });
    retailJobs = allJobs.filter(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (j: any) =>
        j.jobType === "out_of_pocket" || j.jobType === "retail" || j.jobType === "financed"
    );
  } catch (e) {
    logger.error("[Contracts] Error fetching jobs:", e);
  }

  // ── Compute real stats ────────────────────────────────────────────
  const pendingSignature = insuranceClaims.filter(
    (c) => c.status === "pending" || c.status === "awaiting_signature"
  ).length;
  const activeContracts =
    insuranceClaims.filter(
      (c) => c.status === "in_progress" || c.status === "approved" || c.status === "active"
    ).length +
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    allJobs.filter((j: any) => j.status === "active" || j.status === "in_progress").length;
  const needsReview = insuranceClaims.filter(
    (c) => c.status === "review" || c.status === "needs_review"
  ).length;
  const insuranceValue = insuranceClaims.reduce(
    (sum, c) => sum + (Number(c.estimatedValue) || 0),
    0
  );

  // Recent activity: last 10 updated items
  const recentActivity = [
    ...insuranceClaims.map((c) => ({
      id: c.id,
      label: c.title || c.claimNumber || "Untitled Claim",
      type: "Insurance Claim" as const,
      status: c.status,
      date: c.updatedAt,
      href: `/claims/${c.id}`,
    })),
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ...retailJobs.map((j: any) => ({
      id: j.id,
      label: j.title || "Untitled Job",
      type: "Retail Job" as const,
      status: j.status,
      date: j.updatedAt,
      href: `/jobs/retail/${j.id}`,
    })),
  ]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 10);

  return (
    <div className="container mx-auto space-y-6 p-6">
      <PageHero
        section="reports"
        title="Contracts"
        subtitle="Manage your roofing contracts and agreements"
        icon={<FileText className="h-6 w-6" />}
        actions={
          <Button asChild className="bg-sky-600 text-white hover:bg-sky-700">
            <Link href="/contracts/new">
              <PlusIcon className="mr-2 h-4 w-4" />
              New Contract
            </Link>
          </Button>
        }
      />

      {/* Contract Stats — wired to real DB */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <Clock className="h-4 w-4 text-yellow-600" />
              Pending Signature
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingSignature}</div>
            <p className="text-xs text-slate-700 dark:text-slate-300">
              Awaiting customer signature
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <CheckCircle className="h-4 w-4 text-green-600" />
              Active Contracts
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeContracts}</div>
            <p className="text-xs text-slate-700 dark:text-slate-300">Currently in progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              Needs Review
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{needsReview}</div>
            <p className="text-xs text-slate-700 dark:text-slate-300">Requires attention</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-sm font-medium">
              <DollarSign className="h-4 w-4 text-green-600" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${insuranceValue.toLocaleString()}</div>
            <p className="text-xs text-slate-700 dark:text-slate-300">Active contracts</p>
          </CardContent>
        </Card>
      </div>

      {/* Contract Types */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        <Link href="/claims">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-blue-600" />
                Insurance Claims
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-slate-700 dark:text-slate-300">
                Contracts for insurance claim work
              </p>
              <div className="flex justify-between">
                <span className="font-semibold">
                  {insuranceClaims.length} contract{insuranceClaims.length !== 1 ? "s" : ""}
                </span>
                <span className="text-green-600">${insuranceValue.toLocaleString()}</span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/jobs/retail">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-green-600" />
                Retail Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-slate-700 dark:text-slate-300">
                Direct retail customer contracts
              </p>
              <div className="flex justify-between">
                <span className="font-semibold">
                  {retailJobs.length} contract{retailJobs.length !== 1 ? "s" : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>

        <Link href="/pipeline">
          <Card className="transition-shadow hover:shadow-md">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-600" />
                Maintenance & Repair
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-slate-700 dark:text-slate-300">
                Ongoing maintenance agreements
              </p>
              <div className="flex justify-between">
                <span className="font-semibold">
                  {allJobs.filter((j: { jobType?: string }) => j.jobType === "repair").length}{" "}
                  contract
                  {allJobs.filter((j: { jobType?: string }) => j.jobType === "repair").length !== 1
                    ? "s"
                    : ""}
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Recent Contract Activity — real data */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Contract Activity</CardTitle>
        </CardHeader>
        <CardContent>
          {recentActivity.length === 0 ? (
            <p className="py-6 text-center text-slate-500">
              No contracts yet. Create a claim or retail job to get started.
            </p>
          ) : (
            <div className="divide-y">
              {recentActivity.map((item) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded px-2 py-3 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800"
                >
                  <Link href={item.href} className="flex-1">
                    <p className="font-medium">{item.label}</p>
                    <p className="text-sm text-slate-500">{item.type}</p>
                  </Link>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <span className="inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium capitalize dark:bg-slate-800">
                        {item.status?.replace(/_/g, " ") || "unknown"}
                      </span>
                      <p className="mt-1 text-xs text-slate-500">
                        {new Date(item.date).toLocaleDateString()}
                      </p>
                    </div>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={item.href}>
                            <FileText className="mr-2 h-4 w-4" />
                            View Contract
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link href={`${item.href}?tab=documents`}>
                            <FileSignature className="mr-2 h-4 w-4" />
                            Request Signature
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`${item.href}?action=email`}>
                            <Mail className="mr-2 h-4 w-4" />
                            Send via Email
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`${item.href}?action=share`}>
                            <Share2 className="mr-2 h-4 w-4" />
                            Share / Forward
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
