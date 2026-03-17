/**
 * Material Estimator - ABC Supply Routing Engine
 *
 * Converts roof measurements into material orders:
 * 1. Calculate materials from roof area/pitch
 * 2. Find nearest ABC Supply branch
 * 3. Check inventory availability
 * 4. Generate order with pricing
 *
 * Waste factors and quantities based on industry standards.
 */

import "server-only";

import {
  type ABCBranch,
  type ABCInventory,
  type ABCOrderCreateRequest,
  type ABCOrderLine,
  type ABCProduct,
  getABCSupplyClient,
} from "@/lib/integrations/abc-supply";

// ============================================================================
// Constants - Industry Standard Waste Factors
// ============================================================================

const WASTE_FACTORS = {
  /** Simple gable roof */
  LOW: 1.1,
  /** Hip roof or moderate complexity */
  MEDIUM: 1.15,
  /** Complex roof with many valleys/dormers */
  HIGH: 1.2,
  /** Very complex - turrets, multiple levels */
  VERY_HIGH: 1.25,
} as const;

const COVERAGE_RATES = {
  /** Standard 3-tab shingles - sq ft per bundle */
  THREE_TAB: 33.3,
  /** Architectural shingles - sq ft per bundle */
  ARCHITECTURAL: 33.3,
  /** Premium/designer shingles */
  PREMIUM: 25.0,
  /** Underlayment - sq ft per roll */
  UNDERLAYMENT_SYNTHETIC: 1000,
  UNDERLAYMENT_FELT: 400,
  /** Ice & water shield - sq ft per roll */
  ICE_WATER: 75,
  /** Starter strip - linear ft per bundle */
  STARTER: 105,
  /** Ridge cap - linear ft per bundle */
  RIDGE_CAP: 31.5,
  /** Drip edge - linear ft per piece */
  DRIP_EDGE: 10,
  /** Nails - per square (100 sq ft) */
  NAILS_PER_SQUARE: 320,
} as const;

// ============================================================================
// Types
// ============================================================================

export interface RoofMeasurements {
  /** Total roof area in square feet */
  totalArea: number;
  /** Roof pitch (e.g., "6/12") */
  pitch: string;
  /** Length of ridges in linear feet */
  ridgeLength: number;
  /** Length of hips in linear feet */
  hipLength: number;
  /** Length of valleys in linear feet */
  valleyLength: number;
  /** Length of eaves (drip edge) in linear feet */
  eaveLength: number;
  /** Length of rakes in linear feet */
  rakeLength: number;
  /** Waste factor category */
  complexity: keyof typeof WASTE_FACTORS;
}

export interface ShingleSpec {
  type: "THREE_TAB" | "ARCHITECTURAL" | "PREMIUM";
  manufacturer?: string;
  color?: string;
  productLine?: string;
}

export interface MaterialEstimate {
  /** Unique estimate ID */
  id: string;
  /** Timestamp */
  createdAt: string;
  /** Input measurements */
  measurements: RoofMeasurements;
  /** Shingle specification */
  shingleSpec: ShingleSpec;
  /** Calculated materials */
  materials: MaterialLine[];
  /** Total estimated cost */
  totalCost: number;
  /** Waste factor used */
  wasteFactor: number;
  /** Notes/warnings */
  notes: string[];
}

export interface MaterialLine {
  category: string;
  sku?: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalPrice: number;
  coverage?: string;
  inStock?: boolean;
  availableQuantity?: number;
}

export interface RoutingResult {
  estimate: MaterialEstimate;
  branch: ABCBranch | null;
  inventory: ABCInventory[];
  orderReady: boolean;
  unavailableItems: string[];
  alternativeBranches?: ABCBranch[];
}

export interface OrderDraft {
  estimateId: string;
  branchId: string;
  lines: ABCOrderLine[];
  deliveryMethod: "pickup" | "delivery";
  deliveryAddress?: ABCOrderCreateRequest["deliveryAddress"];
  requestedDate?: string;
  subtotal: number;
  estimatedTax: number;
  total: number;
}

// ============================================================================
// Material Calculator
// ============================================================================

/**
 * Calculate pitch multiplier for area adjustment
 * E.g., 6/12 pitch = 1.118x area multiplier
 */
function getPitchMultiplier(pitch: string): number {
  const [rise, run] = pitch.split("/").map(Number);
  if (!rise || !run) return 1.0;
  return Math.sqrt(1 + Math.pow(rise / run, 2));
}

/**
 * Calculate all materials needed for a roof
 */
