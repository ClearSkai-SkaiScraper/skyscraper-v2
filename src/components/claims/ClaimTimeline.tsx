/**
 * ClaimTimeline Component
 *
 * Visual timeline showing storm event → claim creation → inspection → report → submission
 * with weather correlation data integrated
 */

"use client";

import { format, formatDistanceToNow } from "date-fns";
import {
  AlertCircle,
  Camera,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Cloud,
  CloudLightning,
  CloudRain,
  FileText,
  Loader2,
  Send,
  Thermometer,
  Wind,
  Zap,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { cn } from "@/lib/utils";

export interface TimelineEvent {
  id: string;
  type:
    | "storm_event"
    | "claim_created"
    | "inspection"
    | "photos_uploaded"
    | "report_generated"
    | "supplement_submitted"
    | "payment_received"
    | "status_change"
    | "weather_verified";
  title: string;
  description?: string;
  occurredAt: Date;
  metadata?: {
    weatherData?: {
      peril?: string;
      hailSize?: number;
      windSpeed?: number;
      confidence?: number;
    };
    amount?: number;
    status?: string;
    photoCount?: number;
    correlationScore?: number;
  };
  status?: "completed" | "in_progress" | "pending" | "warning";
}

interface ClaimTimelineProps {
  claimId: string;
  events?: TimelineEvent[];
  loading?: boolean;
  showWeatherCorrelation?: boolean;
  compact?: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const eventIcons: Record<TimelineEvent["type"], React.ComponentType<any>> = {
  storm_event: CloudLightning,
  claim_created: FileText,
  inspection: Camera,
  photos_uploaded: Camera,
  report_generated: FileText,
  supplement_submitted: Send,
  payment_received: CheckCircle2,
  status_change: Clock,
  weather_verified: Cloud,
};

const eventColors: Record<TimelineEvent["type"], string> = {
  storm_event: "text-yellow-500 bg-yellow-500/10",
  claim_created: "text-blue-500 bg-blue-500/10",
  inspection: "text-purple-500 bg-purple-500/10",
  photos_uploaded: "text-green-500 bg-green-500/10",
  report_generated: "text-indigo-500 bg-indigo-500/10",
  supplement_submitted: "text-orange-500 bg-orange-500/10",
  payment_received: "text-emerald-500 bg-emerald-500/10",
  status_change: "text-slate-500 bg-slate-500/10",
  weather_verified: "text-cyan-500 bg-cyan-500/10",
};

export function ClaimTimeline({
  claimId,
  events: propEvents,
  loading = false,
  showWeatherCorrelation = true,
  compact = false,
}: ClaimTimelineProps) {
  const [events, setEvents] = useState<TimelineEvent[]>(propEvents || []);
  const [isLoading, setIsLoading] = useState(loading);
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!propEvents && claimId) {
      void fetchTimelineEvents();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId, propEvents]);

  async function fetchTimelineEvents() {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/timeline`);
      if (response.ok) {
        const data = await response.json();
        setEvents(data.events || []);
      }
    } catch (error) {
      console.error("Failed to fetch timeline events:", error);
    } finally {
      setIsLoading(false);
    }
  }

  function toggleExpand(eventId: string) {
    setExpandedEvents((prev) => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-muted-foreground">Loading timeline...</span>
        </CardContent>
      </Card>
    );
  }

  if (events.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-8 text-center">
          <Clock className="mb-2 h-10 w-10 text-muted-foreground/50" />
          <p className="text-muted-foreground">No timeline events yet</p>
          <p className="text-sm text-muted-foreground/70">
            Events will appear as the claim progresses
          </p>
        </CardContent>
      </Card>
    );
  }

  // Sort events by date (newest first for display, but we'll reverse for timeline)
  const sortedEvents = [...events].sort(
    (a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime()
  );

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg">
          <Clock className="h-5 w-5" />
          Claim Timeline
          {showWeatherCorrelation && (
            <Badge variant="outline" className="ml-auto text-xs">
              Weather Correlated
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="relative">
          {/* Timeline line */}
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <div className="absolute bottom-0 left-4 top-0 w-0.5 bg-border" />

          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <div className="space-y-4">
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            {sortedEvents.map((event, index) => {
              const Icon = eventIcons[event.type] || Clock;
              const colorClass = eventColors[event.type] || "text-slate-500 bg-slate-500/10";
              const isExpanded = expandedEvents.has(event.id);
              const hasDetails = event.metadata && Object.keys(event.metadata).length > 0;

              return (
                <div key={event.id} className="relative pl-10">
                  {/* Event icon */}
                  <div
                    className={cn(
                      "absolute left-0 flex h-8 w-8 items-center justify-center rounded-full",
                      colorClass
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  {/* Event content */}
                  <Collapsible open={isExpanded} onOpenChange={() => toggleExpand(event.id)}>
                    <div
                      className={cn(
                        "rounded-lg border p-3 transition-colors",
                        event.status === "warning" && "border-yellow-500/50 bg-yellow-500/5",
                        event.status === "in_progress" && "border-blue-500/50 bg-blue-500/5"
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <h4 className="text-sm font-medium">{event.title}</h4>
                            {event.status === "warning" && (
                              <AlertCircle className="h-4 w-4 text-yellow-500" />
                            )}
                            {event.type === "storm_event" && event.metadata?.weatherData && (
                              <Badge variant="secondary" className="text-xs">
                                {event.metadata.weatherData.peril || "Storm"}
                              </Badge>
                            )}
                          </div>
                          {!compact && event.description && (
                            <p className="mt-1 text-sm text-muted-foreground">
                              {event.description}
                            </p>
                          )}
                          <p className="mt-1 text-xs text-muted-foreground">
                            {format(new Date(event.occurredAt), "MMM d, yyyy 'at' h:mm a")}
                            <span className="mx-1">•</span>
                            {formatDistanceToNow(new Date(event.occurredAt), { addSuffix: true })}
                          </p>
                        </div>

                        {hasDetails && (
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              {isExpanded ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        )}
                      </div>

                      {/* Expanded details */}
                      <CollapsibleContent>
                        {event.metadata && (
                          <div className="mt-3 space-y-2 border-t pt-3">
                            {event.metadata.weatherData && (
                              <div className="grid grid-cols-2 gap-2 text-sm">
                                {event.metadata.weatherData.hailSize && (
                                  <div className="flex items-center gap-2">
                                    <CloudRain className="h-4 w-4 text-blue-500" />
                                    <span>Hail: {event.metadata.weatherData.hailSize}&quot;</span>
                                  </div>
                                )}
                                {event.metadata.weatherData.windSpeed && (
                                  <div className="flex items-center gap-2">
                                    <Wind className="h-4 w-4 text-cyan-500" />
                                    <span>Wind: {event.metadata.weatherData.windSpeed} mph</span>
                                  </div>
                                )}
                                {event.metadata.weatherData.confidence !== undefined && (
                                  <div className="flex items-center gap-2">
                                    <Zap className="h-4 w-4 text-yellow-500" />
                                    <span>
                                      Confidence:{" "}
                                      {Math.round(event.metadata.weatherData.confidence * 100)}%
                                    </span>
                                  </div>
                                )}
                              </div>
                            )}
                            {event.metadata.correlationScore !== undefined && (
                              <div className="flex items-center gap-2 text-sm">
                                <Thermometer className="h-4 w-4 text-orange-500" />
                                <span>
                                  Photo-Weather Correlation: {event.metadata.correlationScore}%
                                </span>
                                {event.metadata.correlationScore < 50 && (
                                  <Badge variant="destructive" className="text-xs">
                                    Review Needed
                                  </Badge>
                                )}
                              </div>
                            )}
                            {event.metadata.photoCount && (
                              <div className="flex items-center gap-2 text-sm">
                                <Camera className="h-4 w-4 text-purple-500" />
                                <span>{event.metadata.photoCount} photos uploaded</span>
                              </div>
                            )}
                            {event.metadata.amount && (
                              <div className="flex items-center gap-2 text-sm">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <span>${event.metadata.amount.toLocaleString()}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                </div>
              );
            })}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Compact inline timeline for claim cards
 */
export function ClaimTimelineInline({ events }: { events: TimelineEvent[] }) {
  const sortedEvents = [...events]
    .sort((a, b) => new Date(a.occurredAt).getTime() - new Date(b.occurredAt).getTime())
    .slice(-5); // Last 5 events

  return (
    <div className="flex items-center gap-1">
      {sortedEvents.map((event, index) => {
        const Icon = eventIcons[event.type] || Clock;
        const colorClass = eventColors[event.type] || "text-slate-500";

        return (
          <div
            key={event.id}
            className="group relative"
            title={`${event.title} - ${format(new Date(event.occurredAt), "MMM d, yyyy")}`}
          >
            <div
              className={cn(
                "flex h-6 w-6 items-center justify-center rounded-full bg-muted/50",
                colorClass
              )}
            >
              <Icon className="h-3 w-3" />
            </div>
            {index < sortedEvents.length - 1 && (
              <div className="absolute left-full top-1/2 h-0.5 w-1 bg-border" />
            )}
          </div>
        );
      })}
    </div>
  );
}

export default ClaimTimeline;
