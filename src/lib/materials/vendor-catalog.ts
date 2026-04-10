/**
 * Material Vendor Catalog System
 *
 * Comprehensive database of roofing materials from major manufacturers.
 * Includes color swatches, specifications, pricing, warranties.
 * Used for material selection and brochure generation.
 */

export interface MaterialColor {
  name: string;
  hexCode: string;
  imageUrl?: string; // Swatch or shingle photo
  description: string;
  popularity: "high" | "medium" | "low";
}

export interface MaterialProduct {
  id: string;
  manufacturer: "GAF" | "Owens Corning" | "CertainTeed" | "Tamko" | "IKO";
  productLine: string;
  name: string;
  type: "architectural" | "3-tab" | "designer" | "metal" | "tile";
  warranty: number; // years
  windRating: number; // mph
  impactRating?: "Class 3" | "Class 4";
  colors: MaterialColor[];
  specifications: {
    weight: string; // per square
    coverage: string; // per bundle
    dimensions: string;
    underlaymentRequired: string;
  };
  pricing: {
    material: number; // per square
    labor: number; // per square
    total: number; // per square
  };
  features: string[];
  bestFor: string[];
}

/**
 * Comprehensive Material Catalog
 */
export const MATERIAL_CATALOG: MaterialProduct[] = [
  // GAF Products
  {
    id: "gaf-timberline-hdz",
    manufacturer: "GAF",
    productLine: "Timberline HDZ",
    name: "Timberline HDZ Architectural Shingles",
    type: "architectural",
    warranty: 30,
    windRating: 130,
    impactRating: "Class 4",
    colors: [
      {
        name: "Charcoal",
        hexCode: "#3C3C3C",
        description: "Classic dark gray with black accents",
        popularity: "high",
      },
      {
        name: "Weathered Wood",
        hexCode: "#8B7355",
        description: "Natural wood tones with brown highlights",
        popularity: "high",
      },
      {
        name: "Oyster Gray",
        hexCode: "#A39E93",
        description: "Light gray with subtle cream undertones",
        popularity: "medium",
      },
      {
        name: "Pewter Gray",
        hexCode: "#7A7A7A",
        description: "Medium gray with silver highlights",
        popularity: "medium",
      },
      {
        name: "Shakewood",
        hexCode: "#6B5D52",
        description: "Rich brown with cedar shake texture",
        popularity: "medium",
      },
      {
        name: "Barkwood",
        hexCode: "#5C4A3F",
        description: "Deep brown with natural wood grain",
        popularity: "low",
      },
    ],
    specifications: {
      weight: "240 lbs per square",
      coverage: "98.4 sq ft per bundle (3 bundles/square)",
      dimensions: '13-1/4" x 39-3/8"',
      underlaymentRequired: "GAF FeltBuster or Tiger Paw",
    },
    pricing: {
      material: 120,
      labor: 180,
      total: 300,
    },
    features: [
      "LayerLock technology",
      "StrikeZone nailing area",
      "Dual Shadow Line",
      "Algae protection",
      "Class 4 impact resistance",
    ],
    bestFor: [
      "High wind areas",
      "Hail-prone regions",
      "Premium residential",
      "Insurance discounts",
    ],
  },
  {
    id: "gaf-camelot-ii",
    manufacturer: "GAF",
    productLine: "Camelot II",
    name: "Camelot II Designer Shingles",
    type: "designer",
    warranty: 50,
    windRating: 130,
    impactRating: "Class 4",
    colors: [
      {
        name: "Royal Slate",
        hexCode: "#4A5568",
        description: "Authentic slate appearance with blue-gray tones",
        popularity: "high",
      },
      {
        name: "Barkwood",
        hexCode: "#5C4A3F",
        description: "Rustic wood shake look",
        popularity: "medium",
      },
      {
        name: "Antique Slate",
        hexCode: "#6B7280",
        description: "Aged slate with weathered charm",
        popularity: "medium",
      },
    ],
    specifications: {
      weight: "430 lbs per square",
      coverage: "65 sq ft per bundle (5 bundles/square)",
      dimensions: '18-1/2" x 13"',
      underlaymentRequired: "GAF Deck-Armor or FeltBuster",
    },
    pricing: {
      material: 280,
      labor: 220,
      total: 500,
    },
    features: [
      "Extra-thick construction",
      "Ultra-dimensional appearance",
      "Superior shadow lines",
      "Limited lifetime warranty",
      "Class 4 impact rating",
    ],
    bestFor: ["Luxury homes", "Historic properties", "Slate replacement", "Maximum curb appeal"],
  },

  // Owens Corning Products
  {
    id: "oc-duration",
    manufacturer: "Owens Corning",
    productLine: "Duration",
    name: "Duration Architectural Shingles",
    type: "architectural",
    warranty: 30,
    windRating: 130,
    colors: [
      {
        name: "Onyx Black",
        hexCode: "#1A1A1A",
        description: "Deep black with subtle texture",
        popularity: "high",
      },
      {
        name: "Estate Gray",
        hexCode: "#6E6E6E",
        description: "Elegant gray with silver accents",
        popularity: "high",
      },
      {
        name: "Driftwood",
        hexCode: "#9E8B7B",
        description: "Warm beige with brown tones",
        popularity: "medium",
      },
      {
        name: "Harbor Blue",
        hexCode: "#4A6FA5",
        description: "Coastal blue-gray blend",
        popularity: "low",
      },
    ],
    specifications: {
      weight: "260 lbs per square",
      coverage: "98.4 sq ft per bundle (3 bundles/square)",
      dimensions: '13-1/4" x 39-3/8"',
      underlaymentRequired: "Owens Corning ProArmor or RhinoRoof",
    },
    pricing: {
      material: 115,
      labor: 175,
      total: 290,
    },
    features: [
      "SureNail Technology",
      "TruDefinition color",
      "Algae resistance",
      "Patented SureNail strip",
      "30-year warranty",
    ],
    bestFor: [
      "Standard residential",
      "Budget-conscious quality",
      "Color variety",
      "Reliable performance",
    ],
  },

  // CertainTeed Products
  {
    id: "ct-landmark",
    manufacturer: "CertainTeed",
    productLine: "Landmark",
    name: "Landmark Architectural Shingles",
    type: "architectural",
    warranty: 30,
    windRating: 110,
    colors: [
      {
        name: "Colonial Slate",
        hexCode: "#4B5563",
        description: "Traditional slate gray blend",
        popularity: "high",
      },
      {
        name: "Resawn Shake",
        hexCode: "#7A6A5C",
        description: "Natural cedar shake appearance",
        popularity: "medium",
      },
      {
        name: "Weathered Wood",
        hexCode: "#8B7B6A",
        description: "Aged wood with gray undertones",
        popularity: "medium",
      },
    ],
    specifications: {
      weight: "240 lbs per square",
      coverage: "98.4 sq ft per bundle (3 bundles/square)",
      dimensions: '13-1/4" x 39-3/8"',
      underlaymentRequired: "CertainTeed WinterGuard or DiamondDeck",
    },
    pricing: {
      material: 110,
      labor: 170,
      total: 280,
    },
    features: [
      "Two-piece laminate design",
      "Class A fire rating",
      "StreakFighter protection",
      "30-year limited warranty",
      "Nailing zone indicator",
    ],
    bestFor: [
      "Value-oriented projects",
      "Standard residential",
      "Replacement roofs",
      "Builder-grade quality",
    ],
  },
];

