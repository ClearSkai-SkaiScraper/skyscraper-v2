// Shared types for report rendering and preview parity
export type SlotKey = "A" | "B1" | "B2" | "D" | "E" | "F";

export type ReportType =
  | SlotKey
  | "Weather"
  | "Scope"
  | "PhotoLog"
  | "Estimate"
  | "Supplement"
  | "Packet";

export interface OrgStaffMember {
  id?: string;
  user_id?: string;
  role?: string;
  display_name?: string;
  title?: string;
  headshot_url?: string;
}

export interface OrgInfo {
  id?: string;
  name: string;
  roc?: string;
  logoUrl?: string;
  phone?: string;
  email?: string;
  address?: string | { street?: string; city?: string; state?: string; zip?: string };
  colors?: { primary?: string; accent?: string; highlight?: string };
  staff_primary?: OrgStaffMember;
}

export interface ProjectInfo {
  id?: string;
  address?: string;
  lat?: number;
  lon?: number;
  roof?: { system?: string; slope?: string; squares?: number };
}

export interface ClaimInfo {
  id?: string;
  carrier?: string;
  carrierId?: string;
  acv_or_rcv?: "ACV" | "RCV";
  claim_no?: string;
  deductible?: number;
  dol?: string;
}

export interface WeatherInfo {
  source?: string;
  event_type?: string;
  event_date?: string;
  hail_size_in?: number;
  confidence?: number;
  map_url?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  raw?: any;
}

export interface ScopeItem {
  code?: string;
  desc?: string;
  qty?: number;
  uom?: string;
}

export interface ScopeInfo {
  items?: ScopeItem[];
  waste_pct?: number;
}

export interface PhotoInfo {
  url: string;
  label?: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  exif?: any;
  tags?: string[];
}

export interface RenderContext {
  org: OrgInfo;
  project?: ProjectInfo;
  claim?: ClaimInfo;
  weather?: WeatherInfo;
  scope?: ScopeInfo;
  photos?: PhotoInfo[];
  // carrier profile transform (applied before render)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  carrierProfile?: any;
  // additional internal metadata
  __required_docs?: string[];
}

export interface ReportRecord {
  id: string;
  project_id: string;
  org_id: string;
  type: ReportType;
  pdf_url?: string;
  status?: string;
}

export default RenderContext;
