"use client";

import {
  AlertCircle,
  Calendar as CalendarIcon,
  CheckCircle,
  ClipboardCheck,
  Clock,
  Eye,
  Gavel,
  List,
  MapPin,
  Plus,
  Search,
  User,
  X,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CalendarEvent, EventCalendar } from "@/components/scheduling/EventCalendar";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface AppointmentsClientProps {
  currentUserId: string;
  orgId: string;
}

type AppointmentType =
  | "inspection"
  | "follow_up"
  | "walkthrough"
  | "adjustment"
  | "meeting"
  | "adjuster"
  | "site_visit"
  | "estimate"
  | "other";

const APPOINTMENT_TYPES: {
  id: AppointmentType;
  label: string;
  icon: typeof ClipboardCheck;
  color: string;
  gradient: string;
}[] = [
  {
    id: "inspection",
    label: "Inspection",
    icon: Search,
    color: "text-blue-600 bg-blue-500/15",
    gradient: "from-blue-600 to-indigo-600",
  },
  {
    id: "follow_up",
    label: "Follow-Up",
    icon: Clock,
    color: "text-amber-600 bg-amber-500/15",
    gradient: "from-amber-500 to-orange-500",
  },
  {
    id: "walkthrough",
    label: "Final Walkthrough",
    icon: Eye,
    color: "text-emerald-600 bg-emerald-500/15",
    gradient: "from-emerald-600 to-teal-600",
  },
  {
    id: "adjuster",
    label: "Adjuster Meeting",
    icon: User,
    color: "text-purple-600 bg-purple-500/15",
    gradient: "from-purple-600 to-violet-600",
  },
  {
    id: "adjustment",
    label: "Adjustment",
    icon: Gavel,
    color: "text-rose-600 bg-rose-500/15",
    gradient: "from-rose-600 to-pink-600",
  },
];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  SCHEDULED: {
    bg: "bg-blue-500/15 dark:bg-blue-500/25",
    text: "text-blue-700 dark:text-blue-300",
    dot: "bg-blue-500",
  },
  COMPLETED: {
    bg: "bg-emerald-500/15 dark:bg-emerald-500/25",
    text: "text-emerald-700 dark:text-emerald-300",
    dot: "bg-emerald-500",
  },
  CANCELLED: {
    bg: "bg-red-500/15 dark:bg-red-500/25",
    text: "text-red-700 dark:text-red-300",
    dot: "bg-red-500",
  },
};

const TYPE_COLORS: Record<string, string> = {
  inspection: "bg-blue-500",
  follow_up: "bg-amber-500",
  walkthrough: "bg-emerald-500",
  adjuster: "bg-purple-500",
  adjustment: "bg-rose-500",
  meeting: "bg-indigo-500",
  site_visit: "bg-cyan-500",
  estimate: "bg-teal-500",
  other: "bg-slate-500",
};

/* ------------------------------------------------------------------ */
/*  Quick-Schedule Form (inline)                                       */
/* ------------------------------------------------------------------ */

