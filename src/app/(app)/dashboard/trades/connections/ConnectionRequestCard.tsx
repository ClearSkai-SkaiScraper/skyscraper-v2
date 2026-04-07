/**
 * ConnectionRequestCard Component
 * Displays list of pending client connection requests
 */

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import GlassPanel from "@/components/trades/GlassPanel";
import { logger } from "@/lib/logger";

import AcceptDeclineButtons from "./AcceptDeclineButtons";

interface ConnectionRequest {
  id: string;
  clientName: string;
  clientId: string;
  clientEmail?: string;
  serviceRequested: string;
  description?: string;
  urgency?: string;
  createdAt: string;
  distance?: number;
}

export default function ConnectionRequestCard() {
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);

  useEffect(() => {
    void loadRequests();
  }, []);

  async function loadRequests() {
    try {
      // Fetch from the correct endpoint for client→pro connection requests
      const res = await fetch("/api/connections/received");
      const data = await res.json();

      if (res.ok) {
        // Transform received connections to match our interface
        // Accept both uppercase and legacy lowercase pending status
        const received = (data.received || [])
          .filter((r: any) => r.status === "PENDING" || r.status === "pending")
          .map((r: any) => ({
            id: r.id,
            clientId: r.client?.id || "",
            clientName: r.client?.name || "Unknown Client",
            clientEmail: r.client?.email || undefined,
            serviceRequested: r.client?.category || r.notes || "General Inquiry",
            description: r.notes || undefined,
            urgency: undefined,
            createdAt: r.invitedAt,
            distance: undefined,
          }));
        setRequests(received);
      } else {
        throw new Error(data.error || "Failed to load requests");
      }
    } catch (error) {
      logger.error("Failed to load requests:", error);
      toast.error(error.message || "Failed to load connection requests");
    } finally {
      setLoading(false);
    }
  }

  function handleRequestResolved(requestId: string) {
    setRequests((prev) => prev.filter((r) => r.id !== requestId));
  }

  if (loading) {
    return (
      <GlassPanel className="p-8">
        <div className="flex items-center justify-center">
          <div className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-600">
            Loading requests...
          </div>
        </div>
      </GlassPanel>
    );
  }

  if (requests.length === 0) {
    return (
      <GlassPanel className="p-8">
        <div className="space-y-2 text-center">
          <div className="text-4xl">📭</div>
          <div className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-600">
            No pending connection requests
          </div>
          <div className="text-xs text-zinc-400/70">
            When clients request to connect with you, they'll appear here.
          </div>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      {requests.map((req) => (
        <GlassPanel key={req.id} className="p-5 md:p-6">
          <div className="space-y-4">
            {/* Header — clickable to view client profile */}
            <Link
              href={`/dashboard/trades/clients/${req.clientId}`}
              className="block transition-opacity hover:opacity-80"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <div className="text-lg font-semibold text-white">{req.clientName}</div>
                    {req.urgency === "emergency" && (
                      <span className="rounded-full border border-red-400/30 bg-red-500/20 px-2 py-0.5 text-[10px] font-medium text-red-300">
                        URGENT
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-600">
                    {req.serviceRequested}
                  </div>
                </div>
                {req.distance != null && (
                  <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-600">
                    <span>📍</span>
                    {req.distance.toFixed(1)} mi
                  </div>
                )}
              </div>
            </Link>

            {/* Description */}
            {req.description && (
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {req.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-3 text-xs text-zinc-400/70">
              <span>🕐 {new Date(req.createdAt).toLocaleDateString()}</span>
              {req.clientEmail && <span>✉️ {req.clientEmail}</span>}
            </div>

            {/* Action Buttons */}
            <AcceptDeclineButtons
              requestId={req.id}
              clientName={req.clientName}
              onResolved={() => handleRequestResolved(req.id)}
            />
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}
