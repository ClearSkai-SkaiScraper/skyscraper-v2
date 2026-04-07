"use client";

/**
 * WorkOpportunityNotifications.tsx
 * Shows pending work opportunities and invitations for trade professionals
 */

import { Bell, Briefcase, Check, Clock, MapPin, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import useSWR from "swr";

interface WorkOpportunity {
  id: string;
  title: string;
  description: string;
  location: string;
  trade: string;
  urgency: "high" | "medium" | "low";
  postedAt: string;
  clientName?: string;
  estimatedValue?: number;
}

interface TradeInvite {
  id: string;
  fromName: string;
  fromCompany: string;
  projectTitle: string;
  message?: string;
  createdAt: string;
  status: "PENDING" | "ACCEPTED" | "DECLINED";
}

const fetcher = async (url: string) => {
  try {
    const res = await fetch(url);
    if (!res.ok) return { opportunities: [], invites: [] };
    return await res.json();
  } catch {
    return { opportunities: [], invites: [] };
  }
};

export default function WorkOpportunityNotifications() {
  const { data, isLoading, mutate } = useSWR("/api/trades/opportunities", fetcher);
  const [processing, setProcessing] = useState<string | null>(null);

  const opportunities = data?.opportunities || [];
  const invites = data?.invites || [];
  const totalCount =
    opportunities.length + invites.filter((i: TradeInvite) => i.status === "PENDING").length;

  const handleInviteResponse = async (inviteId: string, accept: boolean) => {
    setProcessing(inviteId);
    try {
      const res = await fetch(`/api/trades/invites/${inviteId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept }),
      });

      if (!res.ok) {
        throw new Error("Failed to respond to invite");
      }

      toast.success(accept ? "Invitation accepted!" : "Invitation declined");
      void mutate();
    } catch (err) {
      toast.error("Failed to respond to invitation");
    } finally {
      setProcessing(null);
    }
  };

  const getUrgencyBadge = (urgency: string) => {
    switch (urgency) {
      case "high":
        return "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400";
      case "medium":
        return "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400";
      default:
        return "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400";
    }
  };

  if (isLoading) {
    return (
      <div className="rounded-3xl border border-purple-200/50 bg-gradient-to-br from-white to-purple-50 p-6 shadow-xl dark:border-purple-800/50 dark:from-slate-900 dark:to-purple-900/20">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 animate-pulse rounded-lg bg-purple-200 dark:bg-purple-800" />
          <div className="h-6 w-48 animate-pulse rounded bg-slate-200 dark:bg-slate-700" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
          <div className="h-20 animate-pulse rounded-xl bg-slate-200 dark:bg-slate-700" />
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-3xl border border-purple-200/50 bg-gradient-to-br from-white to-purple-50 p-6 shadow-xl dark:border-purple-800/50 dark:from-slate-900 dark:to-purple-900/20">
      {/* Header with notification count */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
          <div className="relative">
            <Bell className="h-5 w-5 text-purple-600 dark:text-purple-400" />
            {totalCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                {totalCount > 9 ? "9+" : totalCount}
              </span>
            )}
          </div>
          Work Opportunities
        </h3>
        <Link
          href="/connections"
          className="text-xs font-medium text-purple-600 hover:underline dark:text-purple-400"
        >
          View All
        </Link>
      </div>

      {totalCount === 0 ? (
        // Empty state
        <div className="py-6 text-center">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-purple-100 dark:bg-purple-900/30">
            <Briefcase className="h-7 w-7 text-purple-500" />
          </div>
          <p className="font-medium text-slate-700 dark:text-slate-300">No New Opportunities</p>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Check back later for new jobs and invites from the network.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {/* Pending Invites */}
          {invites
            .filter((invite: TradeInvite) => invite.status === "PENDING")
            .slice(0, 2)
            .map((invite: TradeInvite) => (
              <div
                key={invite.id}
                className="rounded-xl border border-blue-100 bg-gradient-to-r from-blue-50 to-indigo-50 p-4 shadow-sm dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-slate-900 dark:text-white">
                      Invite from {invite.fromCompany}
                    </p>
                    <p className="mt-0.5 truncate text-sm text-slate-600 dark:text-slate-400">
                      {invite.projectTitle}
                    </p>
                    <p className="mt-1 flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Clock className="h-3 w-3" />
                      {new Date(invite.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleInviteResponse(invite.id, true)}
                      disabled={processing === invite.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-green-100 text-green-600 transition-colors hover:bg-green-200 disabled:opacity-50 dark:bg-green-900/30 dark:text-green-400"
                      title="Accept"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleInviteResponse(invite.id, false)}
                      disabled={processing === invite.id}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-red-100 text-red-600 transition-colors hover:bg-red-200 disabled:opacity-50 dark:bg-red-900/30 dark:text-red-400"
                      title="Decline"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

          {/* Job Opportunities */}
          {opportunities
            .slice(
              0,
              3 - Math.min(invites.filter((i: TradeInvite) => i.status === "PENDING").length, 2)
            )
            .map((opp: WorkOpportunity) => (
              <div
                key={opp.id}
                className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800/50"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-medium text-slate-900 dark:text-white">
                        {opp.title}
                      </p>
                      <span
                        className={`rounded-full px-2 py-0.5 text-xs font-medium ${getUrgencyBadge(opp.urgency)}`}
                      >
                        {opp.urgency}
                      </span>
                    </div>
                    <p className="mt-0.5 flex items-center gap-1 text-sm text-slate-600 dark:text-slate-400">
                      <MapPin className="h-3 w-3" />
                      {opp.location}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {opp.trade} • Posted {new Date(opp.postedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <Link
                    href={`/invitations`}
                    className="flex-shrink-0 rounded-lg bg-purple-600 px-3 py-1.5 text-xs font-medium text-white shadow-sm transition-all hover:-translate-y-0.5 hover:bg-purple-700 hover:shadow-md"
                  >
                    View
                  </Link>
                </div>
              </div>
            ))}

          {/* See More Link */}
          {totalCount > 3 && (
            <Link
              href="/connections"
              className="block rounded-xl border border-dashed border-purple-300 p-3 text-center text-sm font-medium text-purple-600 transition-colors hover:bg-purple-50 dark:border-purple-700 dark:text-purple-400 dark:hover:bg-purple-900/20"
            >
              View {totalCount - 3} more {totalCount - 3 === 1 ? "opportunity" : "opportunities"}
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
