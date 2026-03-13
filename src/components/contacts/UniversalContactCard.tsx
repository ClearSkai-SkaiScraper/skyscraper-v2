"use client";

import {
  Building2,
  Mail,
  MessageCircle,
  MessageSquare,
  Phone,
  Send,
  User,
  UserPlus,
} from "lucide-react";
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

import { ContactDetailModal } from "./ContactDetailModal";

// ─── Types ───────────────────────────────────────────────────────────────────

export type ContactType =
  | "client"
  | "homeowner"
  | "adjuster"
  | "lead"
  | "vendor"
  | "subcontractor"
  | "contractor"
  | "team"
  | "portal"
  | "connection";

export interface UniversalContact {
  /** Unique ID — real Contact cuid, or entity-prefixed (e.g. "claim-xxx") */
  id: string;
  /** Display name (preferred over firstName/lastName) */
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  company?: string | null;
  title?: string | null;
  avatarUrl?: string | null;
  /** Contact type for badge rendering */
  contactType?: ContactType;
  /** Tags for additional context (e.g. claim number) */
  tags?: string[];
  /** Is this person connected on SkaiScraper? */
  isConnected?: boolean;
  /** Link to navigate when card is clicked */
  href?: string;
  /** Source claim ID (for claim-sourced contacts) */
  claimId?: string;
  /** Portal client ID (for connected clients) */
  portalClientId?: string;
  /** User ID (for team members / connected users for messaging) */
  userId?: string;
}

interface UniversalContactCardProps {
  contact: UniversalContact;
  /** Show full action bar (call/text/email/message). Default: true */
  showActions?: boolean;
  /** Compact mode — single row, smaller text */
  compact?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Callback when SkaiScraper message is clicked (override default behavior) */
  onMessage?: (contact: UniversalContact) => void;
  /** Callback when invite is sent */
  onInvite?: (contact: UniversalContact, email: string) => void;
}

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

// ─── Component ───────────────────────────────────────────────────────────────

