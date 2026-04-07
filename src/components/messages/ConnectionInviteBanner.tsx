"use client";

/**
 * ConnectionInviteBanner — Shows in message threads when the pro/client
 * are not yet connected. Prompts to accept or send a connection request.
 *
 * Usage:
 *   <ConnectionInviteBanner threadId={threadId} />
 */

import { Check, Loader2, UserPlus } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

interface ConnectionInviteBannerProps {
  threadId: string;
  /** If we already know connection status, pass it to avoid extra fetch */
  connectionStatus?: string | null;
  /** The contractor company id (for client-side view) */
  contractorId?: string;
  /** The client id (for pro-side view) */
  clientId?: string;
}

export function ConnectionInviteBanner({
  threadId,
  connectionStatus: initialStatus,
  contractorId,
  clientId,
}: ConnectionInviteBannerProps) {
  const [status, setStatus] = useState<string | null>(initialStatus ?? null);
  const [loading, setLoading] = useState(!initialStatus);
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch connection status if not provided
  useEffect(() => {
    if (initialStatus !== undefined) {
      setStatus(initialStatus);
      setLoading(false);
      return;
    }

    const check = async () => {
      try {
        const res = await fetch(`/api/messages/${threadId}?connectionCheck=1`);
        if (res.ok) {
          const data = await res.json();
          setStatus(data.connectionStatus ?? null);
        }
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    void check();
  }, [threadId, initialStatus]);

  // Don't show banner if already connected or no connection info available
  if (loading) return null;
  if (status === "accepted" || status === "connected") return null;

  const handleAccept = async (connectionId: string) => {
    setActionLoading(true);
    try {
      const res = await fetch("/api/connections/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ connectionId }),
      });
      if (res.ok) {
        setStatus("accepted");
        toast.success("Connection accepted! 🎉");
      } else {
        toast.error("Failed to accept connection");
      }
    } catch {
      toast.error("Failed to accept connection");
    } finally {
      setActionLoading(false);
    }
  };

  const handleRequest = async () => {
    if (!contractorId) return;
    setActionLoading(true);
    try {
      const res = await fetch("/api/connections/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractorId }),
      });
      if (res.ok) {
        setStatus("pending");
        toast.success("Connection request sent!");
      } else {
        const data = await res.json();
        toast.error(data.error || "Failed to send request");
      }
    } catch {
      toast.error("Failed to send connection request");
    } finally {
      setActionLoading(false);
    }
  };

  // Pending invite from client (pro is viewing)
  if (status === "pending" && clientId) {
    return (
      <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50 px-4 py-3 shadow-sm dark:border-amber-800 dark:from-amber-900/20 dark:to-yellow-900/20">
        <UserPlus className="h-5 w-5 flex-shrink-0 text-amber-600 dark:text-amber-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
            This client wants to connect with you
          </p>
          <p className="text-xs text-amber-600 dark:text-amber-400">
            Accept to enable ongoing messaging and document sharing.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            className="border-green-300 text-green-700 hover:bg-green-50"
            onClick={() => handleAccept(threadId)}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Check className="mr-1 h-3.5 w-3.5" />
                Accept
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Not connected and no pending request (client viewing)
  if (!status && contractorId) {
    return (
      <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-3 shadow-sm dark:border-blue-800 dark:from-blue-900/20 dark:to-indigo-900/20">
        <UserPlus className="h-5 w-5 flex-shrink-0 text-blue-600 dark:text-blue-400" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
            Connect with this contractor
          </p>
          <p className="text-xs text-blue-600 dark:text-blue-400">
            Send a connection request to unlock ongoing messaging and updates.
          </p>
        </div>
        <Button
          size="sm"
          onClick={handleRequest}
          disabled={actionLoading}
          className="bg-blue-600 hover:bg-blue-700"
        >
          {actionLoading ? (
            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-1 h-3.5 w-3.5" />
          )}
          Connect
        </Button>
      </div>
    );
  }

  // Pending request sent (client waiting)
  if (status === "pending") {
    return (
      <div className="mx-4 mb-3 flex items-center gap-3 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
        <Loader2 className="h-5 w-5 flex-shrink-0 animate-spin text-slate-400" />
        <p className="text-sm text-slate-600 dark:text-slate-300">
          Connection request pending — waiting for response.
        </p>
      </div>
    );
  }

  return null;
}
