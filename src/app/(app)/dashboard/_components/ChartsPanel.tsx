"use client";
import { BarChart2 as BarChart2Icon } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { logger } from "@/lib/logger";

interface ClaimsStatusDatum {
  status: string;
  count: number;
}
interface ClaimsTrendDatum {
  date: string;
  count: number;
}
interface LeadsSourceDatum {
  source: string;
  count: number;
  [key: string]: string | number;
}

interface ChartsApiResponse {
  claimsByStatus?: ClaimsStatusDatum[];
  claimsOverTime?: ClaimsTrendDatum[];
  leadsBySource?: LeadsSourceDatum[];
}

const COLORS = ["#0ea5e9", "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"]; // Tailwind palette slices

export default function ChartsPanel() {
  const [data, setData] = useState<ChartsApiResponse | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/dashboard/charts");
        const json = await res.json();

        if (!json.ok) {
          throw new Error(json.error || "Failed to fetch charts data");
        }

        setData({
          claimsByStatus: json.data.claimsByStatus || [],
          claimsOverTime: json.data.claimsOverTime || [],
          leadsBySource: json.data.leadsBySource || [],
        });
      } catch (e) {
        logger.warn("[ChartsPanel] Falling back to empty charts:", e);
        setData({
          claimsByStatus: [],
          claimsOverTime: [],
          leadsBySource: [],
        });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="h-56 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  const isEmpty =
    (!data?.claimsByStatus || data.claimsByStatus.length === 0) &&
    (!data?.claimsOverTime || data.claimsOverTime.length === 0) &&
    (!data?.leadsBySource || data.leadsBySource.length === 0);

  if (isEmpty) {
    return (
      <div className="rounded-3xl border border-slate-200/60 bg-white/80 p-8 text-center shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-900/70">
        <BarChart2Icon className="mx-auto mb-3 h-10 w-10 text-slate-300 dark:text-slate-600" />
        <h3 className="mb-1 text-sm font-semibold text-slate-700 dark:text-slate-300">
          Charts will appear here
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Create your first claim or lead to see trends, status breakdowns, and source analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-600">
          Claims by Status
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.claimsByStatus}>
              <XAxis dataKey="status" stroke="var(--border)" tick={{ fill: "var(--muted)" }} />
              <YAxis stroke="var(--border)" tick={{ fill: "var(--muted)" }} />
              <Tooltip contentStyle={{ fontSize: 12 }} cursor={{ fill: "rgba(0,0,0,0.05)" }} />
              <Bar dataKey="count" fill="var(--primary)" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-600">
          Claims Over Time
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data?.claimsOverTime}>
              <XAxis dataKey="date" stroke="var(--border)" tick={{ fill: "var(--muted)" }} />
              <YAxis stroke="var(--border)" tick={{ fill: "var(--muted)" }} />
              <Tooltip
                contentStyle={{ fontSize: 12 }}
                cursor={{ stroke: "var(--primary)", strokeWidth: 1 }}
              />
              <Line
                type="monotone"
                dataKey="count"
                stroke="var(--primary)"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
      <div className="rounded-3xl border border-slate-100 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/70">
        <h3 className="mb-2 text-sm font-medium text-slate-500 dark:text-slate-400 dark:text-slate-600">
          Lead Source Breakdown
        </h3>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data?.leadsBySource}
                dataKey="count"
                nameKey="source"
                innerRadius={30}
                outerRadius={55}
                paddingAngle={3}
                label={({ name }) => String(name)}
              >
                {data?.leadsBySource?.map((_, idx) => (
                  <Cell key={idx} fill={COLORS[idx % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ fontSize: 12 }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
