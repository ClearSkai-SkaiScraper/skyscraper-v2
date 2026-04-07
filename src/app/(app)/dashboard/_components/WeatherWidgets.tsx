"use client";
import { CalendarDays,CloudSun, Radar, Wind } from "lucide-react";
import { useEffect, useState } from "react";

type WeatherCard = {
  title: string;
  icon: React.ReactNode;
  primary: string | number;
  meta?: string;
};

interface WeatherApiStub {
  todayTemp?: number;
  todaySummary?: string;
  windSpeed?: number;
  windGust?: number;
  radarStatus?: string;
  forecast?: Array<{ day: string; temp: number; summary: string }>;
}

export default function WeatherWidgets() {
  const [data, setData] = useState<WeatherApiStub | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        // Attempt lightweight call (replace with real endpoint later)
        // Fallback: synthetic demo data
        const synthetic: WeatherApiStub = {
          todayTemp: 72,
          todaySummary: "Partly Cloudy",
          windSpeed: 12,
          windGust: 18,
          radarStatus: "No severe cells",
          forecast: [
            { day: "Tomorrow", temp: 70, summary: "Cloudy" },
            { day: "+2 Days", temp: 67, summary: "Light Rain" },
            { day: "+3 Days", temp: 74, summary: "Sunny" },
          ],
        };
        setData(synthetic);
      } catch (e) {
        setError(e.message || "Failed weather fetch");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-32 animate-pulse rounded-2xl bg-[var(--surface-2)]" />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-6 text-sm text-red-600">
          Weather unavailable: {error}
        </div>
      </div>
    );
  }

  const cards: WeatherCard[] = [
    {
      title: "Today",
      icon: <CloudSun className="h-5 w-5 text-[color:var(--primary)]" />,
      primary: `${data?.todayTemp ?? "--"}°F`,
      meta: data?.todaySummary,
    },
    {
      title: "3-Day Forecast",
      icon: <CalendarDays className="h-5 w-5 text-[color:var(--primary)]" />,
      primary: data?.forecast?.map((f) => `${f.day}: ${f.temp}°`).join(" · ") || "--",
      meta: data?.forecast?.map((f) => f.summary).join(" / ") || undefined,
    },
    {
      title: "Wind",
      icon: <Wind className="h-5 w-5 text-[color:var(--primary)]" />,
      primary: `${data?.windSpeed ?? "--"} mph`,
      meta: `Gusts ${data?.windGust ?? "--"} mph`,
    },
    {
      title: "Radar",
      icon: <Radar className="h-5 w-5 text-[color:var(--primary)]" />,
      primary: data?.radarStatus ?? "--",
      meta: "Live snapshot",
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
      {cards.map((c) => (
        <div
          key={c.title}
          className="rounded-2xl border border-[color:var(--border)] bg-[var(--surface-1)] p-4 shadow-sm transition hover:shadow-md"
        >
          <div className="mb-2 flex items-center justify-between">
            <h3 className="text-sm font-medium text-slate-700 dark:text-slate-300">{c.title}</h3>
            {c.icon}
          </div>
            <div className="mb-1 truncate text-xl font-semibold text-[color:var(--text)]">{c.primary}</div>
            {c.meta && <p className="line-clamp-2 text-xs text-slate-700 dark:text-slate-300">{c.meta}</p>}
        </div>
      ))}
    </div>
  );
}
