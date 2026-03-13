"use client";

import {
  ArrowRight,
  Briefcase,
  Building2,
  ExternalLink,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  User,
  UserPlus,
  X,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { ContactType, UniversalContact } from "./UniversalContactCard";

// ─── Badge Config ────────────────────────────────────────────────────────────

const BADGE_CONFIG: Record<ContactType, { label: string; color: string }> = {
  client: {
    label: "Client",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  homeowner: {
    label: "Homeowner",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  },
  adjuster: {
    label: "Adjuster",
    color: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
  },
  lead: {
    label: "Lead",
    color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  vendor: {
    label: "Vendor",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  subcontractor: {
    label: "Sub",
    color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  },
  contractor: {
    label: "Contractor",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  },
  team: {
    label: "Team",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  },
  portal: {
    label: "Portal",
    color: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
  },
  connection: {
    label: "Connected",
    color: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  },
};

interface ContactDetailModalProps {
  contact: UniversalContact;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Callback when SkaiScraper message is clicked */
  onMessage?: (contact: UniversalContact) => void;
  /** Callback when invite is sent */
  onInvite?: (contact: UniversalContact, email: string) => void;
}

export function ContactDetailModal({
  contact,
  open,
  onOpenChange,
  onMessage,
  onInvite,
}: ContactDetailModalProps) {
  const router = useRouter();
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState(contact.email || "");
  const [inviteSending, setInviteSending] = useState(false);
  const [inviteSent, setInviteSent] = useState(false);

  // ── Derived values ──
  const displayName =
    contact.name ||
    [contact.firstName, contact.lastName].filter(Boolean).join(" ") ||
    "Unknown Contact";

  const initials = (() => {
    if (contact.firstName && contact.lastName) {
      return `${contact.firstName[0]}${contact.lastName[0]}`.toUpperCase();
    }
    const parts = displayName.split(" ").filter(Boolean);
    return parts
      .slice(0, 2)
      .map((p) => p[0])
      .join("")
      .toUpperCase();
  })();

  const badgeConfig = contact.contactType ? BADGE_CONFIG[contact.contactType] : BADGE_CONFIG.client;

  // ── Handlers ──
  const handleSkaiMessage = useCallback(() => {
    if (onMessage) {
      onMessage(contact);
      onOpenChange(false);
      return;
    }

    if (contact.isConnected) {
      const params = new URLSearchParams();
      if (contact.userId) params.set("recipientId", contact.userId);
      if (contact.portalClientId) params.set("clientId", contact.portalClientId);
      params.set("name", displayName);
      router.push(`/messages?${params.toString()}`);
      onOpenChange(false);
    } else {
      setInviteOpen(true);
    }
  }, [contact, displayName, onMessage, onOpenChange, router]);

  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail) return;
    setInviteSending(true);

    try {
      if (onInvite) {
        onInvite(contact, inviteEmail);
      } else {
        const res = await fetch("/api/contacts/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: inviteEmail,
            name: displayName,
            contactId: contact.id,
            claimId: contact.claimId,
          }),
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          throw new Error(data.error || "Failed to send invite");
        }
      }
      setInviteSent(true);
    } catch (err) {
      console.error("[ContactDetailModal] invite failed:", err);
    } finally {
      setInviteSending(false);
    }
  }, [contact, displayName, inviteEmail, onInvite]);

  // Determine navigation link
  const navHref = contact.href || contact.claimId ? `/claims/${contact.claimId}` : null;
  const navLabel = contact.claimId
    ? "Go to Claim"
    : contact.href?.includes("/jobs/")
      ? "Go to Job"
      : contact.href?.includes("/claims/")
        ? "Go to Claim"
        : contact.href
          ? "View Details"
          : null;

  if (inviteOpen) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-blue-600" />
              Invite {displayName}
            </DialogTitle>
            <DialogDescription>
              Send an invite to join SkaiScraper so you can message them directly, share documents,
              and track jobs together.
            </DialogDescription>
          </DialogHeader>

          {inviteSent ? (
            <div className="py-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                <Send className="h-6 w-6 text-green-600" />
              </div>
              <p className="font-medium text-green-700 dark:text-green-400">Invite sent!</p>
              <p className="mt-1 text-sm text-slate-500">
                They&apos;ll get an email to create their account.
              </p>
            </div>
          ) : (
            <>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-sm font-medium">Email address</label>
                  <Input
                    type="email"
                    placeholder="their@email.com"
                    value={inviteEmail}
                    onChange={(e) => setInviteEmail(e.target.value)}
                  />
                </div>
                {contact.claimId && (
                  <p className="text-xs text-slate-500">
                    They&apos;ll be invited to track the claim and communicate via SkaiScraper.
                  </p>
                )}
              </div>

              <DialogFooter>
                <Button variant="ghost" onClick={() => setInviteOpen(false)}>
                  Back
                </Button>
                <Button
                  onClick={handleSendInvite}
                  disabled={!inviteEmail || inviteSending}
                  className="gap-2"
                >
                  {inviteSending ? (
                    "Sending..."
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Send Invite
                    </>
                  )}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-md">
        {/* iPhone-style Contact Card Header */}
        <div className="bg-gradient-to-b from-slate-100 to-white px-6 pb-6 pt-8 dark:from-slate-800 dark:to-slate-900">
          {/* Close button */}
          <button
            onClick={() => onOpenChange(false)}
            className="absolute right-4 top-4 rounded-full p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-600 dark:hover:bg-slate-700"
          >
            <X className="h-5 w-5" />
          </button>

          {/* Avatar */}
          <div className="mb-4 flex justify-center">
            {contact.avatarUrl ? (
              <img
                src={contact.avatarUrl}
                alt={displayName}
                className="h-24 w-24 rounded-full object-cover shadow-lg ring-4 ring-white dark:ring-slate-800"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-3xl font-bold text-white shadow-lg ring-4 ring-white dark:ring-slate-800">
                {initials || <User className="h-10 w-10" />}
              </div>
            )}
          </div>

          {/* Name & Badge */}
          <div className="text-center">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{displayName}</h2>
            <div className="mt-2 flex items-center justify-center gap-2">
              <Badge variant="secondary" className={cn("text-xs", badgeConfig.color)}>
                {badgeConfig.label}
              </Badge>
              {contact.title && (
                <span className="text-sm text-slate-500 dark:text-slate-400">{contact.title}</span>
              )}
            </div>
            {contact.company && (
              <div className="mt-1 flex items-center justify-center gap-1 text-sm text-slate-500 dark:text-slate-400">
                <Building2 className="h-3.5 w-3.5" />
                {contact.company}
              </div>
            )}
          </div>

          {/* ══════════════════════════════════════════════════════════════════
              QUICK ACTION BUTTONS — iPhone-style (Call, Text, Email, Message)
              ══════════════════════════════════════════════════════════════════ */}
          <div className="mt-6 grid grid-cols-4 gap-2">
            {/* Call */}
            {contact.phone ? (
              <a href={`tel:${contact.phone}`} className="group">
                <div className="flex flex-col items-center rounded-xl bg-white/60 px-2 py-3 transition hover:bg-green-50 dark:bg-slate-800/60 dark:hover:bg-green-900/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30">
                    <Phone className="h-5 w-5" />
                  </div>
                  <span className="mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Call
                  </span>
                </div>
              </a>
            ) : (
              <div className="flex flex-col items-center rounded-xl bg-slate-100/50 px-2 py-3 opacity-40 dark:bg-slate-800/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-400 dark:bg-slate-700">
                  <Phone className="h-5 w-5" />
                </div>
                <span className="mt-1.5 text-xs font-medium text-slate-400">Call</span>
              </div>
            )}

            {/* Text/SMS */}
            {contact.phone ? (
              <a href={`sms:${contact.phone}`} className="group">
                <div className="flex flex-col items-center rounded-xl bg-white/60 px-2 py-3 transition hover:bg-blue-50 dark:bg-slate-800/60 dark:hover:bg-blue-900/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-600 dark:bg-blue-900/30">
                    <MessageCircle className="h-5 w-5" />
                  </div>
                  <span className="mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Text
                  </span>
                </div>
              </a>
            ) : (
              <div className="flex flex-col items-center rounded-xl bg-slate-100/50 px-2 py-3 opacity-40 dark:bg-slate-800/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-400 dark:bg-slate-700">
                  <MessageCircle className="h-5 w-5" />
                </div>
                <span className="mt-1.5 text-xs font-medium text-slate-400">Text</span>
              </div>
            )}

            {/* Email */}
            {contact.email ? (
              <a href={`mailto:${contact.email}`} className="group">
                <div className="flex flex-col items-center rounded-xl bg-white/60 px-2 py-3 transition hover:bg-purple-50 dark:bg-slate-800/60 dark:hover:bg-purple-900/20">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-purple-100 text-purple-600 dark:bg-purple-900/30">
                    <Mail className="h-5 w-5" />
                  </div>
                  <span className="mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                    Email
                  </span>
                </div>
              </a>
            ) : (
              <div className="flex flex-col items-center rounded-xl bg-slate-100/50 px-2 py-3 opacity-40 dark:bg-slate-800/30">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 text-slate-400 dark:bg-slate-700">
                  <Mail className="h-5 w-5" />
                </div>
                <span className="mt-1.5 text-xs font-medium text-slate-400">Email</span>
              </div>
            )}

            {/* SkaiScraper Message */}
            <button onClick={handleSkaiMessage} className="group">
              <div
                className={cn(
                  "flex flex-col items-center rounded-xl bg-white/60 px-2 py-3 transition dark:bg-slate-800/60",
                  contact.isConnected
                    ? "hover:bg-sky-50 dark:hover:bg-sky-900/20"
                    : "hover:bg-amber-50 dark:hover:bg-amber-900/20"
                )}
              >
                <div
                  className={cn(
                    "flex h-10 w-10 items-center justify-center rounded-full",
                    contact.isConnected
                      ? "bg-sky-100 text-sky-600 dark:bg-sky-900/30"
                      : "bg-amber-100 text-amber-600 dark:bg-amber-900/30"
                  )}
                >
                  {contact.isConnected ? (
                    <MessageSquare className="h-5 w-5" />
                  ) : (
                    <UserPlus className="h-5 w-5" />
                  )}
                </div>
                <span className="mt-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  {contact.isConnected ? "Skai" : "Invite"}
                </span>
              </div>
            </button>
          </div>
        </div>

        {/* Contact Details Section */}
        <div className="space-y-1 px-6 py-4">
          {contact.phone && (
            <a
              href={`tel:${contact.phone}`}
              className="flex items-center justify-between rounded-lg px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Phone</p>
                <p className="text-base text-blue-600 dark:text-blue-400">{contact.phone}</p>
              </div>
              <Phone className="h-5 w-5 text-slate-400" />
            </a>
          )}

          {contact.email && (
            <a
              href={`mailto:${contact.email}`}
              className="flex items-center justify-between rounded-lg px-3 py-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50"
            >
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Email</p>
                <p className="text-base text-blue-600 dark:text-blue-400">{contact.email}</p>
              </div>
              <Mail className="h-5 w-5 text-slate-400" />
            </a>
          )}

          {contact.company && (
            <div className="flex items-center justify-between rounded-lg px-3 py-3">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Company
                </p>
                <p className="text-base text-slate-900 dark:text-white">{contact.company}</p>
              </div>
              <Building2 className="h-5 w-5 text-slate-400" />
            </div>
          )}

          {contact.tags && contact.tags.length > 0 && (
            <div className="rounded-lg px-3 py-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-slate-400">
                Tags
              </p>
              <div className="flex flex-wrap gap-1.5">
                {contact.tags.map((tag) => (
                  <span
                    key={tag}
                    className="inline-flex rounded-full bg-slate-100 px-2.5 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Navigation Button — Go to Claim/Job */}
        {navHref && navLabel && (
          <div className="border-t border-slate-200 px-6 py-4 dark:border-slate-700">
            <Link href={navHref} onClick={() => onOpenChange(false)}>
              <Button variant="outline" className="w-full gap-2">
                {navLabel.includes("Claim") ? (
                  <Briefcase className="h-4 w-4" />
                ) : (
                  <ExternalLink className="h-4 w-4" />
                )}
                {navLabel}
                <ArrowRight className="ml-auto h-4 w-4" />
              </Button>
            </Link>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
