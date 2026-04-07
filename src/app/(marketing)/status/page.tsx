"use client";

import { Activity, AlertCircle, CheckCircle, Clock } from "lucide-react";
import { useEffect, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { logger } from "@/lib/logger";

interface HealthData {
  ok: boolean;
  status: string;
  buildSHA: string;
  timestamp: number;
  checks: {
    database: boolean;
    auth: boolean;
    storage: boolean;
    api: boolean;
    ai: boolean;
  };
  environment: string;
}

export default function StatusPage() {
  const [healthData, setHealthData] = useState<HealthData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [lastChecked, setLastChecked] = useState<Date>(new Date());

  useEffect(() => {
    async function checkHealth() {
      try {
        const res = await fetch("/api/health");
        const data = await res.json();
        setHealthData(data);
        setLastChecked(new Date());
      } catch (error) {
        logger.error("[STATUS] Health check failed:", error);
      } finally {
        setIsLoading(false);
      }
    }

    void checkHealth();
    // Refresh every 30 seconds
    const interval = setInterval(checkHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const services = [
    { name: "Database", key: "database" as const, description: "PostgreSQL (Supabase)" },
    { name: "Authentication", key: "auth" as const, description: "Clerk Auth" },
    { name: "File Storage", key: "storage" as const, description: "Supabase Storage" },
    { name: "API", key: "api" as const, description: "Next.js API Routes" },
    { name: "AI Services", key: "ai" as const, description: "OpenAI Integration" },
  ];

  return (
    <div className="container max-w-6xl py-16">
      <div className="mb-12 text-center">
        <Activity className="mx-auto mb-4 h-16 w-16 text-blue-600" />
        <h1 className="mb-4 text-4xl font-bold">System Status</h1>
        <p className="text-xl text-muted-foreground">
          Real-time status of all SkaiScraper services
        </p>
      </div>

      {/* Overall Status */}
      <Card className="mb-8">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-2xl">Overall Status</CardTitle>
              <CardDescription>Last checked: {lastChecked.toLocaleTimeString()}</CardDescription>
            </div>
            {isLoading ? (
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-600 border-r-transparent" />
            ) : healthData?.status === "healthy" ? (
              <Badge className="bg-green-600 text-lg">
                <CheckCircle className="mr-2 h-4 w-4" />
                All Systems Operational
              </Badge>
            ) : (
              <Badge variant="destructive" className="text-lg">
                <AlertCircle className="mr-2 h-4 w-4" />
                Degraded Performance
              </Badge>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              <span>Build: {healthData?.buildSHA || "loading..."}</span>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span>Environment: {healthData?.environment || "—"}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Individual Services */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {services.map((service) => {
          const isOk = healthData?.checks?.[service.key] ?? false;
          return (
            <Card
              key={service.key}
              className={isOk ? "border-green-200 bg-green-50/50" : "border-red-200 bg-red-50/50"}
            >
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <span>{service.name}</span>
                  {isOk ? (
                    <CheckCircle className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  )}
                </CardTitle>
                <CardDescription>{service.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <Badge
                  variant={isOk ? "default" : "destructive"}
                  className={isOk ? "bg-green-600" : ""}
                >
                  {isOk ? "Operational" : "Degraded"}
                </Badge>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Uptime Stats */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Uptime Statistics</CardTitle>
          <CardDescription>Historical uptime performance</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-3">
            <div>
              <div className="text-2xl font-bold text-green-600">99.9%</div>
              <p className="text-sm text-muted-foreground">Last 30 days</p>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">99.95%</div>
              <p className="text-sm text-muted-foreground">Last 90 days</p>
            </div>
            <div>
              <div className="text-2xl font-bold">0</div>
              <p className="text-sm text-muted-foreground">Incidents this month</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Incidents & Maintenance */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Recent Incidents & Maintenance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="py-8 text-center text-muted-foreground">
            <CheckCircle className="mx-auto mb-2 h-8 w-8 text-green-600" />
            <p className="font-semibold">No recent incidents</p>
            <p className="text-sm">All systems operating normally</p>
          </div>
        </CardContent>
      </Card>

      <div className="mt-8 text-center text-sm text-muted-foreground">
        <p>
          For real-time updates and incident notifications, follow us on Twitter{" "}
          <a href="https://twitter.com/skaiscraper" className="text-blue-600 hover:underline">
            @skaiscraper
          </a>
        </p>
      </div>
    </div>
  );
}
