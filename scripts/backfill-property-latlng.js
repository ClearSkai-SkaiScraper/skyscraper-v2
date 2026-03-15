#!/usr/bin/env node
/**
 * Backfill Property Lat/Lng — Phase 1.4
 *
 * Geocodes property_profiles that are missing latitude/longitude
 * using the Open-Meteo free geocoding API.
 *
 * Usage: node scripts/backfill-property-latlng.js
 */

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

const GEOCODE_URL = "https://geocoding-api.open-meteo.com/v1/search";
const BATCH_SIZE = 10;
const DELAY_MS = 500; // Respect rate limits

async function geocodeAddress(address) {
  try {
    const url = `${GEOCODE_URL}?name=${encodeURIComponent(address)}&count=1&language=en&format=json`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    if (!data.results?.length) return null;
    return {
      latitude: data.results[0].latitude,
      longitude: data.results[0].longitude,
    };
  } catch {
    return null;
  }
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  console.log("🌍 Backfilling property lat/lng...\n");

  const missing = await prisma.property_profiles.findMany({
    where: {
      OR: [{ latitude: null }, { longitude: null }],
    },
    select: {
      id: true,
      fullAddress: true,
      streetAddress: true,
      city: true,
      state: true,
      zipCode: true,
    },
    take: 500, // Process in batches
  });

  console.log(`Found ${missing.length} properties missing coordinates\n`);

  let success = 0;
  let failed = 0;

  for (let i = 0; i < missing.length; i += BATCH_SIZE) {
    const batch = missing.slice(i, i + BATCH_SIZE);

    for (const profile of batch) {
      const address =
        profile.fullAddress ||
        `${profile.streetAddress}, ${profile.city}, ${profile.state} ${profile.zipCode}`;

      const coords = await geocodeAddress(address);

      if (coords) {
        await prisma.property_profiles.update({
          where: { id: profile.id },
          data: {
            latitude: coords.latitude,
            longitude: coords.longitude,
          },
        });
        success++;
        console.log(`  ✅ ${address} → ${coords.latitude}, ${coords.longitude}`);
      } else {
        failed++;
        console.log(`  ❌ ${address} — geocoding failed`);
      }
    }

    if (i + BATCH_SIZE < missing.length) {
      await sleep(DELAY_MS);
    }
  }

  console.log(`\n🏁 Done: ${success} geocoded, ${failed} failed`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal error:", e);
  prisma.$disconnect();
  process.exit(1);
});
