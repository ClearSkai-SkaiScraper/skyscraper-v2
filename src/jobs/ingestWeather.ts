// src/jobs/ingestWeather.ts
// Daily ingest — runs via Vercel Cron or manually via API

import { capToEvents,fetchCAPAlerts } from "@/lib/weather/cap";
import { fetchMesonetReports, mesonetToEvents } from "@/lib/weather/mesonet";
import { pickQuickDOL,scoreEventsForProperty } from "@/lib/weather/score";

import { getAllTrackedProperties,saveDailyResultToDB } from "./store";

export async function runDailyWeatherIngest() {
  const properties = await getAllTrackedProperties();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results: any[] = [];

  for (const prop of properties) {
    const now = new Date();
    const start = new Date(now.getTime() - 120 * 864e5);
    const bbox = buildBBox(prop.lat, prop.lon, 2);

    const capRows = await fetchCAPAlerts({
      bbox,
      startIso: start.toISOString(),
      endIso: now.toISOString(),
    });

    const mesRows = await fetchMesonetReports({
      bbox,
      startIso: start.toISOString(),
      endIso: now.toISOString(),
    });

    const events = [...capToEvents(capRows), ...mesonetToEvents(mesRows)];
    const { scored, byDate } = scoreEventsForProperty(events, prop);
    const dol = pickQuickDOL(scored, byDate);

    await saveDailyResultToDB(prop.id, { scored, dol });
    results.push({ property_id: prop.id, dol });
  }

  return { count: properties.length, updated: results };
}

function buildBBox(lat: number, lon: number, deg: number) {
  return `${lon - deg},${lat - deg},${lon + deg},${lat + deg}`;
}
