"use client";

import {
  ArrowRight,
  Check,
  CreditCard,
  Crown,
  ExternalLink,
  GitBranch,
  Loader2,
  Mail,
  Minus,
  MoreVertical,
  Plus,
  RefreshCw,
  Shield,
  Trash2,
  User,
  UserCog,
  UserPlus,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { useRef, useState } from "react";
import { toast } from "sonner";
import useSWR, { mutate } from "swr";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

/* -------------------------------------------------------------------------- */
/*  Types                                                                     */
/* -------------------------------------------------------------------------- */

interface Member {
  id: string;
  name: string | null;
  email: string;
  role: string | null;
  status: "active" | "pending" | "inactive" | string;
  createdAt: string | Date;
  avatarUrl?: string | null;
  profileUrl?: string | null;
  isManager?: boolean;
  managerId?: string | null;
  managerName?: string | null;
}

interface CompanySeatsClientProps {
  members: Member[];
  orgId: string;
}

/* -------------------------------------------------------------------------- */
/*  Constants                                                                 */
/* -------------------------------------------------------------------------- */

const fetcher = (url: string) => fetch(url).then((r) => r.json());
// Imported from shared pricing module
import { PRICE_PER_SEAT_DOLLARS as PRICE_PER_SEAT } from "@/lib/billing/seat-pricing";
import { logger } from "@/lib/logger";
const MAX_SEATS = 500;

/* -------------------------------------------------------------------------- */
/*  Component                                                                 */
/* -------------------------------------------------------------------------- */

export default function CompanySeatsClient({ members, orgId }: CompanySeatsClientProps) {
  /* ── Billing data via SWR ─────────────────────────────────────── */
  const { data: seatData, isLoading: billingLoading } = useSWR("/api/billing/seats", fetcher, {
    refreshInterval: 30_000,
  });

  /* ── Billing state ────────────────────────────────────────────── */
  const [seatInput, setSeatInput] = useState<number | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [portalLoading, setPortalLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  /* ── Member state ─────────────────────────────────────────────── */
  const [memberList, setMemberList] = useState<Member[]>(members);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviting, setInviting] = useState(false);
  const inviteInputRef = useRef<HTMLInputElement>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [showPlaceholder, setShowPlaceholder] = useState(false);
  const MEMBERS_PER_PAGE = 25;

  /* ── Manager Hierarchy state ──────────────────────────────────── */
  const [managerDialogOpen, setManagerDialogOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);
  const [selectedManagerId, setSelectedManagerId] = useState<string>("");
  const [isAssigningManager, setIsAssigningManager] = useState(false);
  const [showOrgChart, setShowOrgChart] = useState(false);

  // Filter managers (active members who are marked as managers or admins)
  const availableManagers = memberList.filter(
    (m) => (m.isManager || m.role === "Admin" || m.role === "admin") && m.status === "active"
  );

  /* ── Derived billing values ───────────────────────────────────── */
  const hasSubscription = seatData?.subscription?.hasSubscription;
  const currentSeats = seatData?.subscription?.seatCount || 0;
  const seatsUsed = seatData?.seatsUsed || memberList.length || 0;
  const subStatus = seatData?.subscription?.status || "none";
  const periodEnd = seatData?.subscription?.currentPeriodEnd;

  const desiredSeats = (seatInput ?? currentSeats) || 1;
  const monthlyTotal = desiredSeats * PRICE_PER_SEAT;
  const annualTotal = monthlyTotal * 12;
  const seatsChanged = seatInput !== null && seatInput !== currentSeats;

  const clearMessages = () => {
    setError(null);
    setSuccess(null);
  };

  const focusInvite = () => {
    inviteInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => inviteInputRef.current?.focus(), 350);
  };

  /* ── Billing handlers ─────────────────────────────────────────── */

  const handleCreateSubscription = async () => {
    clearMessages();
    const seats = seatInput || 1;
    if (seats < 1 || seats > MAX_SEATS) {
      setError(`Seats must be between 1 and ${MAX_SEATS}.`);
      return;
    }
    setIsCreating(true);
    try {
      const res = await fetch("/api/billing/create-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatCount: seats }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create subscription.");
        return;
      }
      setSuccess(
        `Subscription created! ${seats} seat${seats > 1 ? "s" : ""} \u00d7 $${PRICE_PER_SEAT}/mo = $${seats * PRICE_PER_SEAT}/mo`
      );
      mutate("/api/billing/seats");
      setSeatInput(null);
    } catch (err) {
      setError(err.message || "Failed to create subscription.");
    } finally {
      setIsCreating(false);
    }
  };

  const handleUpdateSeats = async () => {
    clearMessages();
    if (!seatInput || seatInput < 1 || seatInput > MAX_SEATS) {
      setError(`Seats must be between 1 and ${MAX_SEATS}.`);
      return;
    }
    if (seatInput === currentSeats) return;
    setIsUpdating(true);
    try {
      const res = await fetch("/api/billing/update-seats", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ seatCount: seatInput }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to update seats.");
        return;
      }
      setSuccess(
        `Seats updated: ${currentSeats} \u2192 ${seatInput}. ${seatInput > currentSeats ? "Prorated charge applied." : "Prorated credit applied."}`
      );
      mutate("/api/billing/seats");
      setSeatInput(null);
    } catch (err) {
      setError(err.message || "Failed to update seats.");
    } finally {
      setIsUpdating(false);
    }
  };

  const openBillingPortal = async () => {
    setPortalLoading(true);
    try {
      const res = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      if (res.ok) {
        const { url } = await res.json();
        window.location.href = url;
      } else {
        const data = await res.json();
        setError(data.error || "Failed to open billing portal.");
      }
    } catch (err) {
      setError(err.message || "Failed to open billing portal.");
    } finally {
      setPortalLoading(false);
    }
  };

  /* ── Member handlers ──────────────────────────────────────────── */

  const handleInvite = async () => {
    if (!inviteEmail) return;
    setInviting(true);
    try {
      const res = await fetch("/api/trades/company/seats/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: inviteEmail }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.emailSent === false) {
          toast.warning("Member added but email delivery failed", {
            duration: 12000,
            description: data.inviteLink || data.emailError || "Share the invite link manually.",
            action: data.inviteLink
              ? {
                  label: "Copy Link",
                  onClick: () => {
                    navigator.clipboard.writeText(data.inviteLink);
                    toast.success("Link copied!");
                  },
                }
              : undefined,
          });
        } else {
          toast.success(`Invitation sent to ${inviteEmail}`);
        }
        // Show placeholder animation before reload
        setShowPlaceholder(true);
        const placeholderMember: Member = {
          id: `placeholder-${Date.now()}`,
          name: inviteEmail.split("@")[0],
          email: inviteEmail,
          role: "member",
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        setMemberList((prev) => [...prev, placeholderMember]);
        // Jump to the last page to show the new placeholder
        const newTotal = memberList.length + 1;
        setCurrentPage(Math.ceil(newTotal / MEMBERS_PER_PAGE));
        setInviteEmail("");
        // Reload after a brief delay so user sees the placeholder
        setTimeout(() => {
          setShowPlaceholder(false);
          window.location.reload();
        }, 2000);
      } else {
        toast.error(data.error || "Failed to send invitation");
      }
    } catch (err) {
      logger.error("Invite error:", err);
      toast.error("Failed to send invitation");
    } finally {
      setInviting(false);
    }
  };

  const handleResendInvite = async (member: Member) => {
    try {
      const res = await fetch("/api/trades/company/seats/invite", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: member.email }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.emailSent === false) {
          toast.warning("Invite created but email failed", {
            duration: 12000,
            description: "Copy the invite link to share manually.",
            action: data.inviteLink
              ? {
                  label: "Copy Link",
                  onClick: () => {
                    navigator.clipboard.writeText(data.inviteLink);
                    toast.success("Link copied!");
                  },
                }
              : undefined,
          });
        } else {
          toast.success(`Invite re-sent to ${member.email}`);
        }
      } else {
        toast.error(data.error || "Failed to resend invite");
      }
    } catch (err) {
      logger.error("Resend invite error:", err);
      toast.error("Failed to resend invite");
    }
  };

  const handleRemoveMember = async (member: Member) => {
    const confirmed = window.confirm(
      `Remove ${member.name || member.email} from your team? This cannot be undone.`
    );
    if (!confirmed) return;
    try {
      const res = await fetch(`/api/trades/company/seats/invite?id=${member.id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        setMemberList((prev) => prev.filter((m) => m.id !== member.id));
        toast.success(`${member.name || member.email} has been removed`);
      } else {
        toast.error(data.error || "Failed to remove member");
      }
    } catch (err) {
      logger.error("Remove member error:", err);
      toast.error("Failed to remove member");
    }
  };

  /* ── Manager Hierarchy handlers ───────────────────────────────── */

  const openManagerDialog = (member: Member) => {
    setSelectedMember(member);
    setSelectedManagerId(member.managerId || "none");
    setManagerDialogOpen(true);
  };

  const handleAssignManager = async () => {
    if (!selectedMember) return;
    setIsAssigningManager(true);
    try {
      const res = await fetch("/api/trades/company/seats/assign-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: selectedMember.id,
          managerId: selectedManagerId === "none" ? null : selectedManagerId,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        // Update local state
        const managerName =
          selectedManagerId === "none"
            ? null
            : memberList.find((m) => m.id === selectedManagerId)?.name;
        setMemberList((prev) =>
          prev.map((m) =>
            m.id === selectedMember.id
              ? {
                  ...m,
                  managerId: selectedManagerId === "none" ? null : selectedManagerId,
                  managerName,
                }
              : m
          )
        );
        toast.success(data.message || "Manager updated successfully");
        setManagerDialogOpen(false);
      } else {
        toast.error(data.error || "Failed to assign manager");
      }
    } catch (err) {
      logger.error("Assign manager error:", err);
      toast.error("Failed to assign manager");
    } finally {
      setIsAssigningManager(false);
    }
  };

  const handleToggleManager = async (member: Member, makeManager: boolean) => {
    try {
      const res = await fetch("/api/trades/company/seats/assign-manager", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          makeManager,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMemberList((prev) =>
          prev.map((m) =>
            m.id === member.id
              ? { ...m, isManager: makeManager, role: makeManager ? "Manager" : "Member" }
              : m
          )
        );
        toast.success(
          data.message || `${member.name} is now a ${makeManager ? "manager" : "member"}`
        );
      } else {
        toast.error(data.error || "Failed to update role");
      }
    } catch (err) {
      logger.error("Toggle manager error:", err);
      toast.error("Failed to update role");
    }
  };

  const handleToggleAdmin = async (member: Member) => {
    const isCurrentlyAdmin = member.role === "Admin" || member.role === "admin";
    try {
      const res = await fetch("/api/trades/company/employees", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          memberId: member.id,
          isAdmin: !isCurrentlyAdmin,
          role: !isCurrentlyAdmin ? "admin" : "member",
        }),
      });
      if (res.ok) {
        setMemberList((prev) =>
          prev.map((m) =>
            m.id === member.id ? { ...m, role: !isCurrentlyAdmin ? "Admin" : "Member" } : m
          )
        );
        toast.success(!isCurrentlyAdmin ? "Admin access granted" : "Admin access revoked");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to update admin status");
      }
    } catch (err) {
      logger.error("Toggle admin error:", err);
      toast.error("Failed to update admin status");
    }
  };

  /* ── Loading state ────────────────────────────────────────────── */

  if (billingLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#117CFF]" />
      </div>
    );
  }

  /* ── Derived ──────────────────────────────────────────────────── */

  const totalPaidSeats = hasSubscription ? currentSeats : 0;
  const emptySlots = Math.max(0, totalPaidSeats - memberList.length);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(memberList.length / MEMBERS_PER_PAGE));
  const paginatedMembers = memberList.slice(
    (currentPage - 1) * MEMBERS_PER_PAGE,
    currentPage * MEMBERS_PER_PAGE
  );
  // Only show empty slots on the last page
  const showEmptySlots = currentPage === totalPages;

  /* ── Render ───────────────────────────────────────────────────── */

  return (
    <div className="space-y-8">
      {/* ── Status Messages ──────────────────────────────────────── */}
      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-3.5 text-sm text-red-800 dark:border-red-800 dark:bg-red-950/30 dark:text-red-200">
          {error}
        </div>
      )}
      {success && (
        <div className="rounded-2xl border border-green-200 bg-green-50 px-5 py-3.5 text-sm text-green-800 dark:border-green-800 dark:bg-green-950/30 dark:text-green-200">
          &#10003; {success}
        </div>
      )}

      {/* ── Beta Banner ──────────────────────────────────────────── */}
      {process.env.NEXT_PUBLIC_BETA_MODE !== "false" && !hasSubscription && (
        <div className="rounded-2xl border border-blue-200 bg-blue-50/80 p-5 backdrop-blur-xl dark:border-blue-800 dark:bg-blue-950/30">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900/40">
              <Shield className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            </div>
            <div>
              <p className="font-medium text-blue-900 dark:text-blue-100">
                Beta Access &mdash; All Features Unlocked
              </p>
              <p className="text-sm text-blue-700 dark:text-blue-300">
                Free beta access active. Subscribe below when you&apos;re ready to lock in your team
                size.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── Overview Cards ───────────────────────────────────────── */}
      <div className="grid gap-4 sm:grid-cols-3">
        {/* Seats Used */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-indigo-100 p-2 dark:bg-indigo-900/30">
              <Users className="h-4 w-4 text-indigo-600 dark:text-indigo-400" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Seats Used
            </span>
          </div>
          <div className="text-3xl font-bold text-indigo-600 dark:text-indigo-400">
            {seatsUsed}
            <span className="text-lg font-normal text-slate-400">
              {" "}
              / {hasSubscription ? currentSeats : "\u221E"}
            </span>
          </div>
          <p className="mt-1 text-xs text-slate-500">Active team members</p>
        </div>

        {/* Price Per Seat */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900/30">
              <Zap className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Price Per Seat
            </span>
          </div>
          <div className="text-3xl font-bold text-emerald-600 dark:text-emerald-400">
            ${PRICE_PER_SEAT}
          </div>
          <p className="mt-1 text-xs text-slate-500">Per user / month</p>
        </div>

        {/* Subscription Status */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-2 flex items-center gap-2">
            <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900/30">
              <CreditCard className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            </div>
            <span className="text-sm font-medium text-slate-700 dark:text-slate-300">Status</span>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              className={
                subStatus === "active"
                  ? "bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200"
                  : subStatus === "trialing"
                    ? "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-200"
                    : subStatus === "past_due"
                      ? "bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200"
                      : "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200"
              }
            >
              {subStatus === "none" ? "No subscription" : subStatus}
            </Badge>
          </div>
          {periodEnd && (
            <p className="mt-2 text-xs text-slate-500">
              Renews {new Date(periodEnd).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      {/* ── Seat Selector Card ─────────────────────────────────── */}
      <div className="rounded-2xl border border-[#117CFF]/20 bg-gradient-to-br from-white to-blue-50/30 p-6 backdrop-blur-xl dark:from-slate-900 dark:to-blue-950/10">
        <div className="mb-1 text-xl font-bold text-[color:var(--text)]">
          {hasSubscription ? "Adjust Seats" : "Choose Your Seats"}
        </div>
        <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
          $80 per seat per month &middot; 1&ndash;500 seats &middot; Stripe handles proration
          automatically
        </p>

        <div className="space-y-6">
          {/* Seat stepper */}
          <div className="flex items-center justify-center gap-4">
            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => setSeatInput(Math.max(1, desiredSeats - 1))}
              disabled={desiredSeats <= 1}
            >
              <Minus className="h-5 w-5" />
            </Button>

            <div className="flex flex-col items-center">
              <input
                type="number"
                min={1}
                max={MAX_SEATS}
                value={desiredSeats}
                onChange={(e) => {
                  const val = parseInt(e.target.value) || 1;
                  setSeatInput(Math.min(MAX_SEATS, Math.max(1, val)));
                }}
                className="w-24 rounded-xl border-2 border-[#117CFF]/30 bg-transparent text-center text-4xl font-bold text-[#117CFF] focus:border-[#117CFF] focus:outline-none focus:ring-2 focus:ring-[#117CFF]/20"
              />
              <span className="mt-1 text-sm text-slate-500">seats</span>
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-12 w-12 rounded-full"
              onClick={() => setSeatInput(Math.min(MAX_SEATS, desiredSeats + 1))}
              disabled={desiredSeats >= MAX_SEATS}
            >
              <Plus className="h-5 w-5" />
            </Button>
          </div>

          {/* Quick-pick buttons */}
          <div className="flex flex-wrap justify-center gap-2">
            {[1, 5, 10, 25, 50, 100, 200].map((n) => (
              <Button
                key={n}
                variant={desiredSeats === n ? "default" : "outline"}
                size="sm"
                className={desiredSeats === n ? "bg-[#117CFF] text-white" : ""}
                onClick={() => setSeatInput(n)}
              >
                {n}
              </Button>
            ))}
          </div>

          {/* Price breakdown */}
          <div className="mx-auto max-w-md rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">
                  {desiredSeats} seat{desiredSeats !== 1 ? "s" : ""} &times; ${PRICE_PER_SEAT}/mo
                </span>
                <span className="font-semibold text-[color:var(--text)]">
                  ${monthlyTotal.toLocaleString()}/mo
                </span>
              </div>
              <div className="flex justify-between border-t border-[color:var(--border)] pt-2">
                <span className="text-slate-500 dark:text-slate-400">Annual estimate</span>
                <span className="text-slate-500 dark:text-slate-400">
                  ${annualTotal.toLocaleString()}/yr
                </span>
              </div>
              {seatsChanged && hasSubscription && (
                <div className="flex items-center justify-between border-t border-[color:var(--border)] pt-2 text-[#117CFF]">
                  <span className="flex items-center gap-1">
                    <ArrowRight className="h-3 w-3" />
                    {desiredSeats > currentSeats ? "Adding" : "Removing"}{" "}
                    {Math.abs(desiredSeats - currentSeats)} seat
                    {Math.abs(desiredSeats - currentSeats) !== 1 ? "s" : ""}
                  </span>
                  <span className="font-semibold">
                    {desiredSeats > currentSeats ? "+" : "-"}$
                    {(Math.abs(desiredSeats - currentSeats) * PRICE_PER_SEAT).toLocaleString()}
                    /mo
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Seat warning */}
          {seatInput !== null && seatInput < seatsUsed && (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950/30 dark:text-amber-200">
              &#9888;&#65039; You have {seatsUsed} active members. Reducing to {seatInput} seats
              will prevent new invitations until members are removed.
            </div>
          )}

          {/* Action button */}
          <div className="flex justify-center">
            {hasSubscription ? (
              <Button
                size="lg"
                className="bg-[#117CFF] px-8 hover:bg-[#0066DD]"
                onClick={handleUpdateSeats}
                disabled={isUpdating || !seatsChanged}
              >
                {isUpdating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Updating...
                  </>
                ) : seatsChanged ? (
                  <>
                    <Check className="mr-2 h-4 w-4" />
                    Update to {desiredSeats} Seats &mdash; ${monthlyTotal.toLocaleString()}/mo
                  </>
                ) : (
                  "No changes"
                )}
              </Button>
            ) : (
              <Button
                size="lg"
                className="bg-[#117CFF] px-8 hover:bg-[#0066DD]"
                onClick={handleCreateSubscription}
                disabled={isCreating}
              >
                {isCreating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating subscription...
                  </>
                ) : (
                  <>
                    <CreditCard className="mr-2 h-4 w-4" />
                    Subscribe &mdash; {desiredSeats} Seat{desiredSeats !== 1 ? "s" : ""} &middot; $
                    {monthlyTotal.toLocaleString()}/mo
                  </>
                )}
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── Pricing Examples ─────────────────────────────────────── */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <h3 className="mb-1 text-lg font-bold text-[color:var(--text)]">Pricing Examples</h3>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Simple, transparent pricing. No tiers, no minimums, no hidden fees.
        </p>
        <div className="grid gap-3 sm:grid-cols-2 md:grid-cols-4">
          {[
            { seats: 1, label: "Solo" },
            { seats: 10, label: "Small Team" },
            { seats: 50, label: "Growing" },
            { seats: 200, label: "Enterprise" },
          ].map(({ seats, label }) => (
            <button
              key={seats}
              onClick={() => setSeatInput(seats)}
              className={`rounded-xl border p-4 text-left transition-all hover:border-[#117CFF] hover:shadow-md ${
                desiredSeats === seats
                  ? "border-[#117CFF] bg-blue-50 shadow-md dark:bg-blue-950/20"
                  : "border-[color:var(--border)]"
              }`}
            >
              <div className="text-xs font-medium uppercase tracking-wider text-slate-500">
                {label}
              </div>
              <div className="mt-1 text-lg font-bold text-[color:var(--text)]">
                {seats} seat{seats !== 1 ? "s" : ""}
              </div>
              <div className="text-2xl font-bold text-[#117CFF]">
                ${(seats * PRICE_PER_SEAT).toLocaleString()}
                <span className="text-sm font-normal text-slate-500">/mo</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Team Members ─────────────────────────────────────────── */}
      <div>
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-bold text-[color:var(--text)]">
            Team Members ({memberList.length})
          </h3>
          <div className="flex items-center gap-3">
            {totalPages > 1 && (
              <span className="text-sm text-slate-500">
                Page {currentPage} of {totalPages}
              </span>
            )}
            {memberList.length > 0 && (
              <Button size="sm" variant="outline" onClick={focusInvite}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite
              </Button>
            )}
          </div>
        </div>

        {memberList.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-12 text-center dark:border-slate-700 dark:bg-slate-800/30">
            <Users className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
            <h4 className="text-lg font-semibold text-slate-900 dark:text-white">
              No team members yet
            </h4>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Invite your first team member below to start collaborating.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {paginatedMembers.map((member, idx) => {
              const isOwner = (currentPage - 1) * MEMBERS_PER_PAGE + idx === 0;
              const isNewPlaceholder = showPlaceholder && member.id.startsWith("placeholder-");
              return (
                <div
                  key={member.id}
                  className={`rounded-2xl border p-4 transition-all ${
                    isNewPlaceholder
                      ? "animate-pulse border-teal-300 bg-teal-50/60 ring-2 ring-teal-400/50 dark:border-teal-700 dark:bg-teal-900/20"
                      : isOwner
                        ? "border-green-200 bg-green-50/60 dark:border-green-800 dark:bg-green-900/20"
                        : member.status === "active"
                          ? "border-[color:var(--border)] bg-[var(--surface-glass)] backdrop-blur-xl"
                          : "border-amber-200 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-900/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {member.profileUrl ? (
                      <Link href={member.profileUrl}>
                        <Avatar className="h-11 w-11 cursor-pointer ring-2 ring-white transition-all hover:ring-blue-300 dark:ring-slate-700">
                          <AvatarImage src={member.avatarUrl || undefined} />
                          <AvatarFallback
                            className={`text-white ${isOwner ? "bg-green-600" : "bg-blue-600"}`}
                          >
                            {member.name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5" />}
                          </AvatarFallback>
                        </Avatar>
                      </Link>
                    ) : (
                      <Avatar className="h-11 w-11 ring-2 ring-white dark:ring-slate-700">
                        <AvatarImage src={member.avatarUrl || undefined} />
                        <AvatarFallback
                          className={`text-white ${isOwner ? "bg-green-600" : "bg-blue-600"}`}
                        >
                          {member.name?.charAt(0)?.toUpperCase() || <User className="h-5 w-5" />}
                        </AvatarFallback>
                      </Avatar>
                    )}

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-semibold text-[color:var(--text)]">
                        {member.profileUrl ? (
                          <Link
                            href={member.profileUrl}
                            className="hover:text-blue-600 hover:underline"
                          >
                            {member.name || "Team Member"}
                          </Link>
                        ) : (
                          member.name || "Team Member"
                        )}
                      </p>
                      <p className="truncate text-xs text-slate-500 dark:text-slate-400">
                        {member.email}
                      </p>
                      <div className="mt-0.5 flex flex-wrap items-center gap-1.5">
                        {isOwner && (
                          <>
                            <Crown className="h-3 w-3 text-amber-500" />
                            <span className="text-[10px] font-semibold text-amber-600">Owner</span>
                          </>
                        )}
                        {!isOwner && member.isManager && (
                          <>
                            <GitBranch className="h-3 w-3 text-purple-500" />
                            <span className="text-[10px] font-semibold text-purple-600">
                              Manager
                            </span>
                          </>
                        )}
                        {!isOwner && member.status === "active" && !member.isManager && (
                          <span className="text-[10px] font-medium text-green-600">
                            &#10003; Active
                          </span>
                        )}
                        {!isOwner && member.status === "pending" && (
                          <span className="text-[10px] font-medium text-amber-600">
                            &#9203; Pending
                          </span>
                        )}
                        {member.managerName && (
                          <span className="text-[10px] text-slate-400">→ {member.managerName}</span>
                        )}
                      </div>
                    </div>

                    {!isOwner && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          {member.status === "active" && (
                            <>
                              <DropdownMenuItem onClick={() => openManagerDialog(member)}>
                                <UserCog className="mr-2 h-4 w-4" />
                                Assign Manager
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleManager(member, !member.isManager)}
                              >
                                <GitBranch className="mr-2 h-4 w-4" />
                                {member.isManager ? "Remove Manager Role" : "Make Manager"}
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleToggleAdmin(member)}>
                                <Shield className="mr-2 h-4 w-4" />
                                {member.role === "Admin" || member.role === "admin"
                                  ? "Revoke Admin"
                                  : "Grant Admin"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          {member.status === "pending" && (
                            <>
                              <DropdownMenuItem onClick={() => handleResendInvite(member)}>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Resend Invite
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                            </>
                          )}
                          <DropdownMenuItem
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleRemoveMember(member)}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remove Member
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Empty seat placeholders — only on last page */}
            {showEmptySlots &&
              Array.from({ length: emptySlots }).map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-dashed border-slate-300 dark:border-slate-600">
                      <UserPlus className="h-5 w-5 text-slate-400" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-semibold text-slate-500">Open Seat</p>
                      <p className="text-xs text-slate-400">Ready for a team member</p>
                    </div>
                    <Button size="sm" variant="outline" onClick={focusInvite}>
                      Invite
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-center gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "outline"}
                size="sm"
                className={page === currentPage ? "bg-teal-600 text-white hover:bg-teal-700" : ""}
                onClick={() => setCurrentPage(page)}
              >
                {page}
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        )}
      </div>

      {/* ── Invite Team Member ───────────────────────────────────── */}
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
        <div className="mb-1 flex items-center gap-2">
          <Mail className="h-5 w-5 text-[#117CFF]" />
          <h3 className="text-lg font-bold text-[color:var(--text)]">Invite Team Member</h3>
        </div>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
          Send an invitation to join your workspace
        </p>
        <div className="flex gap-3">
          <Input
            ref={inviteInputRef}
            placeholder="Enter email address"
            value={inviteEmail}
            onChange={(e) => setInviteEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleInvite()}
            className="flex-1"
          />
          <Button onClick={handleInvite} disabled={!inviteEmail || inviting}>
            {inviting ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <UserPlus className="mr-2 h-4 w-4" />
                Send Invite
              </>
            )}
          </Button>
        </div>
      </div>

      {/* ── Manager Hierarchy Section ────────────────────────────── */}
      {memberList.length > 1 && (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="h-5 w-5 text-purple-500" />
              <h3 className="text-lg font-bold text-[color:var(--text)]">Team Hierarchy</h3>
            </div>
            <Button variant="outline" size="sm" onClick={() => setShowOrgChart(!showOrgChart)}>
              {showOrgChart ? "Hide" : "Show"} Org Chart
            </Button>
          </div>
          <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">
            Assign managers to team members to create reporting structure. Use the dropdown menu on
            each member card.
          </p>

          {showOrgChart && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 dark:border-slate-700 dark:bg-slate-800/30">
              <div className="space-y-4">
                {/* Managers with their reports */}
                {availableManagers.map((manager) => {
                  const reports = memberList.filter((m) => m.managerId === manager.id);
                  return (
                    <div
                      key={manager.id}
                      className="rounded-lg border border-purple-200 bg-white p-3 dark:border-purple-800 dark:bg-slate-900"
                    >
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={manager.avatarUrl || undefined} />
                          <AvatarFallback className="bg-purple-600 text-white">
                            {manager.name?.charAt(0)?.toUpperCase() || "M"}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-semibold text-[color:var(--text)]">
                            {manager.name}
                          </p>
                          <p className="text-xs text-purple-600">
                            Manager • {reports.length} direct report
                            {reports.length !== 1 ? "s" : ""}
                          </p>
                        </div>
                      </div>
                      {reports.length > 0 && (
                        <div className="ml-6 mt-2 space-y-1 border-l-2 border-purple-200 pl-4 dark:border-purple-700">
                          {reports.map((report) => (
                            <div key={report.id} className="flex items-center gap-2 text-sm">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={report.avatarUrl || undefined} />
                                <AvatarFallback className="bg-blue-500 text-xs text-white">
                                  {report.name?.charAt(0)?.toUpperCase() || "T"}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-slate-700 dark:text-slate-300">
                                {report.name}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}

                {/* Unassigned members */}
                {(() => {
                  const unassigned = memberList.filter(
                    (m) =>
                      !m.managerId && !m.isManager && m.status === "active" && m.role !== "Admin"
                  );
                  if (unassigned.length === 0) return null;
                  return (
                    <div className="rounded-lg border border-slate-200 bg-white p-3 dark:border-slate-700 dark:bg-slate-900">
                      <p className="mb-2 text-sm font-medium text-slate-500">
                        Unassigned ({unassigned.length})
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {unassigned.map((m) => (
                          <div
                            key={m.id}
                            className="flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs dark:bg-slate-800"
                          >
                            <Avatar className="h-5 w-5">
                              <AvatarFallback className="bg-slate-400 text-[10px] text-white">
                                {m.name?.charAt(0)?.toUpperCase() || "?"}
                              </AvatarFallback>
                            </Avatar>
                            {m.name}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Manage Subscription ──────────────────────────────────── */}
      {hasSubscription && (
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-6 backdrop-blur-xl">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-[color:var(--text)]">Manage Subscription</p>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Update payment method, view invoices, or cancel
              </p>
            </div>
            <Button onClick={openBillingPortal} disabled={portalLoading} variant="outline">
              {portalLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Opening...
                </>
              ) : (
                <>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Stripe Billing Portal
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* ── Manager Assignment Dialog ────────────────────────────── */}
      <Dialog open={managerDialogOpen} onOpenChange={setManagerDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Manager</DialogTitle>
            <DialogDescription>
              Select a manager for {selectedMember?.name || selectedMember?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <Select value={selectedManagerId} onValueChange={setSelectedManagerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a manager" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No Manager</SelectItem>
                {availableManagers
                  .filter((m) => m.id !== selectedMember?.id)
                  .map((manager) => (
                    <SelectItem key={manager.id} value={manager.id}>
                      {manager.name || manager.email}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            {availableManagers.length === 0 && (
              <p className="mt-2 text-sm text-slate-500">
                No managers available. Promote a team member to manager first.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setManagerDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAssignManager} disabled={isAssigningManager}>
              {isAssigningManager ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
