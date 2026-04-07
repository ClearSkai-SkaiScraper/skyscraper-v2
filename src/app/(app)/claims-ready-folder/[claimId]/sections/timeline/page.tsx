// src/app/(app)/claims-ready-folder/[claimId]/sections/timeline/page.tsx
"use client";

import { Calendar, Clock } from "lucide-react";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { logger } from "@/lib/logger";

interface TimelineEvent {
  id: string;
  date: string;
  event: string;
  category: "loss" | "inspection" | "weather" | "claim" | "adjuster" | "supplement" | "other";
  details?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  loss: "bg-red-500",
  inspection: "bg-blue-500",
  weather: "bg-amber-500",
  claim: "bg-green-500",
  adjuster: "bg-purple-500",
  supplement: "bg-orange-500",
  other: "bg-slate-500",
};

const CATEGORY_LABELS: Record<string, string> = {
  loss: "Loss Event",
  inspection: "Inspection",
  weather: "Weather",
  claim: "Claim Activity",
  adjuster: "Adjuster",
  supplement: "Supplement",
  other: "Other",
};

export default function TimelinePage() {
  const params = useParams();
  const claimId = Array.isArray(params?.claimId) ? params.claimId[0] : params?.claimId;

  const [events, setEvents] = useState<TimelineEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    if (!claimId) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/claims-folder/sections/timeline?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        // Handle both direct events array and nested data.events
        const eventsData = json.events || json.data?.events || [];
        setEvents(eventsData);
      }
    } catch (err) {
      logger.error("Failed to fetch timeline:", err);
    } finally {
      setLoading(false);
    }
  }, [claimId]);

  useEffect(() => {
    void fetchEvents();
  }, [fetchEvents]);

  if (loading) {
    return (
      <div className="mx-auto max-w-4xl space-y-6">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-[600px] w-full" />
      </div>
    );
  }

  // Sort events by date
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Calendar className="h-6 w-6 text-indigo-600" />
            <h1 className="text-2xl font-bold">Timeline of Events</h1>
          </div>
          <p className="text-slate-500">Chronological claim history</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline">Section 12 of 17</Badge>
          <Badge variant="secondary">{events.length} Events</Badge>
        </div>
      </div>

      {/* Category Legend */}
      <Card>
        <CardContent className="flex flex-wrap gap-3 pt-6">
          {Object.entries(CATEGORY_LABELS).map(([key, label]) => (
            <div key={key} className="flex items-center gap-2 text-sm">
              <span className={`h-3 w-3 rounded-full ${CATEGORY_COLORS[key]}`} />
              <span>{label}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Event Timeline
          </CardTitle>
          <CardDescription>All documented events related to this claim</CardDescription>
        </CardHeader>
        <CardContent>
          {sortedEvents.length > 0 ? (
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-4 top-0 h-full w-0.5 bg-slate-200 dark:bg-slate-700" />

              <div className="space-y-6">
                {sortedEvents.map((event, index) => (
                  <div key={event.id || index} className="relative flex gap-4 pl-10">
                    {/* Timeline dot */}
                    <div
                      className={`absolute left-2.5 top-1.5 h-3 w-3 rounded-full ring-4 ring-white dark:ring-slate-900 ${
                        CATEGORY_COLORS[event.category]
                      }`}
                    />

                    {/* Event content */}
                    <div className="flex-1 rounded-lg border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-700 dark:bg-slate-800">
                      <div className="mb-2 flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {CATEGORY_LABELS[event.category]}
                        </Badge>
                        <span className="text-sm text-slate-500">
                          {new Date(event.date).toLocaleDateString("en-US", {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </span>
                      </div>
                      <h4 className="font-medium">{event.event}</h4>
                      {event.details && (
                        <p className="mt-1 text-sm text-slate-600 dark:text-slate-400">
                          {event.details}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center text-slate-500">
              <Calendar className="mx-auto mb-4 h-12 w-12 text-slate-300" />
              <h3 className="mb-2 text-lg font-medium">No Events Recorded</h3>
              <p className="mx-auto mb-4 max-w-md text-sm">
                Timeline events are automatically populated from claim activities, weather data, and
                inspections.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Print Preview */}
      {sortedEvents.length > 0 && (
        <Card className="border-indigo-200 bg-indigo-50 dark:border-indigo-900 dark:bg-indigo-950">
          <CardHeader>
            <CardTitle>Timeline Summary for Print</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-slate-200 bg-white p-6 font-mono text-sm dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-4 text-center font-bold uppercase tracking-wide">
                Claim Event Timeline
              </div>
              <hr className="my-4" />
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="pb-2 text-left">Date</th>
                    <th className="pb-2 text-left">Category</th>
                    <th className="pb-2 text-left">Event</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedEvents.map((event, index) => (
                    <tr key={event.id || index} className="border-b border-dotted">
                      <td className="py-2 pr-4">{new Date(event.date).toLocaleDateString()}</td>
                      <td className="py-2 pr-4 capitalize">{event.category}</td>
                      <td className="py-2">{event.event}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
