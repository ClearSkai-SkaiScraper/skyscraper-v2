/**
 * Account State Badge
 *
 * Per AI advisor: "Show: No Org, Pending Invite, Active Member, Client Only, Multi-Org"
 * Makes support and QA way easier.
 *
 * Usage: <AccountStateBadge />
 */

"use client";

import { useOrganization, useOrganizationList, useUser } from "@clerk/nextjs";
import { AlertCircle, CheckCircle, Clock, Layers, UserCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

type AccountState =
  | "loading"
  | "signed_out"
  | "no_org"
  | "pending_invite"
  | "active_member"
  | "client_only"
  | "multi_org";

interface AccountStateInfo {
  state: AccountState;
  label: string;
  description: string;
  color: string;
  icon: React.ReactNode;
}

const STATE_CONFIG: Record<AccountState, Omit<AccountStateInfo, "state">> = {
  loading: {
    label: "Loading",
    description: "Checking account state...",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: <Clock className="h-3.5 w-3.5 animate-pulse" />,
  },
  signed_out: {
    label: "Signed Out",
    description: "User is not authenticated",
    color: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    icon: <UserCircle className="h-3.5 w-3.5" />,
  },
  no_org: {
    label: "No Org",
    description: "User has no organization membership",
    color: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    icon: <AlertCircle className="h-3.5 w-3.5" />,
  },
  pending_invite: {
    label: "Pending Invite",
    description: "User has a pending organization invitation",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    icon: <Clock className="h-3.5 w-3.5" />,
  },
  active_member: {
    label: "Active Member",
    description: "User is an active member of an organization",
    color: "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-300",
    icon: <CheckCircle className="h-3.5 w-3.5" />,
  },
  client_only: {
    label: "Client Only",
    description: "User is a client portal user (not a pro member)",
    color: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    icon: <UserCircle className="h-3.5 w-3.5" />,
  },
  multi_org: {
    label: "Multi-Org",
    description: "User belongs to multiple organizations",
    color: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
    icon: <Layers className="h-3.5 w-3.5" />,
  },
};

interface Props {
  showTooltip?: boolean;
  className?: string;
}

export function AccountStateBadge({ showTooltip = true, className }: Props) {
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { organization, isLoaded: orgLoaded } = useOrganization();
  const { userMemberships, isLoaded: membershipsLoaded } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  const [state, setState] = useState<AccountState>("loading");
  const [pendingInvites, setPendingInvites] = useState(0);

  useEffect(() => {
    async function checkState() {
      if (!userLoaded || !orgLoaded || !membershipsLoaded) {
        setState("loading");
        return;
      }

      if (!isSignedIn || !user) {
        setState("signed_out");
        return;
      }

      // Check if user is client-only via metadata
      const userType = user.publicMetadata?.userType;
      if (userType === "client") {
        setState("client_only");
        return;
      }

      const membershipCount = userMemberships?.count || 0;

      // Check for pending invites
      try {
        const res = await fetch("/api/invitations/pending");
        if (res.ok) {
          const data = await res.json();
          setPendingInvites(data.count || 0);
          if (data.count > 0 && membershipCount === 0) {
            setState("pending_invite");
            return;
          }
        }
      } catch {
        // Ignore — endpoint might not exist
      }

      // Multi-org check
      if (membershipCount > 1) {
        setState("multi_org");
        return;
      }

      // Active member check
      if (organization && membershipCount >= 1) {
        setState("active_member");
        return;
      }

      // No org
      if (membershipCount === 0) {
        setState("no_org");
        return;
      }

      setState("active_member");
    }

    checkState();
  }, [userLoaded, orgLoaded, membershipsLoaded, isSignedIn, user, organization, userMemberships]);

  const config = STATE_CONFIG[state];

  const badge = (
    <Badge
      variant="secondary"
      className={`flex items-center gap-1.5 ${config.color} ${className || ""}`}
    >
      {config.icon}
      <span className="text-xs font-medium">{config.label}</span>
      {pendingInvites > 0 && state === "pending_invite" && (
        <span className="ml-1 rounded-full bg-blue-500 px-1.5 py-0.5 text-[10px] text-white">
          {pendingInvites}
        </span>
      )}
    </Badge>
  );

  if (!showTooltip) {
    return badge;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <div className="space-y-1">
            <p className="font-medium">{config.label}</p>
            <p className="text-xs text-muted-foreground">{config.description}</p>
            {organization && (
              <p className="text-xs text-muted-foreground">Current Org: {organization.name}</p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

/**
 * Detailed account state panel for admin/debug views
 */
export function AccountStatePanel() {
  const { isLoaded: userLoaded, isSignedIn, user } = useUser();
  const { organization, membership } = useOrganization();
  const { userMemberships } = useOrganizationList({
    userMemberships: { infinite: true },
  });

  if (!userLoaded) {
    return <div className="text-sm text-muted-foreground">Loading account state...</div>;
  }

  if (!isSignedIn || !user) {
    return <div className="text-sm text-muted-foreground">Not signed in</div>;
  }

  return (
    <div className="space-y-3 rounded-lg border bg-slate-50 p-4 dark:bg-slate-900">
      <div className="flex items-center justify-between">
        <h4 className="font-medium">Account State Debug</h4>
        <AccountStateBadge showTooltip={false} />
      </div>

      <div className="grid gap-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">User ID:</span>
          <code className="text-xs">{user.id}</code>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Email:</span>
          <span>{user.primaryEmailAddress?.emailAddress || "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">User Type:</span>
          <span>{(user.publicMetadata?.userType as string) || "pro"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Active Org:</span>
          <span>{organization?.name || "None"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Org ID:</span>
          <code className="text-xs">{organization?.id || "N/A"}</code>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Role:</span>
          <span>{membership?.role || "N/A"}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Total Memberships:</span>
          <span>{userMemberships?.count || 0}</span>
        </div>
      </div>
    </div>
  );
}
