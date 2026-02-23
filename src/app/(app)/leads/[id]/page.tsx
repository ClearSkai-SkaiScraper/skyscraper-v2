import { currentUser } from "@clerk/nextjs/server";
import {
  ArrowLeft,
  CalendarIcon,
  DollarSignIcon,
  EditIcon,
  Mail,
  MapPin,
  MapPinIcon,
  Phone,
  Sparkles,
  Target,
  TrendingUp,
  User,
} from "lucide-react";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { getResolvedOrgResult } from "@/lib/auth/getResolvedOrgId";
import prisma from "@/lib/prisma";
export const dynamic = "force-dynamic";
export const revalidate = 0;

import { TransferJobDropdown } from "@/components/jobs/TransferJobDropdown";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ConvertToClaimButton } from "./_components/ConvertToClaimButton";
import { EditableLeadSummary } from "./_components/EditableLeadSummary";
import LeadDetailTabs from "./_components/LeadDetailTabs";

// Prisma singleton imported from @/lib/db/prisma

async function getLead(id: string, internalOrgId: string) {
  // internalOrgId is already the DB org ID from getResolvedOrgResult
  const lead = await prisma.leads.findFirst({
    where: { id, orgId: internalOrgId },
  });

  if (!lead) return null;

  const contactRow = await prisma.contacts.findUnique({
    where: { id: lead.contactId },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
    },
  });

  const contact = contactRow
    ? {
        ...contactRow,
        firstName: contactRow.firstName,
        lastName: contactRow.lastName,
        zipCode: contactRow.zipCode,
      }
    : null;

  return { lead, contact };
}

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await currentUser();
  if (!user) redirect("/sign-in");

  // Use the proper org resolution - redirects if no org
  const orgResult = await getResolvedOrgResult();
  // orgResult.ok is guaranteed true here (redirects otherwise)
  if (!orgResult.ok) notFound();

  const result = await getLead(id, orgResult.orgId);
  if (!result) notFound();

  const { lead, contact } = result;

  const formatCurrency = (amount?: number) => {
    if (!amount) return "Not set";
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getStageColor = (stage: string) => {
    const normalized = stage?.toLowerCase();
    switch (normalized) {
      case "new":
        return "bg-blue-100 text-blue-800";
      case "qualified":
        return "bg-green-100 text-green-800";
      case "proposal":
        return "bg-yellow-100 text-yellow-800";
      case "negotiation":
        return "bg-orange-100 text-orange-800";
      case "won":
        return "bg-emerald-100 text-emerald-800";
      case "lost":
        return "bg-red-100 text-red-800";
      default:
        return "bg-[var(--surface-1)] text-[color:var(--text)]";
    }
  };

  const jobCategory = (lead as any).jobCategory || "lead";
  const isRetailJob = ["out_of_pocket", "financed", "repair"].includes(jobCategory);
  const contactName = contact
    ? `${contact.firstName || ""} ${contact.lastName || ""}`.trim()
    : "Unknown Contact";
  const stageLabel = (lead.stage || "new").toUpperCase();
  const nextFollowUp = lead.followUpDate ? new Date(lead.followUpDate) : null;
  const fullAddress = contact
    ? [contact.street, contact.city, contact.state].filter(Boolean).join(", ")
    : "";

  // Format value for display (values stored in cents, convert to dollars)
  const formatValue = (val: number | null) =>
    val
      ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val / 100)
      : "TBD";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white dark:from-slate-900 dark:to-slate-950">
      {/* Section-themed gradient header — Jobs (teal) */}
      <header className="bg-gradient-to-r from-teal-500 via-teal-600 to-cyan-600 shadow-lg">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <Link
                href="/leads"
                className="inline-flex items-center gap-2 text-sm text-teal-100 transition-colors hover:text-white"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to Lead Routing
              </Link>
              <div className="mt-3 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 shadow-inner">
                  <Target className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-white">
                      {lead.title || "Lead Workspace"}
                    </h1>
                    <Badge className="border-white/20 bg-white/20 text-white">{stageLabel}</Badge>
                    {lead.temperature && (
                      <Badge className="border-teal-200/30 bg-teal-200/20 text-white">
                        {lead.temperature}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 flex items-center gap-2 text-sm text-teal-100">
                    <User className="h-4 w-4" />
                    {contactName}
                    {fullAddress && (
                      <>
                        <span className="text-teal-200/50">•</span>
                        <MapPin className="h-4 w-4" />
                        {fullAddress}
                      </>
                    )}
                  </p>
                </div>
              </div>
            </div>

            {/* Action buttons - Clean horizontal layout */}
            <div className="flex items-center gap-3">
              {/* Value Badge */}
              <div className="inline-flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 backdrop-blur-sm">
                <DollarSignIcon className="h-5 w-5 text-emerald-300" />
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-teal-200">
                    Value
                  </p>
                  <p className="text-lg font-bold leading-tight text-white">
                    {formatValue(lead.value)}
                  </p>
                </div>
              </div>

              {/* Action Buttons - Horizontal row */}
              <div className="flex items-center gap-2">
                <TransferJobDropdown jobId={lead.id} currentCategory={jobCategory} />
                <ConvertToClaimButton
                  leadId={lead.id}
                  leadTitle={lead.title}
                  leadDescription={lead.description || undefined}
                  isAlreadyConverted={lead.stage === "converted" || !!lead.claimId}
                  existingClaimId={lead.claimId}
                />
                <Link href={`/leads/${lead.id}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                  >
                    <EditIcon className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                </Link>
                {isRetailJob && (
                  <Link href={`/jobs/retail/${lead.id}`}>
                    <Button size="sm" className="bg-white text-teal-700 shadow-md hover:bg-teal-50">
                      <Sparkles className="mr-2 h-4 w-4" />
                      Open Retail Workspace
                    </Button>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="mx-auto max-w-7xl p-6">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <EditableLeadSummary
              lead={{
                id: lead.id,
                title: lead.title,
                description: lead.description,
                source: lead.source,
                value: lead.value,
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
              }}
            />

            {/* Notes / Timeline / Files tabs */}
            <LeadDetailTabs leadId={lead.id} />
          </div>

          <div className="space-y-6">
            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/30">
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5 text-amber-600" />
                  Next Appointment
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm text-muted-foreground">
                {nextFollowUp ? (
                  <>
                    <div className="font-medium text-foreground">
                      {nextFollowUp.toLocaleString()}
                    </div>
                    <div>Scheduled follow-up for this lead.</div>
                    <Button variant="outline" className="mt-2 w-full" asChild>
                      <Link href="/appointments">View Calendar</Link>
                    </Button>
                  </>
                ) : (
                  <>
                    <div>No appointment scheduled yet.</div>
                    <Button variant="outline" className="mt-2 w-full" asChild>
                      <Link href="/appointments">Schedule Appointment</Link>
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-950/30 dark:to-teal-950/30">
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-600" />
                  Contact
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 pt-4">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-800">
                  <div className="text-sm font-semibold">{contactName}</div>
                  <div className="text-xs text-muted-foreground">Primary Contact</div>
                </div>
                {contact?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-emerald-600" />
                    <a
                      href={`mailto:${contact.email}`}
                      className="text-emerald-600 hover:underline"
                    >
                      {contact.email}
                    </a>
                  </div>
                )}
                {contact?.phone && (
                  <div className="flex items-center gap-2 text-sm">
                    <Phone className="h-4 w-4 text-emerald-600" />
                    <a href={`tel:${contact.phone}`} className="text-emerald-600 hover:underline">
                      {contact.phone}
                    </a>
                  </div>
                )}
                {(contact?.street || contact?.city || contact?.state || contact?.zipCode) && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPinIcon className="h-4 w-4" />
                    <span>
                      {[contact?.street, contact?.city, contact?.state, contact?.zipCode]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5 text-blue-600" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-4">
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/leads/${lead.id}/edit`}>
                    <EditIcon className="mr-2 h-4 w-4" /> Edit Lead Details
                  </Link>
                </Button>
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href={`/reports/new?leadId=${lead.id}`}>
                    <TrendingUp className="mr-2 h-4 w-4" /> Create Report
                  </Link>
                </Button>
                {isRetailJob && (
                  <Button
                    className="w-full justify-start bg-indigo-600 hover:bg-indigo-700"
                    asChild
                  >
                    <Link href={`/jobs/retail/${lead.id}`}>
                      <Sparkles className="mr-2 h-4 w-4" /> Open Retail Workspace
                    </Link>
                  </Button>
                )}
                <Button variant="outline" className="w-full justify-start" asChild>
                  <Link href="/project-board">View Project Board</Link>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
