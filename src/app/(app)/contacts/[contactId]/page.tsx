/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any */
// eslint-disable-next-line no-restricted-imports
import { auth } from "@clerk/nextjs/server";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Edit2,
  FileText,
  Home,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Share,
  Star,
  User,
  Video,
} from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import prisma from "@/lib/prisma";
import { safeOrgContext } from "@/lib/safeOrgContext";

export const dynamic = "force-dynamic";
export const revalidate = 0;

type Props = {
  params: Promise<{ contactId: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { contactId } = await params;
  // eslint-disable-next-line @typescript-eslint/await-thenable
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  const orgCtx = await safeOrgContext();
  const organizationId = orgCtx.ok ? orgCtx.orgId : null;
  if (!orgCtx.ok) {
    return { title: "Contacts Unavailable" };
  }
  const contact = await prisma.contacts.findFirst({
    where: { id: contactId, orgId: organizationId ?? undefined },
  });

  if (!contact) {
    return { title: "Contact Not Found" };
  }

  return {
    title: `${contact.firstName} ${contact.lastName} | Contacts`,
    description: `Contact details for ${contact.firstName} ${contact.lastName}`,
  };
}

function MembershipMissing() {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-6 rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] p-8">
        <h1 className="text-3xl font-bold">Initialize Workspace</h1>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          No organization membership detected. Complete onboarding to view contacts.
        </p>
        <div className="flex gap-3">
          <Link
            href="/onboarding/start"
            className="rounded bg-[var(--primary)] px-5 py-2 font-medium text-white"
          >
            🚀 Start Onboarding
          </Link>
          <Link href="/dashboard" className="rounded border border-[color:var(--border)] px-5 py-2">
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorCard({ message }: { message: string }) {
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="w-full max-w-xl space-y-4 rounded-xl border border-red-500/40 bg-red-50 p-8 dark:bg-red-950">
        <h1 className="text-2xl font-bold text-red-700 dark:text-red-200">
          ⚠️ Contact Unavailable
        </h1>
        <p className="text-sm text-red-600 dark:text-red-300">{message}</p>
        <div className="flex gap-3">
          <Link href="/contacts" className="rounded border border-[color:var(--border)] px-5 py-2">
            Contacts
          </Link>
          <Link
            href="/onboarding/start"
            className="rounded bg-[var(--primary)] px-5 py-2 font-medium text-white"
          >
            Onboarding
          </Link>
        </div>
      </div>
    </div>
  );
}

// iPhone-style action button component
function ActionButton({
  icon: Icon,
  label,
  href,
  color = "blue",
}: {
  icon: any;
  label: string;
  href?: string;
  color?: "blue" | "green" | "purple" | "orange";
}) {
  const colorClasses = {
    blue: "bg-blue-500 hover:bg-blue-600",
    green: "bg-green-500 hover:bg-green-600",
    purple: "bg-purple-500 hover:bg-purple-600",
    orange: "bg-orange-500 hover:bg-orange-600",
  };

  const content = (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`flex h-12 w-12 items-center justify-center rounded-full ${colorClasses[color]} text-white shadow-lg transition-all hover:scale-105`}
      >
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs font-medium text-slate-600 dark:text-slate-400">{label}</span>
    </div>
  );

  if (href) {
    return (
      <a href={href} className="group">
        {content}
      </a>
    );
  }
  return <button className="group">{content}</button>;
}

// iPhone-style info row component
function InfoRow({
  icon: Icon,
  label,
  value,
  href,
  isLast = false,
}: {
  icon: any;
  label: string;
  value: string | React.ReactNode;
  href?: string;
  isLast?: boolean;
}) {
  const content = (
    <div
      className={`flex items-center gap-4 py-4 ${!isLast ? "border-b border-slate-200/60 dark:border-slate-700/60" : ""}`}
    >
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
        <Icon className="h-5 w-5 text-slate-600 dark:text-slate-400" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</p>
        <p
          className={`truncate text-sm font-medium ${href ? "text-blue-600 dark:text-blue-400" : "text-slate-900 dark:text-white"}`}
        >
          {value}
        </p>
      </div>
    </div>
  );

  if (href) {
    return (
      <a
        href={href}
        className="-mx-4 block px-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50"
      >
        {content}
      </a>
    );
  }
  return <div className="-mx-4 px-4">{content}</div>;
}

