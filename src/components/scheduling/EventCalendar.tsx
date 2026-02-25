"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface CalendarEvent {
  id: string;
  title: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  duration?: number; // hours
  status: string;
  type?: string;
  color?: string; // override dot color
  meta?: Record<string, string | number | boolean | null | undefined>;
}

export interface EventCalendarProps {
  events: CalendarEvent[];
  /** Render a custom chip inside each day cell per event */
  renderEventChip?: (event: CalendarEvent) => React.ReactNode;
  /** Called when a date cell is clicked */
  onDateClick?: (date: Date, events: CalendarEvent[]) => void;
  /** Called when an event chip is clicked */
  onEventClick?: (event: CalendarEvent) => void;
  /** Status → color mapping. Falls back to blue for unknown statuses */
  statusColors?: Record<string, { bg: string; text: string; dot: string }>;
  /** Optional className for root container */
  className?: string;
  /** Render custom tooltip content for hovered event. Falls back to a default tooltip. */
  renderEventTooltip?: (event: CalendarEvent) => React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Default status palette                                             */
/* ------------------------------------------------------------------ */

const DEFAULT_STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  scheduled: {
    bg: "bg-blue-500/15 dark:bg-blue-500/25",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  SCHEDULED: {
    bg: "bg-blue-500/15 dark:bg-blue-500/25",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  in_progress: {
    bg: "bg-amber-500/15 dark:bg-amber-500/25",
    text: "text-amber-700 dark:text-amber-300",
    dot: "bg-amber-500",
  },
  completed: {
    bg: "bg-emerald-500/15 dark:bg-emerald-500/25",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  COMPLETED: {
    bg: "bg-emerald-500/15 dark:bg-emerald-500/25",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  cancelled: {
    bg: "bg-red-500/15 dark:bg-red-500/25",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
  CANCELLED: {
    bg: "bg-red-500/15 dark:bg-red-500/25",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
};

const FALLBACK_COLOR = {
  bg: "bg-slate-500/15 dark:bg-slate-500/25",
  text: "text-slate-700 dark:text-slate-300",
  dot: "bg-slate-500",
};

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function EventCalendar({
  events,
  renderEventChip,
  onDateClick,
  onEventClick,
  statusColors: userStatusColors,
  className,
  renderEventTooltip,
}: EventCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<"month" | "week">("month");
  const [hoveredEvent, setHoveredEvent] = useState<CalendarEvent | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  const handleChipEnter = useCallback((e: React.MouseEvent, event: CalendarEvent) => {
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setTooltipPos({
      x: Math.min(rect.left, window.innerWidth - 272),
      y: rect.bottom + 6,
    });
    setHoveredEvent(event);
  }, []);

  const handleChipLeave = useCallback(() => {
    setHoveredEvent(null);
  }, []);

  const statusColors = useMemo(
    () => ({ ...DEFAULT_STATUS_COLORS, ...userStatusColors }),
    [userStatusColors]
  );

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();
  const monthLabel = currentDate.toLocaleString("default", { month: "long", year: "numeric" });

  /* ── Week helpers ── */
  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [currentDate]);

  const weekDays = useMemo(
    () =>
      Array.from({ length: 7 }, (_, i) => {
        const d = new Date(weekStart);
        d.setDate(d.getDate() + i);
        return d;
      }),
    [weekStart]
  );

  /* ── Group events by YYYY-MM-DD ── */
  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const e of events) {
      const key = e.date;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(e);
    }
    return map;
  }, [events]);

  /* ── Navigation ── */
  const navigate = useCallback(
    (dir: -1 | 1) => {
      setCurrentDate((prev) => {
        const d = new Date(prev);
        if (viewMode === "month") d.setMonth(d.getMonth() + dir);
        else d.setDate(d.getDate() + dir * 7);
        return d;
      });
    },
    [viewMode]
  );

  const goToday = useCallback(() => setCurrentDate(new Date()), []);

  const today = new Date().toISOString().split("T")[0];

  /* ── Month grid (6-row grid) ── */
  const monthGrid = useMemo(() => {
    const cells: Date[] = [];
    for (let i = 0; i < firstDayOfWeek; i++) {
      cells.push(new Date(year, month, 0 - firstDayOfWeek + i + 1));
    }
    for (let i = 1; i <= daysInMonth; i++) {
      cells.push(new Date(year, month, i));
    }
    while (cells.length % 7 !== 0) {
      const last = cells[cells.length - 1];
      const d = new Date(last);
      d.setDate(d.getDate() + 1);
      cells.push(d);
    }
    return cells;
  }, [year, month, daysInMonth, firstDayOfWeek]);

  /* ── Render a single day cell ── */
  const renderDayCell = (date: Date, isWeekView: boolean) => {
    const dateStr = date.toISOString().split("T")[0];
    const dayEvents = eventsByDate.get(dateStr) || [];
    const isToday = dateStr === today;
    const isCurrentMonth = date.getMonth() === month;
    const hasEvents = dayEvents.length > 0;

    return (
      <div
        key={dateStr}
        onClick={() => onDateClick?.(date, dayEvents)}
        className={cn(
          "group relative flex flex-col border-b border-r border-slate-200/60 transition-colors dark:border-white/[0.06]",
          isWeekView ? "min-h-[320px]" : "min-h-[110px]",
          !isCurrentMonth && "bg-slate-50/50 dark:bg-white/[0.01]",
          isCurrentMonth && "bg-white dark:bg-white/[0.02]",
          isToday && "bg-blue-50/60 dark:bg-blue-500/[0.06]",
          onDateClick && "cursor-pointer hover:bg-blue-50/40 dark:hover:bg-blue-500/[0.04]"
        )}
      >
        {/* Day number */}
        <div className="flex items-center justify-between px-2.5 pt-2">
          <span
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full text-xs font-semibold transition-colors",
              isToday && "bg-blue-600 text-white shadow-sm shadow-blue-600/30",
              !isToday && isCurrentMonth && "text-slate-700 dark:text-slate-300",
              !isCurrentMonth && "text-slate-400 dark:text-slate-600"
            )}
          >
            {date.getDate()}
          </span>
          {hasEvents && !isToday && (
            <span className="flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-100 px-1.5 text-[10px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
              {dayEvents.length}
            </span>
          )}
        </div>

        {/* Event chips */}
        <div className="flex-1 space-y-0.5 overflow-hidden px-1.5 pb-1.5 pt-1">
          {dayEvents.slice(0, isWeekView ? 8 : 3).map((event) => {
            const colors = statusColors[event.status] || FALLBACK_COLOR;

            if (renderEventChip) {
              return (
                <div
                  key={event.id}
                  onClick={(e) => {
                    e.stopPropagation();
                    onEventClick?.(event);
                  }}
                  onMouseEnter={(e) => handleChipEnter(e, event)}
                  onMouseLeave={handleChipLeave}
                >
                  {renderEventChip(event)}
                </div>
              );
            }

            return (
              <div
                key={event.id}
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick?.(event);
                }}
                onMouseEnter={(e) => handleChipEnter(e, event)}
                onMouseLeave={handleChipLeave}
                className={cn(
                  "flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium leading-tight transition-all",
                  colors.bg,
                  colors.text,
                  onEventClick && "cursor-pointer hover:ring-1 hover:ring-blue-400/40"
                )}
              >
                <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", colors.dot)} />
                <span className="truncate">{event.title}</span>
                {event.time && (
                  <span className="ml-auto shrink-0 text-[10px] opacity-60">{event.time}</span>
                )}
              </div>
            );
          })}
          {dayEvents.length > (isWeekView ? 8 : 3) && (
            <div className="px-2 text-[10px] font-semibold text-blue-500">
              +{dayEvents.length - (isWeekView ? 8 : 3)} more
            </div>
          )}
        </div>
      </div>
    );
  };

  /* ── Main render ── */
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60",
        className
      )}
    >
      {/* ── Header ── */}
      <div className="flex items-center justify-between border-b border-slate-200/80 bg-slate-50/80 px-5 py-3.5 dark:border-white/[0.06] dark:bg-white/[0.02]">
        <div className="flex items-center gap-2">
          <button
            onClick={() => navigate(-1)}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <ChevronLeft className="h-4.5 w-4.5" />
          </button>
          <h2 className="min-w-[180px] text-center text-[15px] font-semibold text-slate-800 dark:text-slate-100">
            {viewMode === "month"
              ? monthLabel
              : `Week of ${weekStart.toLocaleDateString("default", { month: "short", day: "numeric" })}`}
          </h2>
          <button
            onClick={() => navigate(1)}
            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-200/60 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-white/10 dark:hover:text-slate-200"
          >
            <ChevronRight className="h-4.5 w-4.5" />
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goToday}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition-colors hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-300 dark:hover:bg-white/10"
          >
            Today
          </button>
          <div className="flex overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm dark:border-white/10 dark:bg-white/5">
            {(["week", "month"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={cn(
                  "px-3.5 py-1.5 text-xs font-semibold capitalize transition-all",
                  viewMode === mode
                    ? "bg-blue-600 text-white shadow-inner"
                    : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
                )}
              >
                {mode}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── Day-of-week headers ── */}
      <div className="grid grid-cols-7 border-b border-slate-200/80 bg-slate-50/60 dark:border-white/[0.06] dark:bg-white/[0.015]">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="px-2.5 py-2 text-center text-[11px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500"
          >
            {day}
          </div>
        ))}
      </div>

      {/* ── Grid body ── */}
      <div className="grid grid-cols-7">
        {viewMode === "month"
          ? monthGrid.map((d) => renderDayCell(d, false))
          : weekDays.map((d) => renderDayCell(d, true))}
      </div>

      {/* ── Floating tooltip (portal to body so it escapes overflow) ── */}
      {hoveredEvent &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="pointer-events-none fixed z-[9999] w-64 rounded-xl border border-slate-200/80 bg-white/95 p-3 shadow-2xl backdrop-blur-lg dark:border-white/10 dark:bg-slate-800/95"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            {renderEventTooltip ? (
              renderEventTooltip(hoveredEvent)
            ) : (
              <>
                <p className="mb-1.5 text-xs font-bold text-slate-800 dark:text-slate-100">
                  {hoveredEvent.title}
                </p>
                <div className="space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                  {hoveredEvent.time && (
                    <p>
                      🕐 {hoveredEvent.time}
                      {hoveredEvent.duration ? ` · ${hoveredEvent.duration}h` : ""}
                    </p>
                  )}
                  {hoveredEvent.type && (
                    <p>
                      📋{" "}
                      {hoveredEvent.type
                        .replace(/_/g, " ")
                        .replace(/\b\w/g, (c) => c.toUpperCase())}
                    </p>
                  )}
                  <p>
                    Status:{" "}
                    <span className="font-medium capitalize">
                      {hoveredEvent.status.toLowerCase()}
                    </span>
                  </p>
                </div>
              </>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
