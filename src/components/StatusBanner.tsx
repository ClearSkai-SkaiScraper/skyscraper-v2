"use client";

import { AlertTriangle, CheckCircle2, Info, X } from "lucide-react";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

type IncidentSeverity = "critical" | "warning" | "info" | "resolved";

interface Incident {
  id: string;
  severity: IncidentSeverity;
  title: string;
  message: string;
  link?: string;
  dismissible?: boolean;
}

const SEVERITY_STYLES: Record<
  IncidentSeverity,
  { bg: string; text: string; icon: typeof AlertTriangle }
> = {
  critical: {
    bg: "bg-red-600",
    text: "text-white",
    icon: AlertTriangle,
  },
  warning: {
    bg: "bg-amber-500",
    text: "text-white",
    icon: AlertTriangle,
  },
  info: {
    bg: "bg-blue-600",
    text: "text-white",
    icon: Info,
  },
  resolved: {
    bg: "bg-green-600",
    text: "text-white",
    icon: CheckCircle2,
  },
};

/**
 * Status Banner — Shows system-wide incidents or maintenance notices.
 *
 * Checks /api/health/status for active incidents.
 * Falls back to static incidents prop for immediate display.
 *
 * Usage:
 *   <StatusBanner />                     // Auto-fetch from API
 *   <StatusBanner incidents={[...]} />   // Static incidents
 */
export function StatusBanner({ incidents: staticIncidents }: { incidents?: Incident[] }) {
  const [incidents, setIncidents] = useState<Incident[]>(staticIncidents || []);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());

  // Fetch live incidents
  useEffect(() => {
    if (staticIncidents) return;

    const fetchStatus = async () => {
      try {
        const res = await fetch("/api/health/status", { next: { revalidate: 60 } });
        if (!res.ok) return;
        const data = await res.json();
        if (data.incidents && Array.isArray(data.incidents)) {
          setIncidents(data.incidents);
        }
      } catch {
        // Silently fail — don't show banner on fetch error
      }
    };

    void fetchStatus();
    // Re-check every 2 minutes
    const interval = setInterval(fetchStatus, 2 * 60 * 1000);
    return () => clearInterval(interval);
  }, [staticIncidents]);

  // Restore dismissed state from localStorage
  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem("skai-dismissed-incidents") || "[]");
      setDismissed(new Set(stored));
    } catch {
      // Ignore
    }
  }, []);

  const dismiss = (id: string) => {
    const next = new Set(dismissed);
    next.add(id);
    setDismissed(next);
    try {
      localStorage.setItem("skai-dismissed-incidents", JSON.stringify([...next]));
    } catch {
      // Ignore
    }
  };

  const visibleIncidents = incidents.filter(
    (inc) => !dismissed.has(inc.id) || inc.severity === "critical" // Can't dismiss critical
  );

  if (visibleIncidents.length === 0) return null;

  return (
    <div className="space-y-0">
      {visibleIncidents.map((incident) => {
        const style = SEVERITY_STYLES[incident.severity];
        const Icon = style.icon;

        return (
          <div
            key={incident.id}
            className={cn("flex items-center gap-3 px-4 py-2", style.bg, style.text)}
            role="alert"
            aria-live={incident.severity === "critical" ? "assertive" : "polite"}
          >
            <Icon className="h-4 w-4 shrink-0" />
            <div className="flex-1 text-sm">
              <span className="font-semibold">{incident.title}</span>
              {" — "}
              <span>{incident.message}</span>
              {incident.link && (
                <a
                  href={incident.link}
                  className="ml-1 underline hover:no-underline"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Learn more →
                </a>
              )}
            </div>
            {incident.dismissible !== false && incident.severity !== "critical" && (
              <button
                onClick={() => dismiss(incident.id)}
                className="shrink-0 rounded p-0.5 hover:bg-white/20"
                aria-label="Dismiss"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
