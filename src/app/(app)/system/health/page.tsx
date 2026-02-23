"use client";

import { useUser } from "@clerk/nextjs";
import { Activity, AlertTriangle, CheckCircle, Server, TrendingUp, XCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

interface HealthMetric {
  id: string;
  name: string;
  status: "healthy" | "degraded" | "down";
  responseTime: number;
  uptime: number;
  lastChecked: string;
}

export default function SystemHealthPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [metrics] = useState<HealthMetric[]>([
    {
      id: "1",
      name: "API Server",
      status: "healthy",
      responseTime: 145,
      uptime: 99.98,
      lastChecked: "2024-12-06T14:35:00Z",
    },
    {
      id: "2",
      name: "Database",
      status: "healthy",
      responseTime: 38,
      uptime: 99.99,
      lastChecked: "2024-12-06T14:35:00Z",
    },
    {
      id: "3",
      name: "File Storage",
      status: "healthy",
      responseTime: 89,
      uptime: 99.95,
      lastChecked: "2024-12-06T14:35:00Z",
    },
    {
      id: "4",
      name: "Email Service",
      status: "degraded",
      responseTime: 342,
      uptime: 99.87,
      lastChecked: "2024-12-06T14:35:00Z",
    },
  ]);

  const [incidents] = useState([
    {
      id: "1",
      title: "Email Service Degraded Performance",
      status: "investigating",
      startedAt: "2024-12-06T14:00:00Z",
      severity: "medium",
    },
    {
      id: "2",
      title: "Database Maintenance Scheduled",
      status: "scheduled",
      startedAt: "2024-12-07T02:00:00Z",
      severity: "low",
    },
  ]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "healthy":
        return <CheckCircle className="h-6 w-6 text-green-600" />;
      case "degraded":
        return <AlertTriangle className="h-6 w-6 text-yellow-600" />;
      case "down":
        return <XCircle className="h-6 w-6 text-red-600" />;
      default:
        return <Activity className="h-6 w-6 text-gray-600" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "healthy":
        return "green";
      case "degraded":
        return "yellow";
      case "down":
        return "red";
      default:
        return "gray";
    }
  };

  const overallStatus = metrics.every((m) => m.status === "healthy")
    ? "All Systems Operational"
    : metrics.some((m) => m.status === "down")
      ? "Partial Outage"
      : "Degraded Performance";

  const overallColor =
    overallStatus === "All Systems Operational"
      ? "green"
      : overallStatus === "Partial Outage"
        ? "red"
        : "yellow";

  return (
    <div className="space-y-6 p-8">
      <div>
        <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">
          System Health & Monitoring
        </h1>
        <p className="text-gray-600">Real-time uptime monitoring and status page</p>
      </div>

      {/* Overall Status Banner */}
      <div
        className={`from- bg-gradient-to-r${overallColor}-500 to-${overallColor}-600 rounded-lg p-8 text-white`}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            {overallStatus === "All Systems Operational" ? (
              <CheckCircle className="h-12 w-12" />
            ) : overallStatus === "Partial Outage" ? (
              <XCircle className="h-12 w-12" />
            ) : (
              <AlertTriangle className="h-12 w-12" />
            )}
            <div>
              <h2 className="text-3xl font-bold">{overallStatus}</h2>
              <p className={`text-${overallColor}-100 text-lg`}>Last checked: just now</p>
            </div>
          </div>
          <button
            className={`text- bg-white px-6 py-3${overallColor}-600 hover:bg- rounded-lg${overallColor}-50 font-medium`}
          >
            View Status Page
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Uptime (30d)</span>
            <TrendingUp className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold">99.94%</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Avg Response</span>
            <Activity className="h-5 w-5 text-blue-600" />
          </div>
          <div className="text-3xl font-bold">154ms</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Active Incidents</span>
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold">
            {incidents.filter((i) => i.status === "investigating").length}
          </div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600">Services</span>
            <Server className="h-5 w-5 text-purple-600" />
          </div>
          <div className="text-3xl font-bold">{metrics.length}</div>
        </div>
      </div>

      {/* Service Health */}
      <div className="rounded-lg bg-white shadow">
        <div className="border-b p-6">
          <h2 className="text-xl font-bold">Service Health</h2>
        </div>
        <div className="divide-y">
          {metrics.map((metric) => {
            const statusColor = getStatusColor(metric.status);
            return (
              <div key={metric.id} className="p-6 hover:bg-gray-50">
                <div className="flex items-center justify-between">
                  <div className="flex flex-1 items-center gap-4">
                    {getStatusIcon(metric.status)}
                    <div className="flex-1">
                      <div className="mb-2 flex items-center gap-3">
                        <h3 className="text-lg font-bold">{metric.name}</h3>
                        <span
                          className={`bg- px-3 py-1${statusColor}-100 text-${statusColor}-700 rounded-full text-xs font-medium capitalize`}
                        >
                          {metric.status}
                        </span>
                      </div>
                      <div className="flex items-center gap-6 text-sm text-gray-600">
                        <div>
                          Response Time:{" "}
                          <span className="font-medium">{metric.responseTime}ms</span>
                        </div>
                        <div>
                          Uptime: <span className="font-medium">{metric.uptime}%</span>
                        </div>
                        <div>
                          Last Checked:{" "}
                          <span className="font-medium">
                            {new Date(metric.lastChecked).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                  <button className="rounded border px-4 py-2 hover:bg-gray-50">
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Incidents */}
      {incidents.length > 0 && (
        <div className="rounded-lg bg-white shadow">
          <div className="border-b p-6">
            <h2 className="text-xl font-bold">Active Incidents & Maintenance</h2>
          </div>
          <div className="divide-y">
            {incidents.map((incident) => (
              <div
                key={incident.id}
                className={`p-6 ${
                  incident.severity === "high"
                    ? "bg-red-50"
                    : incident.severity === "medium"
                      ? "bg-yellow-50"
                      : "bg-blue-50"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-start gap-4">
                    <AlertTriangle
                      className={`h-6 w-6 ${
                        incident.severity === "high"
                          ? "text-red-600"
                          : incident.severity === "medium"
                            ? "text-yellow-600"
                            : "text-blue-600"
                      }`}
                    />
                    <div>
                      <h3 className="mb-1 text-lg font-bold">{incident.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span
                          className={`rounded px-2 py-1 text-xs font-medium capitalize ${
                            incident.status === "investigating"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {incident.status}
                        </span>
                        <span>Started: {new Date(incident.startedAt).toLocaleString()}</span>
                        <span
                          className={`font-medium capitalize ${
                            incident.severity === "high"
                              ? "text-red-600"
                              : incident.severity === "medium"
                                ? "text-yellow-600"
                                : "text-blue-600"
                          }`}
                        >
                          {incident.severity} severity
                        </span>
                      </div>
                    </div>
                  </div>
                  <button className="rounded border px-4 py-2 hover:bg-white">View Updates</button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uptime Chart */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 text-xl font-bold">30-Day Uptime</h2>
        <div className="flex gap-1">
          {Array.from({ length: 30 }, (_, i) => {
            const uptime = 99.5 + Math.random() * 0.5;
            const color = uptime >= 99.9 ? "green" : uptime >= 99.5 ? "yellow" : "red";
            return (
              <div
                key={i}
                className={`bg- h-12 flex-1${color}-500 cursor-pointer rounded transition-opacity hover:opacity-75`}
                title={`Day ${i + 1}: ${uptime.toFixed(2)}%`}
              />
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
          <span>30 days ago</span>
          <span>Today</span>
        </div>
      </div>
    </div>
  );
}
