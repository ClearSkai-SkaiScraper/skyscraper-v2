export type AddonKey = "qr" | "branding" | "map" | "weather" | "codes" | "vendor";

export type Addon = {
  key: AddonKey;
  title: string;
  defaultOn?: boolean;
  requires?: Array<"latlng" | "branding" | "photos" | "vendor">;
  // merge additional data into the build context
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  apply: (ctx: any) => Promise<any> | any;
};

export const AddonRegistry: Record<AddonKey, Addon> = {
  qr: {
    key: "qr",
    title: "QR / Share Link",
    defaultOn: true,
    apply: (ctx) => ctx,
  },
  branding: {
    key: "branding",
    title: "Branding Block",
    defaultOn: true,
    requires: ["branding"],
    apply: (ctx) => ctx,
  },
  map: {
    key: "map",
    title: "Map Snapshot",
    defaultOn: true,
    requires: ["latlng"],
    apply: (ctx) => ctx,
  },
  weather: {
    key: "weather",
    title: "Weather Verification",
    defaultOn: false,
    apply: async (ctx) => {
      // placeholder — server route will enrich
      ctx.weatherRequested = true;
      return ctx;
    },
  },
  codes: {
    key: "codes",
    title: "Code Compliance",
    defaultOn: false,
    apply: async (ctx) => {
      ctx.codesRequested = true;
      return ctx;
    },
  },
  vendor: {
    key: "vendor",
    title: "Vendor & Color",
    defaultOn: false,
    requires: ["vendor"],
    apply: (ctx) => ctx,
  },
};

export function normalizeAddons(requested: AddonKey[] | undefined): AddonKey[] {
  const base = (requested && requested.length ? requested : []) as AddonKey[];
  const withDefaults = new Set<AddonKey>(base);
  (Object.values(AddonRegistry) as Addon[]).forEach((a) => {
    if (a.defaultOn) withDefaults.add(a.key as AddonKey);
  });
  return Array.from(withDefaults);
}
