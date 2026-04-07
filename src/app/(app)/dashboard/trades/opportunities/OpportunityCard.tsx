/**
 * OpportunityCard Component
 * Displays matched job opportunities for contractors
 */

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import GlassPanel from "@/components/trades/GlassPanel";
import { logger } from "@/lib/logger";

interface JobOpportunity {
  id: string;
  serviceType: string;
  description?: string;
  distance: number;
  matchScore?: number;
  urgency?: string;
  budget?: string;
  clientName?: string;
  createdAt?: string;
}

export default function OpportunityCard() {
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<JobOpportunity[]>([]);

  useEffect(() => {
    void loadOpportunities();
  }, []);

  async function loadOpportunities() {
    try {
      const res = await fetch("/api/trades/match");
      const data = await res.json();

      if (res.ok) {
        setJobs(data.matches || []);
      } else {
        throw new Error(data.error || "Failed to load opportunities");
      }
    } catch (error) {
      logger.error("Failed to load opportunities:", error);
      toast.error(error.message || "Failed to load job opportunities");
    } finally {
      setLoading(false);
    }
  }

  async function requestConnection(jobId: string) {
    try {
      const res = await fetch("/api/trades/connect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jobId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to request connection");
      }

      toast.success("Connection request sent to client!");
      // Remove job from list
      setJobs((prev) => prev.filter((j) => j.id !== jobId));
    } catch (error) {
      logger.error("Connection request failed:", error);
      toast.error(error.message || "Failed to send connection request");
    }
  }

  if (loading) {
    return (
      <GlassPanel className="p-8">
        <div className="flex items-center justify-center">
          <div className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-600">
            Loading opportunities...
          </div>
        </div>
      </GlassPanel>
    );
  }

  if (jobs.length === 0) {
    return (
      <GlassPanel className="p-8">
        <div className="space-y-2 text-center">
          <div className="text-4xl">🔍</div>
          <div className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-600">
            No job opportunities available
          </div>
          <div className="text-xs text-zinc-400/70">
            Our matching engine runs every 5 minutes. Check back soon, or make sure your profile is
            complete.
          </div>
        </div>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-4">
      {jobs.map((job) => (
        <GlassPanel key={job.id} className="p-5 md:p-6">
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="text-lg font-semibold text-white">{job.serviceType}</div>
                  {job.urgency === "emergency" && (
                    <span className="rounded-full border border-orange-400/30 bg-orange-500/20 px-2 py-0.5 text-[10px] font-medium text-orange-300">
                      URGENT
                    </span>
                  )}
                  {job.matchScore && job.matchScore > 90 && (
                    <span className="rounded-full border border-green-400/30 bg-green-500/20 px-2 py-0.5 text-[10px] font-medium text-green-300">
                      GREAT MATCH
                    </span>
                  )}
                </div>
                {job.clientName && (
                  <div className="text-sm text-slate-600 dark:text-slate-400 dark:text-slate-600">
                    Client: {job.clientName}
                  </div>
                )}
              </div>
              <div className="flex items-center gap-1 text-xs text-slate-600 dark:text-slate-400 dark:text-slate-600">
                <span>📍</span>
                {job.distance.toFixed(1)} mi away
              </div>
            </div>

            {/* Description */}
            {job.description && (
              <p className="text-sm leading-relaxed text-slate-700 dark:text-slate-300">
                {job.description}
              </p>
            )}

            {/* Metadata */}
            <div className="flex items-center gap-4 text-xs text-zinc-400/70">
              {job.budget && <span>💰 {job.budget}</span>}
              {job.createdAt && (
                <span>🕐 Posted {new Date(job.createdAt).toLocaleDateString()}</span>
              )}
              {job.matchScore && (
                <span className="text-green-300/80">✓ {job.matchScore}% match</span>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={() => requestConnection(job.id)}
              className="w-full rounded-2xl bg-sky-500/90 px-4 py-2.5 text-sm font-medium text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-400"
            >
              Request Connection
            </button>
          </div>
        </GlassPanel>
      ))}
    </div>
  );
}