/**
 * Find products by manufacturer
 */
export function getProductsByManufacturer(
  manufacturer: MaterialProduct["manufacturer"]
): MaterialProduct[] {
  return MATERIAL_CATALOG.filter((p) => p.manufacturer === manufacturer);
}

/**
 * Find product by ID
 */
export function getProductById(id: string): MaterialProduct | undefined {
  return MATERIAL_CATALOG.find((p) => p.id === id);
}

/**
 * Get recommended products based on damage type and budget
 */
export function getRecommendedProducts(params: {
  damageType?: "hail" | "wind" | "age";
  budget?: "economy" | "standard" | "premium";
  impactResistance?: boolean;
}): MaterialProduct[] {
  let products = [...MATERIAL_CATALOG];

  // Filter by impact resistance if needed
  if (params.impactResistance) {
    products = products.filter((p) => p.impactRating === "Class 4");
  }

  // Filter by budget
  if (params.budget === "economy") {
    products = products.filter((p) => p.pricing.total <= 300);
  } else if (params.budget === "premium") {
    products = products.filter((p) => p.pricing.total >= 400);
  }

  // Sort by relevance
  return products.sort((a, b) => b.windRating - a.windRating);
}

/**
 * Generate material comparison table
 */
export function generateMaterialComparison(productIds: string[]): string {
  const products = productIds
    .map((id) => getProductById(id))
    .filter((p): p is MaterialProduct => p !== undefined);

  const lines: string[] = [];
  lines.push("MATERIAL COMPARISON");
  lines.push("═".repeat(80));
  lines.push("");

  products.forEach((product, idx) => {
    lines.push(`${idx + 1}. ${product.name}`);
    lines.push(`   Manufacturer: ${product.manufacturer}`);
    lines.push(`   Warranty: ${product.warranty} years`);
    lines.push(`   Wind Rating: ${product.windRating} mph`);
    if (product.impactRating) {
      lines.push(`   Impact Rating: ${product.impactRating}`);
    }
    lines.push(`   Price: $${product.pricing.total}/sq`);
    lines.push(`   Colors: ${product.colors.length} options`);
    lines.push("");
  });

  return lines.join("\n");
}

/**
 * Generate material brochure for homeowner
 */
export function generateMaterialBrochure(productId: string): {
  success: boolean;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  data?: any;
  error?: string;
} {
  const product = getProductById(productId);
  if (!product) {
    return { success: false, error: "Product not found" };
  }

  return {
    success: true,
    data: {
      title: `${product.name} - Material Guide`,
      manufacturer: product.manufacturer,
      productLine: product.productLine,
      warranty: `${product.warranty} Year Limited Warranty`,
      windRating: `Wind Resistance: ${product.windRating} mph`,
      impactRating: product.impactRating ? `Impact Rating: ${product.impactRating}` : undefined,
      colors: product.colors.map((c) => ({
        name: c.name,
        hex: c.hexCode,
        description: c.description,
        popularity: c.popularity,
      })),
      specifications: product.specifications,
      pricing: {
        material: `$${product.pricing.material}/sq`,
        labor: `$${product.pricing.labor}/sq`,
        total: `$${product.pricing.total}/sq`,
      },
      features: product.features,
      bestFor: product.bestFor,
    },
  };
}
