// src/jobs/store.ts
// Database layer for weather ingestion jobs

import {
  getAllTrackedProperties as getPropertiesFromDB,
  saveDailyResultToDB as saveResultsToDB,
} from "@/lib/db/properties";

export async function getAllTrackedProperties() {
  // Use real database query
  const properties = await getPropertiesFromDB();

  // If no properties in DB yet, return demo property for testing
  if (properties.length === 0) {
    return [
      { id: "demo-1", lat: 34.541, lon: -112.469 }, // Phoenix area
    ];
  }

  return properties;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function saveDailyResultToDB(property_id: string, data: any) {
  return await saveResultsToDB(property_id, data);
}
