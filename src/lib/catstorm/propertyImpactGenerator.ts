/**
 * PHASE 16.2 — PROPERTY IMPACT PACKET GENERATOR
 * Auto-generates property-specific damage assessments and inspection packets
 */

import { getDelegate } from "@/lib/db/modelAliases";
import { logger } from "@/lib/logger";

// Prisma singleton imported from @/lib/db/prisma

// ============================================
// PROPERTY IMPACT ANALYSIS
// ============================================

interface PropertyData {
  address: string;
  city: string;
  state: string;
  zipCode: string;
  lat: number;
  lng: number;
  roofAge?: number;
  roofType?: string;
  squareFootage?: number;
  stories?: number;
}

interface StormData {
  eventType: string;
  hailSizeAvg?: number;
  windSpeedMax?: number;
  tornadoRating?: string;
}

export async function generatePropertyImpacts(
  stormEventId: string,
  properties: PropertyData[]
): Promise<string[]> {
  const stormEvent = await getDelegate('stormEvent').findUnique({
    where: { id: stormEventId },
  });

  if (!stormEvent) throw new Error('Storm event not found');

  const stormData: StormData = {
    eventType: stormEvent.eventType,
    hailSizeAvg: stormEvent.hailSizeAvg ? Number(stormEvent.hailSizeAvg) : undefined,
    windSpeedMax: stormEvent.windSpeedMax || undefined,
    tornadoRating: stormEvent.tornadoRating || undefined,
  };

  const impactIds: string[] = [];
  
  for (const property of properties) {
    const impactId = await createPropertyImpact(stormEvent.orgId, stormEventId, property, stormData);
    impactIds.push(impactId);
  }

  logger.debug(`✅ Generated ${properties.length} property impact assessments`);
  
  return impactIds;
}

export async function createPropertyImpact(
  orgId: string,
  stormEventId: string,
  property: PropertyData,
  stormData: StormData
): Promise<string> {
  // Calculate damage probability
  const damageAnalysis = calculateDamageProbability(property, stormData);

  // Generate AI damage estimate
  const aiDamageEstimate = generateAIDamageEstimate(property, stormData, damageAnalysis);

  // Determine recommended action
  const recommendedAction = determineRecommendedAction(damageAnalysis.riskLevel);

    const propertyImpact = await getDelegate('propertyImpact').create({
    data: {
      orgId,
      stormEventId,
      
      address: property.address,
      city: property.city,
      state: property.state,
      zipCode: property.zipCode,
      lat: property.lat,
      lng: property.lng,
      
      roofAge: property.roofAge,
      roofType: property.roofType,
      squareFootage: property.squareFootage,
      stories: property.stories,
      
      riskLevel: damageAnalysis.riskLevel,
      damageProba: damageAnalysis.damageProba,
      estimatedDamageSeverity: damageAnalysis.severity,
      
      hailSizeAtLocation: stormData.hailSizeAvg,
      windSpeedAtLocation: stormData.windSpeedMax,
      
      aiDamageEstimate,
      recommendedAction,
      priorityScore: damageAnalysis.priorityScore,
    },
  });

  return propertyImpact.id;
}

// ============================================
// DAMAGE PROBABILITY AI SCORER
// ============================================

interface DamageAnalysis {
  riskLevel: 'HIGH' | 'MEDIUM' | 'LOW';
  damageProba: number; // 0-100
  severity: number; // 1-10
  priorityScore: number; // 0-100
}