export function UniversalContactCard({
  contact,
  showActions = true,
  compact = false,
  className,
  onMessage,
  onInvite,
}: UniversalContactCardProps) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
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
  // Open the contact detail modal instead of navigating
  const handleCardClick = useCallback(() => {
    setModalOpen(true);
  }, []);

  const handleSkaiMessage = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (onMessage) {
        onMessage(contact);
        return;
      }

      if (contact.isConnected) {
        // Open SkaiScraper messaging — create or open thread
        const params = new URLSearchParams();
        if (contact.userId) params.set("recipientId", contact.userId);
        if (contact.portalClientId) params.set("clientId", contact.portalClientId);
        params.set("name", displayName);
        router.push(`/messages?${params.toString()}`);
      } else {
        // Prompt to invite
        setInviteOpen(true);
      }
    },
    [contact, displayName, onMessage, router]
  );

  const handleSendInvite = useCallback(async () => {
    if (!inviteEmail) return;
    setInviteSending(true);

    try {
      if (onInvite) {
        onInvite(contact, inviteEmail);
      } else {
        // Default: call the invite API
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
      console.error("[UniversalContactCard] invite failed:", err);
    } finally {
      setInviteSending(false);
    }
  }, [contact, displayName, inviteEmail, onInvite]);

  // ── Compact layout ──
  if (compact) {
    return (
      <div
        onClick={handleCardClick}
        className={cn(
          "group flex cursor-pointer items-center gap-3 rounded-xl border border-slate-200/50 bg-white/80 p-3 shadow-sm backdrop-blur-sm transition-all hover:border-blue-500/30 hover:shadow-md dark:border-slate-800/50 dark:bg-slate-900/50",
          className
        )}
      >
        {/* Avatar */}
        {contact.avatarUrl ? (
          <img
            src={contact.avatarUrl}
            alt={displayName}
            className="h-9 w-9 rounded-full object-cover ring-2 ring-white dark:ring-slate-800"
          />
        ) : (
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-xs font-bold text-white">
            {initials || <User className="h-4 w-4" />}
          </div>
        )}

        {/* Info */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">
              {displayName}
            </span>
            <Badge variant="secondary" className={cn("text-[10px]", badgeConfig.color)}>
              {badgeConfig.label}
            </Badge>
          </div>
          {(contact.email || contact.phone) && (
            <div className="truncate text-xs text-slate-500 dark:text-slate-400">
              {contact.phone || contact.email}
            </div>
          )}
        </div>

        {/* Compact actions */}
        {showActions && (
          <div className="pointer-events-auto flex items-center gap-1">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Phone className="h-3.5 w-3.5 text-green-600" />
                </Button>
              </a>
            )}
            {contact.phone && (
              <a href={`sms:${contact.phone}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MessageCircle className="h-3.5 w-3.5 text-blue-600" />
                </Button>
              </a>
            )}
            {contact.email && (
              <a href={`mailto:${contact.email}`} onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Mail className="h-3.5 w-3.5 text-purple-600" />
                </Button>
              </a>
            )}
          </div>
        )}
      </div>
    );
  }

  // ── Full card layout ──
  return (
    <>
      <div
        onClick={handleCardClick}
        className={cn(
          "group relative cursor-pointer rounded-2xl border border-slate-200/50 bg-white/80 p-6 shadow-[0_0_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl transition-all hover:scale-[1.02] hover:border-blue-500/50 hover:shadow-xl dark:border-slate-800/50 dark:bg-slate-900/50",
          className
        )}
      >
        <div className="pointer-events-none">
          {/* Header: Avatar + Name + Badge */}
          <div className="mb-4 flex items-start gap-3">
            {contact.avatarUrl ? (
              <img
                src={contact.avatarUrl}
                alt={displayName}
                className="h-12 w-12 rounded-full object-cover shadow-sm ring-2 ring-white dark:ring-slate-800"
              />
            ) : (
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-400 to-blue-600 text-sm font-bold text-white shadow-sm ring-2 ring-white dark:ring-slate-800">
                {initials || <User className="h-5 w-5" />}
              </div>
            )}
            <div className="min-w-0 flex-1">
              <h3 className="truncate text-lg font-semibold text-slate-900 transition group-hover:text-blue-700 dark:text-white">
                {displayName}
              </h3>
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className={cn("text-xs", badgeConfig.color)}>
                  {badgeConfig.label}
                </Badge>
                {contact.title && (
                  <span className="truncate text-xs text-slate-500 dark:text-slate-400">
                    {contact.title}
                  </span>
                )}
                {contact.tags &&
                  contact.tags.length > 0 &&
                  contact.tags.slice(0, 2).map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] text-slate-600 dark:bg-slate-800 dark:text-slate-400"
                    >
                      {tag}
                    </span>
                  ))}
              </div>
            </div>
          </div>

          {/* Contact info */}
          <div className="space-y-1.5">
            {contact.company && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Building2 className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                <span className="truncate">{contact.company}</span>
              </div>
            )}
            {contact.email && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Mail className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                <span className="truncate">{contact.email}</span>
              </div>
            )}
            {contact.phone && (
              <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                <Phone className="h-3.5 w-3.5 flex-shrink-0 text-slate-400" />
                <span>{contact.phone}</span>
              </div>
            )}
          </div>

          {/* Action buttons */}
          {showActions && (
            <div className="pointer-events-auto mt-4 flex items-center gap-2">
              {contact.phone && (
                <a
                  href={`tel:${contact.phone}`}
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 border-green-200 text-green-700 hover:bg-green-50 dark:border-green-800 dark:text-green-400 dark:hover:bg-green-950"
                  >
                    <Phone className="h-4 w-4" />
                    Call
                  </Button>
                </a>
              )}
              {contact.phone && (
                <a
                  href={`sms:${contact.phone}`}
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 border-blue-200 text-blue-700 hover:bg-blue-50 dark:border-blue-800 dark:text-blue-400 dark:hover:bg-blue-950"
                  >
                    <MessageCircle className="h-4 w-4" />
                    Text
                  </Button>
                </a>
              )}
              {contact.email && (
                <a
                  href={`mailto:${contact.email}`}
                  className="flex-1"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full gap-1.5 border-purple-200 text-purple-700 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-950"
                  >
                    <Mail className="h-4 w-4" />
                    Email
                  </Button>
                </a>
              )}
              {/* SkaiScraper Message / Invite */}
              <Button
                variant="outline"
                size="sm"
                className={cn(
                  "flex-1 gap-1.5",
                  contact.isConnected
                    ? "border-sky-200 text-sky-700 hover:bg-sky-50 dark:border-sky-800 dark:text-sky-400 dark:hover:bg-sky-950"
                    : "border-amber-200 text-amber-700 hover:bg-amber-50 dark:border-amber-800 dark:text-amber-400 dark:hover:bg-amber-950"
                )}
                onClick={handleSkaiMessage}
              >
                {contact.isConnected ? (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    Message
                  </>
                ) : (
                  <>
                    <UserPlus className="h-4 w-4" />
                    Invite
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* Invite Dialog */}
      <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
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
                  Cancel
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

      {/* Contact Detail Modal — iPhone-style full contact card */}
      <ContactDetailModal
        contact={contact}
        open={modalOpen}
        onOpenChange={setModalOpen}
        onMessage={onMessage}
        onInvite={onInvite}
      />
    </>
  );
}