export function calculateMaterials(
  measurements: RoofMeasurements,
  shingleSpec: ShingleSpec
): MaterialEstimate {
  const wasteFactor = WASTE_FACTORS[measurements.complexity];
  const pitchMultiplier = getPitchMultiplier(measurements.pitch);
  const adjustedArea = measurements.totalArea * pitchMultiplier * wasteFactor;
  const squares = adjustedArea / 100;

  const materials: MaterialLine[] = [];
  const notes: string[] = [];

  // ─── Shingles ─────────────────────────────────────────────────────────────
  const coverageRate = COVERAGE_RATES[shingleSpec.type];
  const bundlesNeeded = Math.ceil(adjustedArea / coverageRate);

  materials.push({
    category: "Shingles",
    productName: `${shingleSpec.manufacturer || "GAF"} ${shingleSpec.productLine || "Timberline HDZ"} - ${shingleSpec.color || "Charcoal"}`,
    quantity: bundlesNeeded,
    unit: "bundle",
    unitPrice: shingleSpec.type === "PREMIUM" ? 45 : shingleSpec.type === "ARCHITECTURAL" ? 35 : 28,
    totalPrice: 0, // calculated below
    coverage: `${coverageRate} sq ft/bundle`,
  });

  // ─── Underlayment ─────────────────────────────────────────────────────────
  const underlaymentRolls = Math.ceil(adjustedArea / COVERAGE_RATES.UNDERLAYMENT_SYNTHETIC);

  materials.push({
    category: "Underlayment",
    productName: "GAF FeltBuster Synthetic Underlayment",
    quantity: underlaymentRolls,
    unit: "roll",
    unitPrice: 120,
    totalPrice: 0,
    coverage: `${COVERAGE_RATES.UNDERLAYMENT_SYNTHETIC} sq ft/roll`,
  });

  // ─── Ice & Water Shield (first 3 ft from eaves) ───────────────────────────
  const iceWaterArea = measurements.eaveLength * 3 * pitchMultiplier * wasteFactor;
  const iceWaterRolls = Math.ceil(iceWaterArea / COVERAGE_RATES.ICE_WATER);

  materials.push({
    category: "Ice & Water Shield",
    productName: "GAF WeatherWatch Ice & Water Shield",
    quantity: iceWaterRolls,
    unit: "roll",
    unitPrice: 95,
    totalPrice: 0,
    coverage: `${COVERAGE_RATES.ICE_WATER} sq ft/roll`,
  });

  // ─── Starter Strip ────────────────────────────────────────────────────────
  const starterLength = (measurements.eaveLength + measurements.rakeLength) * wasteFactor;
  const starterBundles = Math.ceil(starterLength / COVERAGE_RATES.STARTER);

  materials.push({
    category: "Starter Strip",
    productName: "GAF Pro-Start Starter Strip Shingles",
    quantity: starterBundles,
    unit: "bundle",
    unitPrice: 42,
    totalPrice: 0,
    coverage: `${COVERAGE_RATES.STARTER} lin ft/bundle`,
  });

  // ─── Ridge Cap ────────────────────────────────────────────────────────────
  const ridgeHipLength = (measurements.ridgeLength + measurements.hipLength) * wasteFactor;
  const ridgeCapBundles = Math.ceil(ridgeHipLength / COVERAGE_RATES.RIDGE_CAP);

  materials.push({
    category: "Ridge Cap",
    productName: `GAF TimberTex Ridge Cap - ${shingleSpec.color || "Charcoal"}`,
    quantity: ridgeCapBundles,
    unit: "bundle",
    unitPrice: 62,
    totalPrice: 0,
    coverage: `${COVERAGE_RATES.RIDGE_CAP} lin ft/bundle`,
  });

  // ─── Drip Edge ────────────────────────────────────────────────────────────
  const dripEdgeLength = (measurements.eaveLength + measurements.rakeLength) * wasteFactor;
  const dripEdgePieces = Math.ceil(dripEdgeLength / COVERAGE_RATES.DRIP_EDGE);

  materials.push({
    category: "Drip Edge",
    productName: 'Aluminum Drip Edge (2"x3") - White',
    quantity: dripEdgePieces,
    unit: "piece",
    unitPrice: 6.5,
    totalPrice: 0,
    coverage: `${COVERAGE_RATES.DRIP_EDGE} lin ft/piece`,
  });

  // ─── Valley Flashing ──────────────────────────────────────────────────────
  if (measurements.valleyLength > 0) {
    const valleyPieces = Math.ceil((measurements.valleyLength * wasteFactor) / 10);

    materials.push({
      category: "Valley Flashing",
      productName: "W-Type Valley Metal (20\"x10') - Galvanized",
      quantity: valleyPieces,
      unit: "piece",
      unitPrice: 28,
      totalPrice: 0,
      coverage: "10 lin ft/piece",
    });
  }

  // ─── Nails ────────────────────────────────────────────────────────────────
  const nailsNeeded = Math.ceil(squares * COVERAGE_RATES.NAILS_PER_SQUARE);
  const nailBoxes = Math.ceil(nailsNeeded / 7200); // ~7200 nails per 30lb box

  materials.push({
    category: "Fasteners",
    productName: '1-1/4" Galvanized Roofing Nails (30lb box)',
    quantity: nailBoxes,
    unit: "box",
    unitPrice: 65,
    totalPrice: 0,
    coverage: `~${COVERAGE_RATES.NAILS_PER_SQUARE} nails/square`,
  });

  // ─── Pipe Boots (estimate 3 per typical home) ─────────────────────────────
  const pipeBoots = measurements.totalArea > 2000 ? 4 : 3;

  materials.push({
    category: "Pipe Boots",
    productName: 'Oatey All-Flash No-Calk Roof Flashing (1.5"-3")',
    quantity: pipeBoots,
    unit: "each",
    unitPrice: 18,
    totalPrice: 0,
  });

  // ─── Calculate Total Prices ───────────────────────────────────────────────
  let totalCost = 0;
  for (const m of materials) {
    m.totalPrice = m.quantity * m.unitPrice;
    totalCost += m.totalPrice;
  }

  // ─── Add Notes ────────────────────────────────────────────────────────────
  notes.push(
    `Waste factor: ${((wasteFactor - 1) * 100).toFixed(0)}% (${measurements.complexity} complexity)`
  );
  notes.push(
    `Pitch adjustment: ${((pitchMultiplier - 1) * 100).toFixed(1)}% for ${measurements.pitch} pitch`
  );
  notes.push(
    `Total adjusted area: ${adjustedArea.toFixed(0)} sq ft (${squares.toFixed(1)} squares)`
  );

  if (measurements.complexity === "VERY_HIGH") {
    notes.push("⚠️ Complex roof - consider adding extra ridge cap and starter strip");
  }

  return {
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    measurements,
    shingleSpec,
    materials,
    totalCost,
    wasteFactor,
    notes,
  };
}