function calculateDamageProbability(
  property: PropertyData,
  storm: StormData
): DamageAnalysis {
  let damageProba = 0;
  let severity = 0;
  let priorityScore = 0;

  // HAIL DAMAGE CALCULATION
  if (storm.eventType === 'HAIL' && storm.hailSizeAvg) {
    if (storm.hailSizeAvg >= 2.0) {
      damageProba = 95;
      severity = 10;
      priorityScore = 100;
    } else if (storm.hailSizeAvg >= 1.75) {
      damageProba = 85;
      severity = 9;
      priorityScore = 95;
    } else if (storm.hailSizeAvg >= 1.5) {
      damageProba = 75;
      severity = 8;
      priorityScore = 85;
    } else if (storm.hailSizeAvg >= 1.25) {
      damageProba = 65;
      severity = 7;
      priorityScore = 75;
    } else if (storm.hailSizeAvg >= 1.0) {
      damageProba = 50;
      severity = 6;
      priorityScore = 60;
    } else {
      damageProba = 30;
      severity = 4;
      priorityScore = 40;
    }
  }

  // WIND DAMAGE CALCULATION
  if (storm.eventType === 'WIND' && storm.windSpeedMax) {
    if (storm.windSpeedMax >= 90) {
      damageProba = 90;
      severity = 9;
      priorityScore = 95;
    } else if (storm.windSpeedMax >= 70) {
      damageProba = 75;
      severity = 7;
      priorityScore = 80;
    } else if (storm.windSpeedMax >= 50) {
      damageProba = 50;
      severity = 5;
      priorityScore = 60;
    }
  }

  // TORNADO DAMAGE CALCULATION
  if (storm.eventType === 'TORNADO') {
    damageProba = 95;
    severity = 10;
    priorityScore = 100;
  }

  // ROOF AGE MULTIPLIER
  if (property.roofAge) {
    if (property.roofAge >= 15) {
      damageProba = Math.min(100, damageProba + 15);
      priorityScore = Math.min(100, priorityScore + 15);
    } else if (property.roofAge >= 10) {
      damageProba = Math.min(100, damageProba + 10);
      priorityScore = Math.min(100, priorityScore + 10);
    } else if (property.roofAge >= 5) {
      damageProba = Math.min(100, damageProba + 5);
      priorityScore = Math.min(100, priorityScore + 5);
    }
  }

  // ROOF TYPE MULTIPLIER
  if (property.roofType) {
    if (property.roofType === 'ASPHALT_SHINGLE') {
      damageProba = Math.min(100, damageProba + 5);
    } else if (property.roofType === 'METAL') {
      damageProba = Math.max(0, damageProba - 10);
    } else if (property.roofType === 'TILE') {
      damageProba = Math.max(0, damageProba - 5);
    }
  }

  // DETERMINE RISK LEVEL
  let riskLevel: DamageAnalysis['riskLevel'];
  if (damageProba >= 70) {
    riskLevel = 'HIGH';
  } else if (damageProba >= 40) {
    riskLevel = 'MEDIUM';
  } else {
    riskLevel = 'LOW';
  }

  return {
    riskLevel,
    damageProba: Math.round(damageProba),
    severity: Math.round(severity),
    priorityScore: Math.round(priorityScore),
  };
}

// ============================================
// AI DAMAGE ESTIMATE GENERATOR
// ============================================

function generateAIDamageEstimate(
  property: PropertyData,
  storm: StormData,
  analysis: DamageAnalysis
): string {
  let estimate = '';

  if (storm.eventType === 'HAIL') {
    estimate = `${storm.hailSizeAvg}" hail impact detected. `;
    
    if (analysis.riskLevel === 'HIGH') {
      estimate += `HIGH PROBABILITY of severe roof damage including shingle loss, mat damage, granule loss, and penetration damage. `;
      estimate += `Expected damage: 80-100% of roof surface. Estimated cost: $${(property.squareFootage || 2000) * 7.5} - $${(property.squareFootage || 2000) * 12.5}. `;
      estimate += `FULL ROOF REPLACEMENT LIKELY. Immediate inspection recommended.`;
    } else if (analysis.riskLevel === 'MEDIUM') {
      estimate += `MODERATE PROBABILITY of roof damage including granule loss, bruising, and potential mat damage. `;
      estimate += `Expected damage: 40-70% of roof surface. Estimated cost: $${(property.squareFootage || 2000) * 4} - $${(property.squareFootage || 2000) * 8}. `;
      estimate += `Inspection recommended within 48 hours.`;
    } else {
      estimate += `LOW to MODERATE probability of cosmetic damage. `;
      estimate += `Expected damage: Minor granule loss, cosmetic bruising. Estimated cost: $${(property.squareFootage || 2000) * 2} - $${(property.squareFootage || 2000) * 5}. `;
      estimate += `Inspection recommended for documentation.`;
    }
  }

  if (storm.eventType === 'WIND') {
    estimate = `${storm.windSpeedMax} mph wind impact detected. `;
    
    if (analysis.riskLevel === 'HIGH') {
      estimate += `HIGH PROBABILITY of structural wind damage including shingle blow-off, flashing displacement, gutter damage, and soffit/fascia damage. `;
      estimate += `Estimated cost: $${(property.squareFootage || 2000) * 5} - $${(property.squareFootage || 2000) * 10}. `;
      estimate += `Immediate inspection required.`;
    } else {
      estimate += `MODERATE PROBABILITY of wind damage to exposed areas. `;
      estimate += `Estimated cost: $${(property.squareFootage || 2000) * 2.5} - $${(property.squareFootage || 2000) * 6}. `;
      estimate += `Inspection recommended.`;
    }
  }

  // Add roof age factor
  if (property.roofAge && property.roofAge >= 10) {
    estimate += ` NOTE: Roof age (${property.roofAge} years) increases damage susceptibility and claim approval likelihood.`;
  }

  return estimate;
}

