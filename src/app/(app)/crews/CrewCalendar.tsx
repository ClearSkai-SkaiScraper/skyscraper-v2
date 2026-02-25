"use client";

import { Clock, HardHat } from "lucide-react";
import { useMemo } from "react";

import { CalendarEvent, EventCalendar } from "@/components/scheduling/EventCalendar";

interface Schedule {
  id: string;
  claimNumber: string;
  claimTitle: string;
  crewLead: { name: string | null; headshot_url: string | null } | null;
  crewMembers: { id: string; name: string | null }[];
  scheduledDate: string;
  startTime: string;
  estimatedDuration: number;
  complexity: string;
  status: string;
  scopeOfWork: string | null;
  weatherRisk: string | null;
}

const complexityDot: Record<string, string> = {
  low: "bg-green-400",
  medium: "bg-yellow-400",
  high: "bg-orange-500",
  critical: "bg-red-500",
};

export function CrewCalendar({ schedules }: { schedules: Schedule[] }) {
  /* Convert schedules → CalendarEvent[] */
  const events: CalendarEvent[] = useMemo(
    () =>
      schedules.map((s) => ({
        id: s.id,
        title: s.claimTitle,
        date: s.scheduledDate,
        time: s.startTime,
        duration: s.estimatedDuration,
        status: s.status,
        meta: {
          claimNumber: s.claimNumber,
          crewLead: s.crewLead?.name || "Unassigned",
          complexity: s.complexity,
          scopeOfWork: s.scopeOfWork || undefined,
          weatherRisk: s.weatherRisk || undefined,
          memberCount: s.crewMembers.length,
        },
      })),
    [schedules]
  );

  return (
    <div className="space-y-3">
      <EventCalendar
        events={events}
        renderEventTooltip={(event) => (
          <>
            <div className="mb-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
              {event.title}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <Clock className="h-3 w-3" />
                {event.time} · {event.duration}h
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-500 dark:text-slate-400">
                <HardHat className="h-3 w-3" />
                {event.meta?.crewLead as string}
                {(event.meta?.memberCount as number) > 0 && (
                  <span className="text-slate-400">
                    {" "}
                    + {event.meta?.memberCount as number} crew
                  </span>
                )}
              </div>
              {event.meta?.scopeOfWork && (
                <p className="mt-1 line-clamp-2 text-[10px] text-slate-400">
                  {event.meta.scopeOfWork as string}
                </p>
              )}
              {event.meta?.weatherRisk && (
                <div className="mt-1 text-[10px] font-medium text-amber-500">
                  ⚠ {event.meta.weatherRisk as string}
                </div>
              )}
            </div>
          </>
        )}
        renderEventChip={(event) => {
          const complexity = (event.meta?.complexity as string) || "medium";
          return (
            <div className="flex items-center gap-1.5 rounded-md bg-blue-500/10 px-2 py-1 text-[11px] font-medium leading-tight text-blue-700 transition-all hover:ring-1 hover:ring-blue-400/40 dark:bg-blue-500/20 dark:text-blue-300">
              <span
                className={`h-1.5 w-1.5 shrink-0 rounded-full ${complexityDot[complexity] || "bg-slate-400"}`}
              />
              <span className="truncate">{event.title}</span>
              {event.time && (
                <span className="ml-auto shrink-0 text-[10px] opacity-60">{event.time}</span>
              )}
            </div>
          );
        }}
      />

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-slate-200/80 bg-white px-5 py-3 text-xs dark:border-white/[0.08] dark:bg-slate-900/60">
        <span className="font-semibold text-slate-500 dark:text-slate-400">Status:</span>
        {[
          { label: "Scheduled", color: "bg-blue-500" },
          { label: "In Progress", color: "bg-amber-500" },
          { label: "Completed", color: "bg-emerald-500" },
          { label: "Cancelled", color: "bg-red-500" },
        ].map((s) => (
          <div key={s.label} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${s.color}`} />
            <span className="text-slate-500 dark:text-slate-400">{s.label}</span>
          </div>
        ))}

        <span className="ml-2 font-semibold text-slate-500 dark:text-slate-400">Complexity:</span>
        {Object.entries(complexityDot).map(([level, cls]) => (
          <div key={level} className="flex items-center gap-1.5">
            <span className={`inline-block h-2 w-2 rounded-full ${cls}`} />
            <span className="capitalize text-slate-500 dark:text-slate-400">{level}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
