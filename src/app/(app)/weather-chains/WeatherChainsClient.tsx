"use client";

import { CloudLightning, CloudRain, Loader2, Search, Thermometer, Wind } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WeatherEvent {
  date: string;
  type: string;
  severity: "low" | "moderate" | "severe" | "extreme";
  description: string;
  details?: string;
}

const SEVERITY_STYLES: Record<string, string> = {
  low: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300",
  moderate: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300",
  severe: "bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300",
  extreme: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

const TYPE_ICONS: Record<string, React.ReactNode> = {
  hail: <CloudRain className="h-4 w-4" />,
  wind: <Wind className="h-4 w-4" />,
  lightning: <CloudLightning className="h-4 w-4" />,
  tornado: <Wind className="h-4 w-4" />,
  heat: <Thermometer className="h-4 w-4" />,
};

export function WeatherChainsClient() {
  const [address, setAddress] = useState("");
  const [years, setYears] = useState("5");
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<WeatherEvent[] | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  const handleGenerate = async () => {
    if (!address.trim()) {
      toast.error("Please enter a property address");
      return;
    }

    setLoading(true);
    setEvents(null);
    setSummary(null);

    try {
      const res = await fetch("/api/weather-chains", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ address: address.trim(), years: parseInt(years) }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to generate weather chain");
      }

      const data = await res.json();
      setEvents(data.events || []);
      setSummary(data.summary || null);
    } catch (error) {
      toast.error(String(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Query Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Storm History Lookup</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-[1fr_160px_auto]">
            <div>
              <Label htmlFor="address">Property Address</Label>
              <Input
                id="address"
                placeholder="123 Main St, Phoenix, AZ 85001"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleGenerate()}
              />
            </div>
            <div>
              <Label htmlFor="years">Historical Span</Label>
              <Select value={years} onValueChange={setYears}>
                <SelectTrigger id="years">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 year</SelectItem>
                  <SelectItem value="3">3 years</SelectItem>
                  <SelectItem value="5">5 years</SelectItem>
                  <SelectItem value="10">10 years</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={handleGenerate} disabled={loading || !address.trim()}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Searching…
                  </>
                ) : (
                  <>
                    <Search className="mr-2 h-4 w-4" />
                    Generate
                  </>
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {events !== null && (
        <div className="space-y-4">
          {/* Summary */}
          {summary && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-900 dark:bg-blue-950/20">
              <CardContent className="py-4">
                <p className="text-sm text-blue-900 dark:text-blue-200">{summary}</p>
              </CardContent>
            </Card>
          )}

          {/* Event Timeline */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Event Timeline ({events.length} event{events.length !== 1 ? "s" : ""})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {events.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">
                  No significant weather events found for this address and time period.
                </p>
              ) : (
                <div className="space-y-3">
                  {events.map((event, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-3 rounded-lg border border-border p-3"
                    >
                      <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                        {TYPE_ICONS[event.type.toLowerCase()] || <CloudRain className="h-4 w-4" />}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{event.description}</span>
                          <span
                            className={`rounded-full px-2 py-0.5 text-xs font-medium ${SEVERITY_STYLES[event.severity] || SEVERITY_STYLES.moderate}`}
                          >
                            {event.severity}
                          </span>
                        </div>
                        <p className="text-xs text-muted-foreground">{event.date}</p>
                        {event.details && (
                          <p className="mt-1 text-xs text-slate-600 dark:text-slate-400">
                            {event.details}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* How It Works */}
      {events === null && !loading && (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <CloudRain className="mx-auto mb-3 h-10 w-10 text-slate-400" />
            <h3 className="mb-2 text-sm font-semibold">How Weather Chains Work</h3>
            <p className="mx-auto max-w-md text-xs text-muted-foreground">
              Enter a property address to research historical storm events. The AI analyzes NOAA
              data, local weather station records, and storm reports to build a causation timeline
              that supports insurance claims.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