// ============================================================================
// ABC Supply Routing
// ============================================================================

/**
 * Route an estimate to the nearest ABC Supply branch with inventory check
 */
export async function routeToABCSupply(
  estimate: MaterialEstimate,
  jobSiteZip: string,
  orgAccountId: string
): Promise<RoutingResult> {
  const client = getABCSupplyClient(orgAccountId);

  // Find nearest branches
  const branches = await client.findNearestBranches(jobSiteZip, 3);

  if (branches.length === 0) {
    return {
      estimate,
      branch: null,
      inventory: [],
      orderReady: false,
      unavailableItems: ["No ABC Supply branches found near " + jobSiteZip],
    };
  }

  const primaryBranch = branches[0];
  const unavailableItems: string[] = [];
  const inventory: ABCInventory[] = [];

  // Check inventory at primary branch
  for (const material of estimate.materials) {
    if (material.sku) {
      const inv = await client.checkInventory(material.sku, primaryBranch.id);
      if (inv) {
        inventory.push(inv);
        material.availableQuantity = inv.quantityAvailable;
        material.inStock = inv.quantityAvailable >= material.quantity;

        if (!material.inStock) {
          unavailableItems.push(
            `${material.productName}: need ${material.quantity}, only ${inv.quantityAvailable} in stock`
          );
        }
      }
    }
  }

  return {
    estimate,
    branch: primaryBranch,
    inventory,
    orderReady: unavailableItems.length === 0,
    unavailableItems,
    alternativeBranches: branches.slice(1),
  };
}

/**
 * Search ABC Supply catalog and attach SKUs to estimate
 */
