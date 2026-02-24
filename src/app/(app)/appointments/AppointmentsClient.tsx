"use client";

import { AlertCircle, Calendar as CalendarIcon, List, Plus } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AppointmentCard } from "@/components/appointments/AppointmentCard";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { logger } from "@/lib/logger";

interface AppointmentsClientProps {
  currentUserId: string;
  orgId: string;
}

export function AppointmentsClient({
  currentUserId: _currentUserId,
  orgId: _orgId,
}: AppointmentsClientProps) {
  const _router = useRouter();
  const [appointments, setAppointments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<"all" | "SCHEDULED" | "COMPLETED" | "CANCELLED">("all");
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  useEffect(() => {
    // Reset to list view when switching to Completed/Cancelled tabs
    if (filter === "COMPLETED" || filter === "CANCELLED") {
      setViewMode("list");
    }
    void fetchAppointments();
  }, [filter]);

  const fetchAppointments = async () => {
    try {
      setError(null);
      const params = new URLSearchParams();
      if (filter !== "all") {
        params.append("status", filter);
      }

      const res = await fetch(`/api/appointments/my?${params.toString()}`);
      if (!res.ok) {
        // Treat 404 or errors as "no data yet" instead of hard error
        logger.warn("No appointments found or API unavailable");
        setAppointments([]);
        return;
      }

      const data = await res.json();
      if (data.success) {
        setAppointments(data.data || []);
      } else {
        // Soft fail - show empty state
        logger.warn("API returned error:", data.error);
        setAppointments([]);
      }
    } catch (error) {
      logger.error("Failed to fetch appointments:", error);
      // Soft fail - show empty state instead of error banner
      setAppointments([]);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (_id: string) => {
    // TODO: Open edit modal
    toast.info("Edit modal coming soon");
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Are you sure you want to cancel this appointment?")) return;

    try {
      const res = await fetch("/api/appointments/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "CANCELLED" }),
      });

      if (!res.ok) throw new Error("Failed to cancel appointment");

      toast.success("Appointment cancelled");
      void fetchAppointments();
    } catch (error) {
      logger.error("Failed to cancel appointment:", error);
      toast.error("Failed to cancel appointment");
    }
  };

  const handleComplete = async (id: string) => {
    try {
      const res = await fetch("/api/appointments/update", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "COMPLETED" }),
      });

      if (!res.ok) throw new Error("Failed to mark appointment as complete");

      toast.success("Appointment marked as complete");
      void fetchAppointments();
    } catch (error) {
      logger.error("Failed to complete appointment:", error);
      toast.error("Failed to complete appointment");
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-10 w-full max-w-md animate-pulse rounded-lg bg-slate-200" />
          <div className="h-10 w-40 animate-pulse rounded-lg bg-slate-200" />
        </div>
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="rounded-2xl">
              <CardContent className="p-6">
                <div className="space-y-3">
                  <div className="h-6 w-3/4 animate-pulse rounded bg-slate-200" />
                  <div className="h-4 w-1/2 animate-pulse rounded bg-slate-100" />
                  <div className="h-4 w-full animate-pulse rounded bg-slate-100" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <Card className="rounded-2xl border-red-200 bg-red-50">
        <CardContent className="py-12 text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <h3 className="mb-2 text-lg font-semibold text-slate-900">Unable to Load Appointments</h3>
          <p className="mb-4 text-sm text-slate-600">{error}</p>
          <Button
            onClick={() => {
              setLoading(true);
              void fetchAppointments();
            }}
            variant="outline"
          >
            Try Again
          </Button>
        </CardContent>
      </Card>
    );
  }

  const isHistoryView = filter === "COMPLETED" || filter === "CANCELLED";

  const groupedAppointments = appointments.reduce(
    (acc, apt) => {
      const date = new Date(apt.scheduledFor);
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(tomorrow.getDate() + 1);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (isHistoryView) {
        // For completed/cancelled — group by recency (past-oriented)
        if (date.toDateString() === today.toDateString()) {
          acc.today.push(apt);
        } else if (date.toDateString() === yesterday.toDateString()) {
          acc.yesterday.push(apt);
        } else if (date > new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000) && date < today) {
          acc.thisWeek.push(apt);
        } else {
          acc.older.push(apt);
        }
      } else {
        // For all/scheduled — group by upcoming (future-oriented)
        if (date.toDateString() === today.toDateString()) {
          acc.today.push(apt);
        } else if (date.toDateString() === tomorrow.toDateString()) {
          acc.tomorrow.push(apt);
        } else if (date > tomorrow && date < new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)) {
          acc.thisWeek.push(apt);
        } else {
          acc.later.push(apt);
        }
      }

      return acc;
    },
    {
      today: [],
      yesterday: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      older: [],
    } as Record<string, any[]>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Tabs value={filter} onValueChange={(v: any) => setFilter(v)} className="flex-1">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="SCHEDULED">Scheduled</TabsTrigger>
            <TabsTrigger value="COMPLETED">Completed</TabsTrigger>
            <TabsTrigger value="CANCELLED">Cancelled</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-2">
          {(filter === "all" || filter === "SCHEDULED") && (
            <div className="flex rounded-lg border p-1">
              <Button
                variant={viewMode === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("list")}
                className="px-3"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === "calendar" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewMode("calendar")}
                className="px-3"
              >
                <CalendarIcon className="h-4 w-4" />
              </Button>
            </div>
          )}

          <Button asChild>
            <Link href="/appointments/new">
              <Plus className="mr-2 h-4 w-4" />
              New Appointment
            </Link>
          </Button>
        </div>
      </div>

      {appointments.length === 0 ? (
        <Card className="rounded-2xl border-dashed">
          <CardContent className="py-16 text-center">
            <div className="mx-auto mb-4 flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-blue-50 to-indigo-50">
              <CalendarIcon className="h-10 w-10 text-blue-600" />
            </div>
            <h3 className="mb-2 text-lg font-semibold text-slate-900">
              {filter === "all" ? "No appointments yet" : `No ${filter.toLowerCase()} appointments`}
            </h3>
            <p className="mb-6 text-sm text-slate-600">
              {filter === "all"
                ? "Schedule inspections, client meetings, and site visits to keep your projects on track."
                : `You don't have any ${filter.toLowerCase()} appointments at this time.`}
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/appointments/new">
                <Plus className="h-4 w-4" />
                Schedule Appointment
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : viewMode === "calendar" && !isHistoryView ? (
        <CalendarView
          appointments={appointments}
          selectedDate={selectedDate}
          setSelectedDate={setSelectedDate}
          onEdit={handleEdit}
          onCancel={handleCancel}
          onComplete={handleComplete}
        />
      ) : (
        <div className="space-y-8">
          {groupedAppointments.today.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-red-500" />
                <h3 className="text-lg font-semibold text-slate-900">Today</h3>
                <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-medium text-red-700">
                  {groupedAppointments.today.length}
                </span>
              </div>
              {groupedAppointments.today.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  {...apt}
                  scheduledFor={new Date(apt.scheduledFor)}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}

          {/* Past-oriented groups for completed/cancelled */}
          {isHistoryView && groupedAppointments.yesterday.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <h3 className="text-lg font-semibold text-slate-900">Yesterday</h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {groupedAppointments.yesterday.length}
                </span>
              </div>
              {groupedAppointments.yesterday.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  {...apt}
                  scheduledFor={new Date(apt.scheduledFor)}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}

          {/* Future-oriented groups for all/scheduled */}
          {!isHistoryView && groupedAppointments.tomorrow.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                <h3 className="text-lg font-semibold text-slate-900">Tomorrow</h3>
                <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                  {groupedAppointments.tomorrow.length}
                </span>
              </div>
              {groupedAppointments.tomorrow.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  {...apt}
                  scheduledFor={new Date(apt.scheduledFor)}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}

          {groupedAppointments.thisWeek.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-blue-500" />
                <h3 className="text-lg font-semibold text-slate-900">
                  {isHistoryView ? "Past 7 Days" : "This Week"}
                </h3>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700">
                  {groupedAppointments.thisWeek.length}
                </span>
              </div>
              {groupedAppointments.thisWeek.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  {...apt}
                  scheduledFor={new Date(apt.scheduledFor)}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}

          {!isHistoryView && groupedAppointments.later.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900">Later</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {groupedAppointments.later.length}
                </span>
              </div>
              {groupedAppointments.later.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  {...apt}
                  scheduledFor={new Date(apt.scheduledFor)}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}

          {isHistoryView && groupedAppointments.older.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <div className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                <h3 className="text-lg font-semibold text-slate-900">Older</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                  {groupedAppointments.older.length}
                </span>
              </div>
              {groupedAppointments.older.map((apt) => (
                <AppointmentCard
                  key={apt.id}
                  {...apt}
                  scheduledFor={new Date(apt.scheduledFor)}
                  onEdit={handleEdit}
                  onCancel={handleCancel}
                  onComplete={handleComplete}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// Calendar View Component
function CalendarView({
  appointments,
  selectedDate,
  setSelectedDate,
  onEdit,
  onCancel,
  onComplete,
}: {
  appointments: any[];
  selectedDate: Date | undefined;
  setSelectedDate: (date: Date | undefined) => void;
  onEdit: (id: string) => void;
  onCancel: (id: string) => void;
  onComplete: (id: string) => void;
}) {
  // Get the current viewing month from selected date or today
  const viewingMonth = selectedDate || new Date();
  const monthStart = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth(), 1);
  const monthEnd = new Date(viewingMonth.getFullYear(), viewingMonth.getMonth() + 1, 0);

  // Filter appointments for selected date
  const selectedDateAppointments = selectedDate
    ? appointments.filter(
        (apt) => new Date(apt.scheduledFor).toDateString() === selectedDate.toDateString()
      )
    : [];

  // Get all appointments for the current month
  const monthAppointments = appointments
    .filter((apt) => {
      const aptDate = new Date(apt.scheduledFor);
      return aptDate >= monthStart && aptDate <= monthEnd;
    })
    .sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());

  // Custom day render to show appointment indicators
  const modifiers = {
    hasAppointment: appointments.map((apt) => new Date(apt.scheduledFor)),
  };

  const modifiersStyles = {
    hasAppointment: {
      backgroundColor: "rgb(34 197 94 / 0.25)",
      borderRadius: "50%",
      border: "2px solid rgb(34 197 94 / 0.5)",
    },
  };

  return (
    <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[350px_1fr]">
      {/* Calendar */}
      <div className="space-y-4 lg:sticky lg:top-24 lg:z-10 lg:self-start">
        <Card>
          <CardContent className="p-4">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              modifiers={modifiers}
              modifiersStyles={modifiersStyles}
              className="rounded-md"
            />
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-500">
              <div className="h-3 w-3 rounded-full border border-green-500 bg-green-400" />
              <span>Has appointments</span>
            </div>
          </CardContent>
        </Card>

        {/* Month Summary */}
        <Card>
          <CardContent className="p-4">
            <h4 className="mb-3 font-medium text-slate-900">
              {viewingMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}{" "}
              Overview
            </h4>
            <div className="space-y-1 text-sm text-slate-600">
              <div className="flex justify-between">
                <span>Total Appointments:</span>
                <span className="font-medium">{monthAppointments.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Upcoming:</span>
                <span className="font-medium text-blue-600">
                  {monthAppointments.filter((a) => new Date(a.scheduledFor) >= new Date()).length}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Right Side - Selected Date or Month List */}
      <div className="space-y-4">
        {selectedDate ? (
          <>
            {/* Selected Date Header */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                {selectedDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </h3>
              <div className="flex items-center gap-2">
                <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                  {selectedDateAppointments.length} appointment
                  {selectedDateAppointments.length !== 1 ? "s" : ""}
                </span>
                <button
                  onClick={() => setSelectedDate(undefined)}
                  className="text-sm text-blue-600 hover:underline"
                >
                  View all month
                </button>
              </div>
            </div>

            {/* Selected Date Appointments */}
            {selectedDateAppointments.length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <h4 className="mb-2 font-medium text-slate-900">No appointments</h4>
                  <p className="text-sm text-slate-500">No appointments scheduled for this date.</p>
                  <Button asChild className="mt-4">
                    <Link href="/appointments/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Schedule Appointment
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {selectedDateAppointments
                  .sort(
                    (a, b) =>
                      new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime()
                  )
                  .map((apt) => (
                    <AppointmentCard
                      key={apt.id}
                      {...apt}
                      scheduledFor={new Date(apt.scheduledFor)}
                      onEdit={onEdit}
                      onCancel={onCancel}
                      onComplete={onComplete}
                    />
                  ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Month View - All Appointments */}
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-slate-900">
                All Appointments in {viewingMonth.toLocaleDateString("en-US", { month: "long" })}
              </h3>
              <span className="rounded-full bg-blue-100 px-3 py-1 text-sm font-medium text-blue-700">
                {monthAppointments.length} total
              </span>
            </div>

            {monthAppointments.length === 0 ? (
              <Card className="rounded-2xl border-dashed">
                <CardContent className="py-12 text-center">
                  <CalendarIcon className="mx-auto mb-4 h-12 w-12 text-slate-300" />
                  <h4 className="mb-2 font-medium text-slate-900">No appointments this month</h4>
                  <p className="text-sm text-slate-500">
                    Click on a date to schedule an appointment.
                  </p>
                  <Button asChild className="mt-4">
                    <Link href="/appointments/new">
                      <Plus className="mr-2 h-4 w-4" />
                      Schedule Appointment
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="max-h-[60vh] space-y-3 overflow-y-auto pr-2">
                {monthAppointments.map((apt) => {
                  const aptDate = new Date(apt.scheduledFor);
                  const isToday = aptDate.toDateString() === new Date().toDateString();
                  const isPast = aptDate < new Date();

                  return (
                    <div
                      key={apt.id}
                      className={`cursor-pointer rounded-lg border p-4 transition hover:border-blue-400 hover:shadow-sm ${
                        isToday
                          ? "border-blue-500 bg-blue-50"
                          : isPast
                            ? "border-slate-200 bg-slate-50"
                            : "border-slate-200 bg-white"
                      }`}
                      onClick={() => setSelectedDate(aptDate)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-slate-900">
                            {apt.title || "Appointment"}
                          </h4>
                          <p className="text-sm text-slate-600">
                            {apt.claimNumber && <span className="mr-2">#{apt.claimNumber}</span>}
                            {apt.propertyAddress && <span>{apt.propertyAddress}</span>}
                          </p>
                        </div>
                        <div className="text-right">
                          <p
                            className={`text-sm font-medium ${isToday ? "text-blue-600" : "text-slate-700"}`}
                          >
                            {aptDate.toLocaleDateString("en-US", {
                              weekday: "short",
                              month: "short",
                              day: "numeric",
                            })}
                          </p>
                          <p className="text-xs text-slate-500">
                            {aptDate.toLocaleTimeString("en-US", {
                              hour: "numeric",
                              minute: "2-digit",
                            })}
                          </p>
                        </div>
                      </div>
                      {apt.status && (
                        <div className="mt-2">
                          <span
                            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              apt.status === "SCHEDULED"
                                ? "bg-blue-100 text-blue-700"
                                : apt.status === "COMPLETED"
                                  ? "bg-green-100 text-green-700"
                                  : "bg-slate-100 text-slate-700"
                            }`}
                          >
                            {apt.status}
                          </span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
