const fs = require("fs");
const path = require("path");

const TEMPLATES = [
  {
    slug: "depreciation-analysis-premium",
    title: "Depreciation Analysis",
    icon: "📉",
    color: "#7c3aed",
    category: "Insurance",
  },
  {
    slug: "detailed-contractor-proposal",
    title: "Detailed Proposal",
    icon: "📋",
    color: "#0284c7",
    category: "Retail",
  },
  {
    slug: "fire-loss-documentation",
    title: "Fire Loss Report",
    icon: "🔥",
    color: "#dc2626",
    category: "Insurance",
  },
  {
    slug: "hail-damage-inspection",
    title: "Hail Inspection",
    icon: "🌨️",
    color: "#0ea5e9",
    category: "Sales Material",
  },
  {
    slug: "initial-claim-inspection",
    title: "Initial Inspection",
    icon: "🔍",
    color: "#8b5cf6",
    category: "Sales Material",
  },
  {
    slug: "interior-damage-assessment",
    title: "Interior Damage",
    icon: "🏠",
    color: "#f59e0b",
    category: "Insurance",
  },
  {
    slug: "professional-damage-assessment",
    title: "Pro Damage Assessment",
    icon: "✅",
    color: "#10b981",
    category: "Insurance",
  },
  {
    slug: "public-adjuster-premium",
    title: "Public Adjuster",
    icon: "👨‍💼",
    color: "#6366f1",
    category: "Insurance",
  },
  {
    slug: "quick-inspection-report",
    title: "Quick Inspection",
    icon: "⚡",
    color: "#f97316",
    category: "Sales Material",
  },
  {
    slug: "restoration-company-special",
    title: "Restoration Special",
    icon: "🔧",
    color: "#14b8a6",
    category: "Insurance",
  },
  {
    slug: "roofing-inspection-premium",
    title: "Premium Roof Inspection",
    icon: "🏡",
    color: "#be185d",
    category: "Insurance",
  },
  {
    slug: "roofing-specialist-report",
    title: "Roofing Specialist",
    icon: "🔨",
    color: "#9333ea",
    category: "Insurance",
  },
  {
    slug: "standard-roof-damage-report",
    title: "Standard Roof Report",
    icon: "📝",
    color: "#2563eb",
    category: "Insurance",
  },
  {
    slug: "storm-damage-comprehensive",
    title: "Storm Damage Report",
    icon: "🌪️",
    color: "#4f46e5",
    category: "Insurance",
  },
  {
    slug: "supplement-line-item-premium",
    title: "Supplement Line Item",
    icon: "📊",
    color: "#16a34a",
    category: "Insurance",
  },
  {
    slug: "supplement-request-template",
    title: "Supplement Request",
    icon: "📤",
    color: "#0d9488",
    category: "Insurance",
  },
  {
    slug: "water-damage-assessment",
    title: "Water Damage",
    icon: "💧",
    color: "#0369a1",
    category: "Insurance",
  },
  {
    slug: "water-damage-restoration-cmjbneed",
    title: "Water Restoration CMJ",
    icon: "🌊",
    color: "#0c4a6e",
    category: "Insurance",
  },
  {
    slug: "water-damage-restoration-tmpl_wat",
    title: "Water Restoration Pro",
    icon: "🚿",
    color: "#155e75",
    category: "Insurance",
  },
  {
    slug: "weather-correlation-premium",
    title: "Weather Correlation",
    icon: "📈",
    color: "#7e22ce",
    category: "Insurance",
  },
  {
    slug: "weather-damage-report",
    title: "Weather Damage",
    icon: "☁️",
    color: "#64748b",
    category: "Insurance",
  },
  {
    slug: "weather-damage-specialist",
    title: "Weather Specialist",
    icon: "🌤️",
    color: "#475569",
    category: "Insurance",
  },
  {
    slug: "wind-damage-report",
    title: "Wind Damage",
    icon: "💨",
    color: "#0f766e",
    category: "Insurance",
  },
];

function getCategoryGradient(category) {
  switch (category) {
    case "Insurance":
      return { from: "#1e3a8a", to: "#3b82f6" };
    case "Retail":
      return { from: "#065f46", to: "#10b981" };
    case "Sales Material":
      return { from: "#581c87", to: "#a855f7" };
    default:
      return { from: "#1f2937", to: "#6b7280" };
  }
}

function createSvg(template) {
  const gradient = getCategoryGradient(template.category);
  const safeTitle = template.title
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const catWidth = Math.max(100, template.category.length * 12 + 30);

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">
  <defs>
    <linearGradient id="bg" x1="0" x2="1" y1="0" y2="1">
      <stop offset="0" stop-color="${gradient.from}"/>
      <stop offset="1" stop-color="${gradient.to}"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="630" fill="url(#bg)"/>
  <rect x="60" y="60" width="1080" height="510" rx="24" fill="#0b1220" opacity="0.45"/>
  <rect x="60" y="60" width="8" height="510" rx="4" fill="${template.color}"/>
  <circle cx="160" cy="180" r="50" fill="${template.color}22"/>
  <circle cx="160" cy="180" r="42" fill="${template.color}44"/>
  <text x="160" y="195" font-size="42" text-anchor="middle">${template.icon}</text>
  <text x="240" y="170" font-family="system-ui" font-size="38" fill="#f8fafc" font-weight="700">${safeTitle}</text>
  <rect x="240" y="195" width="${catWidth}" height="32" rx="6" fill="${template.color}33"/>
  <text x="255" y="217" font-family="system-ui" font-size="16" fill="#e2e8f0" font-weight="500">${template.category}</text>
  <rect x="100" y="280" width="800" height="4" rx="2" fill="#ffffff15"/>
  <rect x="100" y="310" width="650" height="4" rx="2" fill="#ffffff12"/>
  <rect x="100" y="340" width="720" height="4" rx="2" fill="#ffffff10"/>
  <rect x="940" y="490" width="160" height="40" rx="8" fill="#0d9488"/>
  <text x="1020" y="517" text-anchor="middle" font-family="system-ui" font-size="16" fill="#ffffff" font-weight="600">PREVIEW</text>
</svg>`;
}

const outputDir = path.join(__dirname, "..", "public", "template-thumbs");

if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

for (const template of TEMPLATES) {
  const svg = createSvg(template);
  const outputPath = path.join(outputDir, template.slug + ".svg");
  fs.writeFileSync(outputPath, svg, "utf8");
  console.log("Created: " + template.slug + ".svg");
}

console.log("Generated " + TEMPLATES.length + " unique template thumbnails!");