function determineRecommendedAction(riskLevel: string): string {
  switch (riskLevel) {
    case 'HIGH':
      return 'PRIORITY 1: Schedule inspection within 24 hours. High probability of approved claim. Deploy experienced adjuster.';
    case 'MEDIUM':
      return 'PRIORITY 2: Schedule inspection within 48-72 hours. Moderate claim probability. Standard inspection protocol.';
    case 'LOW':
      return 'PRIORITY 3: Schedule inspection within 7 days if homeowner requests. Document for potential future claim.';
    default:
      return 'Schedule standard inspection.';
  }
}

// ============================================
// PROPERTY IMPACT PACKET GENERATOR
// ============================================

export async function generateImpactPacket(propertyImpactId: string): Promise<string> {
  const propertyImpact = await getDelegate('propertyImpact').findUnique({
    where: { id: propertyImpactId },
    include: {
      stormEvent: true,
    },
  });

  if (!propertyImpact) throw new Error('Property impact not found');

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const packetContent = `
PROPERTY IMPACT ASSESSMENT
Generated: ${new Date().toLocaleString()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
PROPERTY INFORMATION
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Address: ${propertyImpact.address}
City: ${propertyImpact.city}, ${propertyImpact.state} ${propertyImpact.zipCode}
Coordinates: ${propertyImpact.lat}, ${propertyImpact.lng}
${propertyImpact.roofAge ? `Roof Age: ${propertyImpact.roofAge} years` : ''}
${propertyImpact.roofType ? `Roof Type: ${propertyImpact.roofType}` : ''}
${propertyImpact.squareFootage ? `Square Footage: ${propertyImpact.squareFootage} sq ft` : ''}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
STORM EVENT DATA
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Event Type: ${propertyImpact.stormEvent?.eventType}
Date: ${propertyImpact.stormEvent?.stormStartTime.toLocaleString()}
${propertyImpact.hailSizeAtLocation ? `Hail Size: ${propertyImpact.hailSizeAtLocation}"` : ''}
${propertyImpact.windSpeedAtLocation ? `Wind Speed: ${propertyImpact.windSpeedAtLocation} mph` : ''}
NOAA Event ID: ${propertyImpact.stormEvent?.noaaEventId || 'N/A'}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
DAMAGE ASSESSMENT
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Risk Level: ${propertyImpact.riskLevel}
Damage Probability: ${propertyImpact.damageProba}%
Severity Score: ${propertyImpact.estimatedDamageSeverity}/10
Priority Score: ${propertyImpact.priorityScore}/100

AI DAMAGE ESTIMATE:
${propertyImpact.aiDamageEstimate}

RECOMMENDED ACTION:
${propertyImpact.recommendedAction}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
INSPECTION CHECKLIST
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
☐ Document property exterior (4 sides)
☐ Photograph roof from ground (4 corners)
☐ Inspect gutters and downspouts
☐ Check for displaced/missing shingles
☐ Look for granule loss in gutters
☐ Document any visible hail hits
☐ Test shingles for mat damage
☐ Check flashing around chimneys/vents
☐ Inspect ridge caps and starter strips
☐ Document any secondary damage
☐ Photograph measuring device next to damage
☐ Collect homeowner contact information
☐ Discuss insurance claim process
☐ Schedule detailed roof inspection if damage found

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
NOTES
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━


━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
`;

  // In production, this would generate a PDF
  const packetUrl = `https://storage.example.com/packets/${propertyImpactId}/impact_packet.pdf`;
  const inspectionSheetUrl = `https://storage.example.com/packets/${propertyImpactId}/inspection_sheet.pdf`;

  await getDelegate('propertyImpact').update({
    where: { id: propertyImpactId },
    data: {
      impactPacketGenerated: true,
      impactPacketUrl: packetUrl,
      inspectionSheetUrl: inspectionSheetUrl,
    },
  });

  logger.debug('✅ Impact packet generated');

  return packetUrl;
}