export default async function ContactDetailPage({ params }: Props) {
  const { contactId } = await params;
  // eslint-disable-next-line @typescript-eslint/await-thenable
  const { userId } = await auth();
  const orgCtx = await safeOrgContext();
  const organizationId = orgCtx.ok ? orgCtx.orgId : null;

  if (!orgCtx.ok) {
    if (orgCtx.reason === "no-user") {
      redirect("/sign-in");
    }
    if (orgCtx.reason === "no-membership") return <MembershipMissing />;
    return <ErrorCard message="Organization context unavailable." />;
  }

  // Handle synthetic claim-prefixed IDs — redirect to the claim page
  if (contactId.startsWith("claim-")) {
    const claimId = contactId.replace("claim-", "");
    redirect(`/claims/${claimId}`);
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let contact: any = null;
  let queryFailed = false;
  try {
    if (organizationId) {
      contact = await prisma.contacts.findFirst({
        where: { id: contactId, orgId: organizationId },
        include: {
          leads: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          properties: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
          activities: {
            orderBy: { createdAt: "desc" },
            take: 10,
          },
        },
      });
      if (contact) {
        contact = {
          ...contact,
          createdAt: contact.createdAt?.toISOString() || null,
          updatedAt: contact.updatedAt?.toISOString() || null,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          leads: (contact.leads || []).map((l: any) => ({
            ...l,
            createdAt: l.createdAt?.toISOString() || null,
          })),
          properties: contact.properties || [],
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          activities: (contact.activities || []).map((a: any) => ({
            ...a,
            createdAt: a.createdAt?.toISOString() || null,
          })),
        };
      }
    }
  } catch (error) {
    logger.error("[ContactDetailPage] Prisma query failed", { error, organizationId, userId });
    queryFailed = true;
  }

  if (queryFailed) return <ErrorCard message="Unable to load contact right now." />;
  if (!contact) {
    return (
      <ErrorCard
        message={`Contact not found. It may belong to a different organization, or the record may have been removed. (ID: ${contactId.slice(0, 8)}…)`}
      />
    );
  }

  // Get initials for avatar
  const initials = `${contact.firstName?.[0] || ""}${contact.lastName?.[0] || ""}`.toUpperCase();

  // Format full address
  const fullAddress = [contact.street, contact.city, contact.state, contact.zipCode]
    .filter(Boolean)
    .join(", ");

  return (
    <div className="mx-auto min-h-screen max-w-2xl bg-gradient-to-b from-slate-50 to-white px-4 py-6 dark:from-slate-900 dark:to-slate-950">
      {/* Back Button */}
      <Link
        href="/contacts"
        className="mb-6 inline-flex items-center gap-2 text-blue-600 transition-colors hover:text-blue-700 dark:text-blue-400"
      >
        <ArrowLeft className="h-4 w-4" />
        <span className="text-sm font-medium">Contacts</span>
      </Link>

      {/* iPhone-style Contact Card Header */}
      <div className="mb-8 text-center">
        {/* Avatar */}
        <div className="mx-auto mb-4 flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-3xl font-bold text-white shadow-2xl">
          {initials || <User className="h-12 w-12" />}
        </div>

        {/* Name */}
        <h1 className="mb-1 text-2xl font-bold text-slate-900 dark:text-white">
          {contact.firstName} {contact.lastName}
        </h1>

        {/* Title/Company */}
        {(contact.title || contact.company) && (
          <p className="mb-2 text-sm text-slate-600 dark:text-slate-400">
            {contact.title && <span>{contact.title}</span>}
            {contact.title && contact.company && <span> at </span>}
            {contact.company && <span className="font-medium">{contact.company}</span>}
          </p>
        )}

        {/* Tags */}
        {contact.tags && contact.tags.length > 0 && (
          <div className="mt-3 flex flex-wrap justify-center gap-2">
            {contact.tags.map((tag: string) => (
              <Badge key={tag} variant="secondary" className="rounded-full px-3 py-1 text-xs">
                {tag}
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* iPhone-style Quick Actions */}
      <div className="mb-8 flex justify-center gap-6">
        {contact.phone && (
          <ActionButton icon={Phone} label="Call" href={`tel:${contact.phone}`} color="green" />
        )}
        {contact.phone && (
          <ActionButton
            icon={MessageCircle}
            label="Text"
            href={`sms:${contact.phone}`}
            color="green"
          />
        )}
        {contact.email && (
          <ActionButton icon={Mail} label="Email" href={`mailto:${contact.email}`} color="blue" />
        )}
        {contact.phone && (
          <ActionButton
            icon={Video}
            label="FaceTime"
            href={`facetime:${contact.phone}`}
            color="green"
          />
        )}
      </div>

      {/* Contact Information Card */}
      <div className="mb-6 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/50">
        {contact.phone && (
          <InfoRow
            icon={Phone}
            label="mobile"
            value={contact.phone}
            href={`tel:${contact.phone}`}
          />
        )}
        {contact.email && (
          <InfoRow
            icon={Mail}
            label="email"
            value={contact.email}
            href={`mailto:${contact.email}`}
          />
        )}
        {fullAddress && (
          <InfoRow
            icon={MapPin}
            label="address"
            value={fullAddress}
            href={`https://maps.google.com/?q=${encodeURIComponent(fullAddress)}`}
          />
        )}
        {contact.company && <InfoRow icon={Building2} label="company" value={contact.company} />}
        <InfoRow
          icon={Calendar}
          label="added"
          value={new Date(contact.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
          isLast
        />
      </div>

      {/* Notes Section */}
      {contact.notes && (
        <div className="mb-6 rounded-2xl border border-slate-200/60 bg-white p-4 shadow-sm dark:border-slate-700/60 dark:bg-slate-800/50">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Notes
          </h3>
          <p className="whitespace-pre-wrap text-sm text-slate-700 dark:text-slate-300">
            {contact.notes}
          </p>
        </div>
      )}

      {/* Associated Leads */}
      <div className="mb-6 rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/50">
        <div className="flex items-center justify-between border-b border-slate-200/60 p-4 dark:border-slate-700/60">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <FileText className="h-4 w-4 text-blue-500" />
            Notes & Activity
          </h3>
          <Link
            href={`/leads/new?contactId=${contact.id}`}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400"
          >
            + New
          </Link>
        </div>
        <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
          {(contact.leads || []).length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No notes yet</p>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contact.leads.map((lead: any) => (
              <Link
                key={lead.id}
                href={`/leads/${lead.id}`}
                className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{lead.title}</p>
                  <p className="text-xs text-slate-500">
                    {new Date(lead.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="outline" className="capitalize">
                  {lead.stage}
                </Badge>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Associated Properties */}
      <div className="mb-6 rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/50">
        <div className="flex items-center justify-between border-b border-slate-200/60 p-4 dark:border-slate-700/60">
          <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
            <Home className="h-4 w-4 text-green-500" />
            Properties
          </h3>
        </div>
        <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
          {(contact.properties || []).length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">No properties linked</p>
          ) : (
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            contact.properties.map((property: any) => (
              <Link
                key={property.id}
                href={`/property-profiles/${property.id}`}
                className="flex items-center gap-3 p-4 transition-colors hover:bg-slate-50 dark:hover:bg-slate-700/50"
              >
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-100 dark:bg-green-900/30">
                  <Home className="h-5 w-5 text-green-600 dark:text-green-400" />
                </div>
                <div>
                  <p className="font-medium text-slate-900 dark:text-white">{property.name}</p>
                  <p className="text-xs text-slate-500">
                    {[property.city, property.state].filter(Boolean).join(", ")}
                  </p>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {(contact.activities || []).length > 0 && (
        <div className="mb-6 rounded-2xl border border-slate-200/60 bg-white shadow-sm dark:border-slate-700/60 dark:bg-slate-800/50">
          <div className="border-b border-slate-200/60 p-4 dark:border-slate-700/60">
            <h3 className="flex items-center gap-2 font-semibold text-slate-900 dark:text-white">
              <Calendar className="h-4 w-4 text-purple-500" />
              Recent Activity
            </h3>
          </div>
          <div className="divide-y divide-slate-200/60 dark:divide-slate-700/60">
            {contact.activities.map((activity: any) => (
              <div key={activity.id} className="flex items-start gap-3 p-4">
                <div className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-500" />
                <div>
                  <p className="text-sm text-slate-700 dark:text-slate-300">
                    {activity.description}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {new Date(activity.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Edit & Share Actions */}
      <div className="flex gap-3">
        <Link href={`/contacts/${contact.id}/edit`} className="flex-1">
          <Button variant="outline" className="w-full gap-2">
            <Edit2 className="h-4 w-4" />
            Edit Contact
          </Button>
        </Link>
        <Button variant="outline" className="gap-2">
          <Share className="h-4 w-4" />
          Share
        </Button>
        <Button variant="outline" className="gap-2">
          <Star className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
