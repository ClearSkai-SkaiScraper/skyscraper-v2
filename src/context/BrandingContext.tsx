import React, { createContext, ReactNode,useContext, useEffect, useState } from "react";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type TemplateDefaults = Record<string, any> | null;

export type Branding = {
  org_id: string;
  name?: string;
  logo_url?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  font_family?: string | null;
  template_defaults?: TemplateDefaults;
};

const BrandingContext = createContext<{
  branding: Branding | null;
  setBranding: (b: Branding | null) => void;
}>({ branding: null, setBranding: () => {} });

export function BrandingProvider({
  orgId,
  children,
}: {
  orgId?: string | null;
  children: ReactNode;
}) {
  const [branding, setBranding] = useState<Branding | null>(null);

  useEffect(() => {
    if (!orgId) return;
    fetch(`/api/org/${orgId}/branding`)
      .then((r) => r.json())
      .then((json) => {
        if (json?.ok && json.branding) setBranding(json.branding as Branding);
      })
      .catch(() => {});
  }, [orgId]);

  return (
    <BrandingContext.Provider value={{ branding, setBranding }}>
      {children}
    </BrandingContext.Provider>
  );
}

export function useBranding() {
  return useContext(BrandingContext);
}

export default BrandingContext;
