// src/lib/db/properties.ts
import { prisma } from "./client";

export async function getPropertyById(property_id: string) {
  return await prisma.properties.findUnique({
    where: { id: property_id },
    include: {
      contacts: true,
      Org: true,
    },
  });
}

export async function getAllTrackedProperties() {
  // Returns properties with lat/lon for weather tracking
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const properties = await prisma.properties.findMany({
    select: {
      id: true,
      street: true,
      city: true,
      state: true,
      zipCode: true,
      orgId: true,
    },
  });

  // TODO: Geocode addresses to get lat/lon
  // For now, return empty array - will be populated when properties have lat/lon fields
  return [];
}

export async function upsertQuickDOL(
  property_id: string,
  data: {
    recommendedDate?: string;
    confidence?: number;
    reason?: string;
    eventCount: number;
    topHailInches?: number;
    topDistanceMiles?: number;
  }
) {
  return await prisma.quick_dols.upsert({
    where: { propertyId: property_id },
    create: {
      propertyId: property_id,
      ...data,
    },
    update: data,
  });
}

export async function recordWeatherEvent(event: {
  property_id: string;
  source: string;
  type: string;
  timeUtc: Date;
  magnitude?: number;
  distanceMiles?: number;
  geometryJson: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  metadataJson?: any;
}) {
  return await prisma.weather_events.create({
    data: {
      id: crypto.randomUUID(),
      propertyId: event.property_id,
      source: event.source,
      type: event.type,
      timeUtc: event.timeUtc,
      magnitude: event.magnitude,
      distanceMiles: event.distanceMiles,
      geometryJson: event.geometryJson,
      metadataJson: event.metadataJson,
    },
  });
}

export async function createWeatherDocument(doc: {
  property_id: string;
  orgId: string;
  kind: string;
  pdfUrl: string;
  summaryText?: string;
  aiModelUsed?: string;
  eventCount: number;
  dolDate?: string;
}) {
  return await prisma.weather_documents.create({
    data: {
      id: crypto.randomUUID(),
      propertyId: doc.property_id,
      orgId: doc.orgId,
      kind: doc.kind,
      pdfUrl: doc.pdfUrl,
      summaryText: doc.summaryText,
      aiModelUsed: doc.aiModelUsed,
      eventCount: doc.eventCount,
      dolDate: doc.dolDate,
    },
  });
}

export async function saveDailyResultToDB(
  property_id: string,
  data: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    scored: any[];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dol: any;
  }
) {
  // Save daily snapshot
  await prisma.weather_daily_snapshots.create({
    data: {
      id: crypto.randomUUID(),
      propertyId: property_id,
      scoredJson: data.scored,
      dolJson: data.dol,
    },
  });

  // Upsert Quick DOL
  if (data.dol) {
    await upsertQuickDOL(property_id, {
      recommendedDate: data.dol.recommended_date,
      confidence: data.dol.confidence,
      reason: data.dol.reason,
      eventCount: data.scored?.length || 0,
      topHailInches: data.scored?.[0]?.magnitude,
      topDistanceMiles: data.scored?.[0]?.distance_miles,
    });
  }
}