export async function enrichEstimateWithSKUs(
  estimate: MaterialEstimate,
  orgAccountId: string
): Promise<MaterialEstimate> {
  const client = getABCSupplyClient(orgAccountId);

  for (const material of estimate.materials) {
    // Search for matching product
    const searchTerms = material.productName.split(" ").slice(0, 3).join(" ");
    const results = await client.searchProducts(searchTerms, 5);

    if (results.length > 0) {
      // Find best match by category
      const match = results.find(
        (p: ABCProduct) =>
          p.category.toLowerCase().includes(material.category.toLowerCase()) ||
          p.name.toLowerCase().includes(material.category.toLowerCase())
      );

      if (match) {
        material.sku = match.sku;
        material.productName = match.name;
        material.unitPrice = match.pricePerUnit;
        material.totalPrice = material.quantity * match.pricePerUnit;
      }
    }
  }

  // Recalculate total
  estimate.totalCost = estimate.materials.reduce((sum, m) => sum + m.totalPrice, 0);

  return estimate;
}

/**
 * Create an order draft for ABC Supply
 */
export function createOrderDraft(
  routingResult: RoutingResult,
  deliveryMethod: "pickup" | "delivery",
  deliveryAddress?: ABCOrderCreateRequest["deliveryAddress"],
  requestedDate?: string
): OrderDraft | null {
  if (!routingResult.branch || !routingResult.orderReady) {
    return null;
  }

  const lines: ABCOrderLine[] = routingResult.estimate.materials
    .filter((m) => m.sku)
    .map((m) => ({
      sku: m.sku!,
      quantity: m.quantity,
    }));

  if (lines.length === 0) {
    return null;
  }

  const subtotal = routingResult.estimate.totalCost;
  const estimatedTax = subtotal * 0.0825; // 8.25% estimate

  return {
    estimateId: routingResult.estimate.id,
    branchId: routingResult.branch.id,
    lines,
    deliveryMethod,
    deliveryAddress,
    requestedDate,
    subtotal,
    estimatedTax,
    total: subtotal + estimatedTax,
  };
}

/**
 * Submit order to ABC Supply
 */
export async function submitOrder(
  draft: OrderDraft,
  orgAccountId: string,
  poNumber?: string,
  notes?: string
) {
  const client = getABCSupplyClient(orgAccountId);

  const order = await client.createOrder({
    branchId: draft.branchId,
    lines: draft.lines,
    deliveryMethod: draft.deliveryMethod,
    deliveryAddress: draft.deliveryAddress,
    requestedDeliveryDate: draft.requestedDate,
    poNumber,
    notes,
  });

  return order;
}

// ============================================================================
// Quick Estimate (from claim data)
// ============================================================================

export interface ClaimRoofData {
  /** Total area from measurements */
  totalArea?: number;
  /** Roof pitch */
  pitch?: string;
  /** Ridge length */
  ridgeLength?: number;
  /** Hip length */
  hipLength?: number;
  /** Valley length */
  valleyLength?: number;
  /** Eave length */
  eaveLength?: number;
  /** Rake length */
  rakeLength?: number;
  /** Shingle type requested */
  shingleType?: ShingleSpec["type"];
  /** Color preference */
  shingleColor?: string;
}

/**
 * Create a material estimate from claim roof data
 * Uses industry standard defaults for missing measurements
 */
export function estimateFromClaimData(claimData: ClaimRoofData): MaterialEstimate {
  const totalArea = claimData.totalArea || 2000; // Default 2000 sq ft
  const pitch = claimData.pitch || "6/12";

  // Estimate linear measurements if not provided (based on typical ratios)
  const perimeter = Math.sqrt(totalArea) * 4;
  const ridgeLength = claimData.ridgeLength || Math.sqrt(totalArea) * 0.8;
  const hipLength = claimData.hipLength || 0;
  const valleyLength = claimData.valleyLength || 0;
  const eaveLength = claimData.eaveLength || perimeter * 0.5;
  const rakeLength = claimData.rakeLength || perimeter * 0.3;

  // Determine complexity
  let complexity: keyof typeof WASTE_FACTORS = "MEDIUM";
  if (hipLength > 0 && valleyLength > 0) {
    complexity = "HIGH";
  } else if (valleyLength > ridgeLength) {
    complexity = "VERY_HIGH";
  } else if (hipLength === 0 && valleyLength === 0) {
    complexity = "LOW";
  }

  const measurements: RoofMeasurements = {
    totalArea,
    pitch,
    ridgeLength,
    hipLength,
    valleyLength,
    eaveLength,
    rakeLength,
    complexity,
  };

  const shingleSpec: ShingleSpec = {
    type: claimData.shingleType || "ARCHITECTURAL",
    manufacturer: "GAF",
    color: claimData.shingleColor || "Charcoal",
    productLine: "Timberline HDZ",
  };

  return calculateMaterials(measurements, shingleSpec);
}
