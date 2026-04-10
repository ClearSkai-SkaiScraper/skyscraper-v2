// Placeholder module fetchers for Report Assembly
// TODO: Replace stubs with real data integrations to existing APIs.
export type AssemblyModuleKey =
  | 'cover'
  | 'damage_photos'
  | 'code_compliance'
  | 'weather_quick'
  | 'weather_full'
  | 'mockup'
  | 'claims_blueprint'
  | 'warranties'
  | 'restoration_roadmap'
  | 'vendor_brochures';

export interface ModuleContent {
  id: AssemblyModuleKey;
  title: string;
  body: string;
  artifacts?: Array<{ label: string; url?: string }>; // future links / images
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function fetchModuleContent(id: AssemblyModuleKey, claimId?: string): Promise<ModuleContent> {
  switch (id) {
    case 'cover':
      return { id, title: 'Cover Page', body: 'Branding cover will render company logo, contact info, client name & claim reference.' };
    case 'damage_photos':
      return { id, title: 'AI Damage Photos', body: 'Captioned photo breakdown placeholder. Integrate /api/ai/damage/analyze results.' };
    case 'code_compliance':
      return { id, title: 'Code & Compliance', body: 'Building code references & manufacturer specs placeholder.' };
    case 'weather_quick':
      return { id, title: 'Quick DOL Pull', body: 'Rapid date-of-loss snapshot via /api/weather/quick-dol.' };
    case 'weather_full':
      return { id, title: 'Full Weather Report', body: 'Comprehensive storm verification data placeholder.' };
    case 'mockup':
      return { id, title: 'AI Property Mockup', body: 'Visual restoration concept (integrate mockup generation endpoint).' };
    case 'claims_blueprint':
      return { id, title: 'Claims Blueprint', body: 'Timeline & strategic phases placeholder.' };
    case 'warranties':
      return { id, title: 'Warranties', body: 'Material & workmanship warranty summary placeholder.' };
    case 'restoration_roadmap':
      return { id, title: 'Restoration Roadmap', body: 'Phase-by-phase build & restoration sequence placeholder.' };
    case 'vendor_brochures':
      return { id, title: 'Vendor Brochures', body: 'Color & material brochure links placeholder.' };
    default:
      return { id, title: 'Unknown Module', body: 'No content available.' };
  }
}

export async function fetchAllSelectedModules(keys: AssemblyModuleKey[], claimId?: string) {
  const results: ModuleContent[] = [];
  for (const k of keys) {
    results.push(await fetchModuleContent(k, claimId));
  }
  return results;
}
