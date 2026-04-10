export type SectionKey =
  | "summary"
  | "map"
  | "photos"
  | "damage"
  | "weather"
  | "vendor"
  | "codes"
  | "pricing"
  | "footer";

export type SectionConfig = {
  key: SectionKey;
  title: string;
  emoji?: string;
  auto?: boolean;
  dedupe?: boolean;
  requires?: Array<"branding" | "latlng" | "photos" | "vendor">;
  render: (ctx: any) => Promise<void> | void; // hook for PDF/React renderer
};

type Registry = Record<SectionKey, SectionConfig>;

const registry: Registry = {
  summary: {
    key: "summary",
    title: "Executive Summary",
    emoji: "📄",
    auto: true,
    dedupe: true,
    render: () => {},
  },
  map: {
    key: "map",
    title: "Map Snapshot",
    emoji: "🗺️",
    auto: true,
    requires: ["latlng"],
    dedupe: true,
    render: () => {},
  },
  photos: {
    key: "photos",
    title: "Photo Evidence",
    emoji: "📸",
    dedupe: true,
    requires: ["photos"],
    render: () => {},
  },
  damage: { key: "damage", title: "Damage Assessment", emoji: "🛠️", render: () => {} },
  weather: { key: "weather", title: "Weather Verification", emoji: "⛈️", render: () => {} },
  vendor: {
    key: "vendor",
    title: "Selected System",
    emoji: "🏢",
    requires: ["vendor"],
    render: () => {},
  },
  codes: { key: "codes", title: "Code Compliance", emoji: "📜", render: () => {} },
  pricing: { key: "pricing", title: "Pricing & Totals", emoji: "💲", render: () => {} },
  footer: {
    key: "footer",
    title: "Document Footer",
    emoji: "📝",
    auto: true,
    dedupe: true,
    requires: ["branding"],
    render: () => {},
  },
};

export const SectionRegistry = {
  ...registry,
  getSection(key: SectionKey) {
    return registry[key];
  },
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  getTemplateSections(templateId?: string): SectionKey[] {
    // For now, return all sections for demo; replace with template logic
    return Object.keys(registry) as SectionKey[];
  },
  getTemplate(templateId?: string) {
    // Dummy template info for sidebar
    if (!templateId) return null;
    return { id: templateId, title: `Template ${templateId}` };
  },
};

// Simple composer that enforces no-duplicate-pages and auto-injection
export function composeSections(baseKeys: SectionKey[], ctx: any): SectionKey[] {
  const seen = new Set<SectionKey>();
  const out: SectionKey[] = [];

  // auto-insert summary & footer if missing
  const ensure = (k: SectionKey) => {
    if (!seen.has(k)) {
      seen.add(k);
      out.push(k);
    }
  };

  for (const k of baseKeys) ensure(k);

  // auto inject map if lat/lng present
  if (ctx?.lat && ctx?.lng) ensure("map");

  // always ensure summary & footer
  ensure("summary");
  ensure("footer");

  return out;
}
