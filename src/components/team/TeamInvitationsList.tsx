"use client";

import { CheckCircle, Clock, Loader2, Mail,XCircle } from "lucide-react";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";

interface Invitation {
  id: string;
  email: string;
  role: string;
  status: "pending" | "accepted" | "expired";
  createdAt: string;
  expiresAt: string;
}

export default function TeamInvitationsList() {
  const [invitations, setInvitations] = useState<Invitation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void fetchInvitations();
  }, []);

  const fetchInvitations = async () => {
    try {
      const response = await fetch("/api/team/invitations");
      if (response.ok) {
        const data = await response.json();
        setInvitations(data);
      }
    } catch (error) {
      logger.error("Failed to fetch invitations:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[color:var(--primary)]" />
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-glass)] py-12 text-center backdrop-blur-xl">
        <Mail className="mx-auto mb-4 h-16 w-16 text-[color:var(--muted)]" />
        <h3 className="mb-2 text-lg font-semibold text-[color:var(--text)]">
          No Invitations Sent
        </h3>
        <p className="text-[color:var(--muted)]">
          Send your first team invitation to get started
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {invitations.map((invitation) => {
        const isExpired = new Date(invitation.expiresAt) < new Date();
        const status = isExpired && invitation.status === "pending" ? "expired" : invitation.status;

        return (
          <div
            key={invitation.id}
            className="rounded-xl border border-[color:var(--border)] bg-[var(--surface-glass)] p-4 backdrop-blur-xl transition hover:bg-[var(--surface-2)]"
          >
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <div className="mb-2 flex items-center gap-3">
                  <p className="font-semibold text-[color:var(--text)]">
                    {invitation.email}
                  </p>
                  <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                    {invitation.role}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-[color:var(--muted)]">
                  <span>
                    Sent {new Date(invitation.createdAt).toLocaleDateString()}
                  </span>
                  <span>•</span>
                  <span>
                    Expires {new Date(invitation.expiresAt).toLocaleDateString()}
                  </span>
                </div>
              </div>

              {/* Status Badge */}
              <div className="flex items-center gap-2">
                {status === "pending" && (
                  <span className="flex items-center gap-2 rounded-full bg-yellow-100 px-3 py-1.5 text-sm font-medium text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400">
                    <Clock className="h-4 w-4" />
                    Pending
                  </span>
                )}
                {status === "accepted" && (
                  <span className="flex items-center gap-2 rounded-full bg-green-100 px-3 py-1.5 text-sm font-medium text-green-800 dark:bg-green-900/30 dark:text-green-400">
                    <CheckCircle className="h-4 w-4" />
                    Accepted
                  </span>
                )}
                {status === "expired" && (
                  <span className="flex items-center gap-2 rounded-full bg-gray-100 px-3 py-1.5 text-sm font-medium text-gray-800 dark:bg-gray-900/30 dark:text-gray-400">
                    <XCircle className="h-4 w-4" />
                    Expired
                  </span>
                )}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
