/**
 * @deprecated Use getOrgBranding(orgId) from "@/lib/branding/getOrgBranding" instead.
 * This function uses snake_case field names inconsistent with the canonical interface.
 */
type Branding = {
  company_name: string;
  brand_color: string;
  accent_color: string;
  logo_url?: string;
  footer?: string;
};

export function resolveBranding(
  orgBranding: Partial<Branding> | null,
  fallback: Branding
): Branding {
  return {
    company_name: orgBranding?.company_name || fallback.company_name,
    brand_color: orgBranding?.brand_color || fallback.brand_color,
    accent_color: orgBranding?.accent_color || fallback.accent_color,
    logo_url: orgBranding?.logo_url || undefined,
    footer: orgBranding?.footer || fallback.footer,
  };
}
