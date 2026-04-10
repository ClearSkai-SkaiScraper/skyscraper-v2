"use client";
import { Activity,AlertTriangle, CheckCircle } from "lucide-react";
import { useState } from "react";
import useSWR from "swr";

import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface SystemHealthPopoverProps {
  isOpen: boolean;
  onClose: () => void;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  healthData: any;
}

function SystemHealthPopover({ isOpen, onClose, healthData }: SystemHealthPopoverProps) {
  if (!isOpen) return null;

  return (
    <div className="absolute right-0 top-full z-50 mt-2 w-72 rounded-lg border bg-card p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold">System Status</h3>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Close system status"
        >
          ×
        </button>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">Storage</span>
          <div className="flex items-center gap-2">
            {healthData?.storage?.enabled && healthData?.storage?.ready ? (
              <CheckCircle size={14} className="text-green-500" />
            ) : (
              <AlertTriangle size={14} className="text-amber-500" />
            )}
            <span className="text-xs text-muted-foreground">
              {healthData?.storage?.enabled
                ? healthData?.storage?.ready
                  ? "Ready"
                  : "Not Ready"
                : "Disabled"}
            </span>
          </div>
        </div>

        {healthData?.tokens?.remaining !== null && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Tokens</span>
            <span className="text-xs text-muted-foreground">
              {healthData.tokens.remaining} remaining
            </span>
          </div>
        )}

        {healthData?.versions?.commit && (
          <div className="flex items-center justify-between">
            <span className="text-sm">Version</span>
            <span className="font-mono text-xs text-muted-foreground">
              {healthData.versions.commit}
            </span>
          </div>
        )}

        <div className="border-t pt-2 text-xs text-muted-foreground">
          Last updated:{" "}
          {healthData?.timestamp ? new Date(healthData.timestamp).toLocaleTimeString() : "Unknown"}
        </div>
      </div>
    </div>
  );
}

export function SystemHealthBadge() {
  const [isOpen, setIsOpen] = useState(false);

  const { data: healthData, error } = useSWR("/api/health/summary", fetcher, {
    revalidateOnFocus: false,
    refreshInterval: 30000, // Check every 30 seconds
  });

  const hasIssues = healthData && (!healthData.storage?.enabled || !healthData.storage?.ready);

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors",
          "hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
          hasIssues
            ? "bg-amber-50 text-amber-600 dark:bg-amber-950/20 dark:text-amber-400"
            : "text-muted-foreground hover:text-foreground"
        )}
        aria-label="System health status"
        aria-expanded={isOpen}
      >
        <Activity size={12} />
        <span className="hidden sm:inline">
          {error ? "Error" : hasIssues ? "Issues" : "Healthy"}
        </span>
      </button>

      <SystemHealthPopover
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        healthData={healthData}
      />

      {/* Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}
    </div>
  );
}
