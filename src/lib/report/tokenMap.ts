// Minimal token map helper for SkaiScraper™ intake → used by mockup generator and PDF renderer
export type TokenMap = Record<string, string>;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function buildTokenMap(payload: any, brand: any): TokenMap {
  // payload is expected to be the report_intake-like shape
  const t: TokenMap = {};
  t["{{brand.logoUrl}}"] = (brand && brand.logo_url) || "";
  t["{{licenses.rocNumber}}"] = payload?.licenses?.rocNumber || brand?.roc_number || "";
  t["{{owner.fullName}}"] = payload?.owner?.fullName || "";
  t["{{insurance.carrierName}}"] = payload?.insurance?.carrierName || "";
  t["{{insurance.dol}}"] = payload?.insurance?.dol || "";
  t["{{insurance.policyType}}"] = payload?.insurance?.policyType || "";
  t["{{rep.name}}"] = payload?.rep?.name || "";
  t["{{rep.title}}"] = payload?.rep?.title || "";
  t["{{rep.email}}"] = payload?.rep?.email || "";
  t["{{rep.phone}}"] = payload?.rep?.phone || "";
  t["{{serviceArea}}"] = payload?.service_area || "";
  // team items: team[0]..team[2]
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (payload?.team || []).slice(0, 6).forEach((m: any, i: number) => {
    t[`{{team.${i}.photoUrl}}`] = m?.photoUrl || "";
    t[`{{team.${i}.displayName}}`] = m?.displayName || "";
    t[`{{team.${i}.role}}`] = m?.role || "";
  });
  return t;
}