function QuickScheduleForm({
  type,
  onClose,
  onSuccess,
}: {
  type: AppointmentType;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title: "",
    date: "",
    startTime: "09:00",
    endTime: "10:00",
    location: "",
    description: "",
    notes: "",
  });

  const typeMeta = APPOINTMENT_TYPES.find((t) => t.id === type) || APPOINTMENT_TYPES[0];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title || !form.date) {
      toast.error("Title and date are required");
      return;
    }
    setLoading(true);
    try {
      const scheduledFor = new Date(`${form.date}T${form.startTime}:00`);
      const endTime = new Date(`${form.date}T${form.endTime}:00`);

      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: form.title,
          startTime: scheduledFor.toISOString(),
          endTime: endTime.toISOString(),
          location: form.location || null,
          description: form.description || `${typeMeta.label} appointment`,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) throw new Error("Failed to create appointment");
      toast.success(`${typeMeta.label} scheduled!`);
      onSuccess();
      onClose();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to schedule");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60"
    >
      <div className="mb-5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "inline-flex rounded-lg bg-gradient-to-r px-3 py-1 text-xs font-bold text-white",
              typeMeta.gradient
            )}
          >
            {typeMeta.label}
          </span>
          <span className="text-sm font-semibold text-slate-700 dark:text-slate-200">
            New Appointment
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="md:col-span-2">
          <label className="mb-1 block text-xs font-medium text-slate-500">Title *</label>
          <input
            required
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
            placeholder={`e.g. ${typeMeta.label} — 123 Main St`}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Date *</label>
          <input
            type="date"
            required
            value={form.date}
            onChange={(e) => setForm({ ...form, date: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Start Time</label>
          <input
            type="time"
            value={form.startTime}
            onChange={(e) => setForm({ ...form, startTime: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">End Time</label>
          <input
            type="time"
            value={form.endTime}
            onChange={(e) => setForm({ ...form, endTime: e.target.value })}
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-medium text-slate-500">Location</label>
          <input
            value={form.location}
            onChange={(e) => setForm({ ...form, location: e.target.value })}
            placeholder="Address or site location"
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
        </div>
        <div className="md:col-span-3">
          <label className="mb-1 block text-xs font-medium text-slate-500">Notes</label>
          <input
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            placeholder="Gate code, parking instructions, what to bring..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-4 py-2.5 text-sm text-slate-800 placeholder-slate-400 transition focus:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-400/20 dark:border-white/10 dark:bg-white/5 dark:text-slate-200"
          />
        </div>
      </div>

      <div className="mt-5 flex gap-3">
        <button
          type="submit"
          disabled={loading}
          className={cn(
            "rounded-xl bg-gradient-to-r px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:shadow-md disabled:opacity-50",
            typeMeta.gradient
          )}
        >
          {loading ? "Scheduling..." : `Schedule ${typeMeta.label}`}
        </button>
        <button
          type="button"
          onClick={onClose}
          className="rounded-xl border border-slate-200 px-6 py-2.5 text-sm text-slate-600 transition hover:bg-slate-50 dark:border-white/10 dark:text-slate-300 dark:hover:bg-white/5"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export function AppointmentsClient({
  currentUserId: _currentUserId,
  orgId: _orgId,
}: AppointmentsClientProps) {
  const router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "SCHEDULED" | "COMPLETED" | "CANCELLED">("all");
  const [viewMode, setViewMode] = useState<"calendar" | "list">("calendar");
  const [scheduleType, setScheduleType] = useState<AppointmentType | null>(null);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  useEffect(() => {
    void fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filter !== "all") params.append("status", filter);

      const res = await fetch(`/api/appointments/my?${params.toString()}`);
      if (!res.ok) {
        logger.warn("No appointments found or API unavailable");
        setAppointments([]);
        return;
      }
      const data = await res.json();
      if (data.success) {
        setAppointments(data.data || []);
      } else {
        logger.warn("API returned error:", data.error);
        setAppointments([]);
      }
    } catch (err) {
      logger.error("Failed to fetch appointments:", err);
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (id: string, status: "COMPLETED" | "CANCELLED") => {
    try {
      const res = await fetch("/api/appointments/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      if (!res.ok) throw new Error(`Failed to update appointment`);
      toast.success(status === "COMPLETED" ? "Marked as complete" : "Appointment cancelled");
      void fetchAppointments();
    } catch (err) {
      logger.error("Failed to update appointment:", err);
      toast.error("Failed to update appointment");
    }
  };

  /* Convert to CalendarEvent[] */
  const calendarEvents: CalendarEvent[] = useMemo(
    () =>
      appointments.map((apt) => {
        const d = new Date(apt.scheduledFor);
        return {
          id: apt.id,
          title: apt.title || "Appointment",
          date: d.toISOString().split("T")[0],
          time: d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }),
          status: apt.status || "SCHEDULED",
          type: apt.type || "other",
          meta: {
            location: apt.propertyAddress || apt.location,
            contractor: apt.contractorName,
            claimId: apt.claimId,
            leadId: apt.leadId,
          },
        };
      }),
    [appointments]
  );

  /* Appointments for selected day */
  const selectedDayAppointments = useMemo(() => {
    if (!selectedDate) return [];
    return appointments.filter(
      (apt) => new Date(apt.scheduledFor).toISOString().split("T")[0] === selectedDate
    );
  }, [appointments, selectedDate]);

  /* Stats */
  const stats = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    return {
      total: appointments.length,
      todayCount: appointments.filter(
        (a) => new Date(a.scheduledFor).toISOString().split("T")[0] === today
      ).length,
      scheduled: appointments.filter((a) => a.status === "SCHEDULED").length,
      completed: appointments.filter((a) => a.status === "COMPLETED").length,
    };
  }, [appointments]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-2xl border border-slate-200/60 bg-slate-100/50 dark:border-white/5 dark:bg-white/5"
            />
          ))}
        </div>
        <div className="h-[500px] animate-pulse rounded-2xl border border-slate-200/60 bg-slate-100/50 dark:border-white/5 dark:bg-white/5" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-12 text-center dark:border-red-900/30 dark:bg-red-900/10">
        <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
        <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
          Unable to Load Appointments
        </h3>
        <p className="mb-4 text-sm text-slate-600 dark:text-slate-400">{error}</p>
        <Button
          onClick={() => {
            setLoading(true);
            void fetchAppointments();
          }}
          variant="outline"
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Stats Row ── */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Today",
            value: stats.todayCount,
            icon: <CalendarIcon className="h-5 w-5 text-red-500" />,
            accent: "text-red-600",
          },
          {
            label: "Scheduled",
            value: stats.scheduled,
            icon: <Clock className="h-5 w-5 text-blue-500" />,
            accent: "text-blue-600",
          },
          {
            label: "Completed",
            value: stats.completed,
            icon: <CheckCircle className="h-5 w-5 text-emerald-500" />,
            accent: "text-emerald-600",
          },
          {
            label: "Total",
            value: stats.total,
            icon: <ClipboardCheck className="h-5 w-5 text-slate-500" />,
            accent: "text-slate-600",
          },
        ].map((stat) => (
          <div
            key={stat.label}
            className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60"
          >
            <div className="mb-2 flex items-center gap-2">
              {stat.icon}
              <span className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</span>
            </div>
            <div className={cn("text-3xl font-bold", stat.accent)}>{stat.value}</div>
          </div>
        ))}
      </div>

      {/* ── Quick-Schedule Buttons ── */}
      {scheduleType ? (
        <QuickScheduleForm
          type={scheduleType}
          onClose={() => setScheduleType(null)}
          onSuccess={() => {
            void fetchAppointments();
            router.refresh();
          }}
        />
      ) : (
        <div className="flex flex-wrap gap-3">
          {APPOINTMENT_TYPES.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setScheduleType(t.id)}
                className={cn(
                  "inline-flex items-center gap-2 rounded-xl bg-gradient-to-r px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:shadow-md",
                  t.gradient
                )}
              >
                <Plus className="h-4 w-4" />
                <Icon className="h-4 w-4" />
                {t.label}
              </button>
            );
          })}
        </div>
      )}

      {/* ── Filter + View Toggle ── */}
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60">
          {(["all", "SCHEDULED", "COMPLETED", "CANCELLED"] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                "rounded-lg px-4 py-2 text-xs font-semibold capitalize transition-all",
                filter === f
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
              )}
            >
              {f === "all" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60">
            <button
              onClick={() => setViewMode("calendar")}
              className={cn(
                "px-3.5 py-2 transition-all",
                viewMode === "calendar"
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
              )}
            >
              <CalendarIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={cn(
                "px-3.5 py-2 transition-all",
                viewMode === "list"
                  ? "bg-blue-600 text-white"
                  : "text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
              )}
            >
              <List className="h-4 w-4" />
            </button>
          </div>

          <Button asChild size="sm" className="gap-2">
            <Link href="/appointments/new">
              <Plus className="h-4 w-4" />
              Full Form
            </Link>
          </Button>
        </div>
      </div>

      {/* ── Calendar View ── */}
      {viewMode === "calendar" ? (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[1fr_340px]">
          {/* Calendar */}
          <EventCalendar
            events={calendarEvents}
            statusColors={STATUS_COLORS}
            onDateClick={(date) => {
              setSelectedDate(date.toISOString().split("T")[0]);
            }}
            renderEventTooltip={(event) => {
              const typeMeta = APPOINTMENT_TYPES.find((t) => t.id === event.type);
              const TypeIcon = typeMeta?.icon;
              return (
                <>
                  <div className="mb-1.5 flex items-center gap-2">
                    {TypeIcon && <TypeIcon className="h-3.5 w-3.5 text-slate-500" />}
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                      {event.title}
                    </span>
                  </div>
                  <div className="space-y-1 text-[10px] text-slate-500 dark:text-slate-400">
                    {event.time && <p>🕐 {event.time}</p>}
                    {event.type && (
                      <p>
                        📋 {event.type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())}
                      </p>
                    )}
                    <p>
                      Status:{" "}
                      <span className="font-medium capitalize">{event.status.toLowerCase()}</span>
                    </p>
                    {event.meta?.location && <p>📍 {event.meta.location as string}</p>}
                    {event.meta?.contractor && <p>👷 {event.meta.contractor as string}</p>}
                  </div>
                </>
              );
            }}
            renderEventChip={(event) => {
              const typeColor = TYPE_COLORS[event.type || "other"] || "bg-slate-500";
              return (
                <div className="flex items-center gap-1.5 rounded-md bg-slate-100/80 px-2 py-1 text-[11px] font-medium leading-tight text-slate-700 transition-all hover:ring-1 hover:ring-blue-400/40 dark:bg-white/[0.06] dark:text-slate-300">
                  <span className={cn("h-1.5 w-1.5 shrink-0 rounded-full", typeColor)} />
                  <span className="truncate">{event.title}</span>
                  {event.time && (
                    <span className="ml-auto shrink-0 text-[10px] opacity-50">{event.time}</span>
                  )}
                </div>
              );
            }}
          />

          {/* Right sidebar — Selected Day Details */}
          <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
            <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60">
              <h3 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
                {selectedDate
                  ? new Date(selectedDate + "T12:00:00").toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })
                  : "Select a date"}
              </h3>

              {!selectedDate ? (
                <div className="py-8 text-center">
                  <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="text-sm text-slate-500 dark:text-slate-400">
                    Click a date on the calendar to view details
                  </p>
                </div>
              ) : selectedDayAppointments.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarIcon className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
                  <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
                    No appointments on this date
                  </p>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setScheduleType("inspection")}
                    className="gap-2"
                  >
                    <Plus className="h-3 w-3" />
                    Schedule
                  </Button>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedDayAppointments.map((apt) => {
                    const d = new Date(apt.scheduledFor);
                    const typeColor = TYPE_COLORS[apt.type || "other"] || "bg-slate-500";
                    const statusColor = STATUS_COLORS[apt.status] || STATUS_COLORS.SCHEDULED;
                    return (
                      <div
                        key={apt.id}
                        className="rounded-xl border border-slate-200/60 bg-slate-50/50 p-4 transition hover:border-blue-400/40 dark:border-white/[0.06] dark:bg-white/[0.02]"
                      >
                        <div className="mb-2 flex items-start justify-between gap-2">
                          <div className="flex items-center gap-2">
                            <span className={cn("h-2 w-2 rounded-full", typeColor)} />
                            <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                              {apt.title || "Appointment"}
                            </h4>
                          </div>
                          <span
                            className={cn(
                              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
                              statusColor.bg,
                              statusColor.text
                            )}
                          >
                            {apt.status}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3 w-3" />
                            {d.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </div>
                          {(apt.propertyAddress || apt.location) && (
                            <div className="flex items-center gap-1.5">
                              <MapPin className="h-3 w-3" />
                              <span className="truncate">
                                {apt.propertyAddress || apt.location}
                              </span>
                            </div>
                          )}
                          {apt.contractorName && (
                            <div className="flex items-center gap-1.5">
                              <User className="h-3 w-3" />
                              {apt.contractorName}
                            </div>
                          )}
                        </div>

                        {apt.status === "SCHEDULED" && (
                          <div className="mt-3 flex gap-2">
                            <button
                              onClick={() => handleStatusUpdate(apt.id, "COMPLETED")}
                              className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-2.5 py-1.5 text-[11px] font-semibold text-white transition hover:bg-emerald-700"
                            >
                              <CheckCircle className="h-3 w-3" />
                              Complete
                            </button>
                            <button
                              onClick={() => handleStatusUpdate(apt.id, "CANCELLED")}
                              className="inline-flex items-center gap-1 rounded-lg border border-red-300 px-2.5 py-1.5 text-[11px] font-medium text-red-600 transition hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                            >
                              <XCircle className="h-3 w-3" />
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Type Legend */}
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-sm dark:border-white/[0.08] dark:bg-slate-900/60">
              <h4 className="mb-3 text-xs font-semibold text-slate-500 dark:text-slate-400">
                Appointment Types
              </h4>
              <div className="space-y-2">
                {APPOINTMENT_TYPES.map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <span className={cn("h-2 w-2 rounded-full", TYPE_COLORS[t.id])} />
                    <span className="text-xs text-slate-600 dark:text-slate-400">{t.label}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* ── List View ── */
        <div className="space-y-3">
          {appointments.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-16 text-center dark:border-white/10 dark:bg-slate-900/60">
              <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/30 dark:to-indigo-900/30">
                <CalendarIcon className="h-10 w-10 text-blue-600" />
              </div>
              <h3 className="mb-2 text-lg font-semibold text-slate-900 dark:text-white">
                {filter === "all"
                  ? "No appointments yet"
                  : `No ${filter.toLowerCase()} appointments`}
              </h3>
              <p className="mb-6 text-sm text-slate-500 dark:text-slate-400">
                Schedule inspections, follow-ups, and final walkthroughs to keep your jobs on track.
              </p>
              <Button onClick={() => setScheduleType("inspection")} size="lg" className="gap-2">
                <Plus className="h-4 w-4" />
                Schedule Appointment
              </Button>
            </div>
          ) : (
            appointments.map((apt) => {
              const d = new Date(apt.scheduledFor);
              const typeColor = TYPE_COLORS[apt.type || "other"] || "bg-slate-500";
              const statusColor = STATUS_COLORS[apt.status] || STATUS_COLORS.SCHEDULED;
              const isToday =
                d.toISOString().split("T")[0] === new Date().toISOString().split("T")[0];

              return (
                <div
                  key={apt.id}
                  className={cn(
                    "flex items-center gap-4 rounded-2xl border bg-white p-5 shadow-sm transition hover:border-blue-400/40 dark:bg-slate-900/60",
                    isToday
                      ? "border-blue-400/40 dark:border-blue-500/20"
                      : "border-slate-200/80 dark:border-white/[0.08]"
                  )}
                >
                  {/* Date badge */}
                  <div
                    className={cn(
                      "flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl border text-center",
                      isToday
                        ? "border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-900/30"
                        : "border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-white/5"
                    )}
                  >
                    <span className="text-[10px] font-semibold uppercase text-slate-500 dark:text-slate-400">
                      {d.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                    <span
                      className={cn(
                        "text-lg font-bold leading-tight",
                        isToday ? "text-blue-600" : "text-slate-800 dark:text-slate-100"
                      )}
                    >
                      {d.getDate()}
                    </span>
                  </div>

                  {/* Content */}
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", typeColor)} />
                      <h4 className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                        {apt.title || "Appointment"}
                      </h4>
                      <span
                        className={cn(
                          "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold",
                          statusColor.bg,
                          statusColor.text
                        )}
                      >
                        {apt.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-slate-500 dark:text-slate-400">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                      </span>
                      {(apt.propertyAddress || apt.location) && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="h-3 w-3" />
                          {apt.propertyAddress || apt.location}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  {apt.status === "SCHEDULED" && (
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        onClick={() => handleStatusUpdate(apt.id, "COMPLETED")}
                        className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-semibold text-white transition hover:bg-emerald-700"
                      >
                        <CheckCircle className="h-3 w-3" />
                        Complete
                      </button>
                      <button
                        onClick={() => {
                          if (confirm("Cancel this appointment?"))
                            void handleStatusUpdate(apt.id, "CANCELLED");
                        }}
                        className="rounded-lg border border-slate-200 p-2 text-slate-400 transition hover:border-red-300 hover:text-red-500 dark:border-white/10"
                      >
                        <XCircle className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
