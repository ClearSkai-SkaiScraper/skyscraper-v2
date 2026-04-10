// src/hooks/useWeather.ts
"use client";

import { useState } from "react";

export type WeatherEvent = {
  type: string;
  magnitude?: number;
  distance_miles?: number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  geometry?: any;
};

export type QuickDOL = {
  recommended_date?: string;
  confidence?: number;
  reason?: string;
};

export function useWeather() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dol, setDol] = useState<QuickDOL | null>(null);
  const [events, setEvents] = useState<WeatherEvent[]>([]);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [summary, setSummary] = useState<string | null>(null);

  async function pullQuickDol(lat: number, lon: number, daysBack = 120) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather/quick-dol", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, daysBack }),
      });
      if (!res.ok) {
        throw new Error(`Failed to pull Quick DOL: ${res.statusText}`);
      }
      const data = await res.json();
      setDol(data.dol);
      setEvents(data.events || []);
      return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  async function generatePdf(lat: number, lon: number, orgId: string, propertyId?: string) {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/weather/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lat, lon, orgId, propertyId }),
      });
      if (!res.ok) {
        throw new Error(`Failed to generate PDF: ${res.statusText}`);
      }
      const data = await res.json();
      setPdfUrl(data.pdfUrl);
      setSummary(data.summary);
      setDol(data.dol);
      setEvents(data.events || []);
      return data;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  }

  return {
    loading,
    error,
    dol,
    events,
    pdfUrl,
    summary,
    pullQuickDol,
    generatePdf,
  };
}
