import React, { createContext, useContext, useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type Branding = {
  org_id: string;
  logo_url?: string | null;
  logo_path?: string | null;
  primary_color?: string | null;
  secondary_color?: string | null;
  accent_color?: string | null;
  theme_mode?: "light" | "dark" | null;
};

type BrandingContext = {
  branding?: Branding | null;
  refresh: () => Promise<void>;
};

const BrandingCtx = createContext<BrandingContext>({ refresh: async () => {} });

export const useBranding = () => useContext(BrandingCtx);

export const BrandingProvider: React.FC<React.PropsWithChildren> = ({ children }) => {
  const [branding, setBranding] = useState<Branding | null>(null);

  const applyCssVars = (b?: Branding | null) => {
    const root = document.documentElement;
    // Set branding colors (supports both hex and HSL formats)
    root.style.setProperty("--cs-primary", b?.primary_color || "223 69% 32%");
    root.style.setProperty("--cs-secondary", b?.secondary_color || "220 15% 95%");
    root.style.setProperty("--cs-accent", b?.accent_color || "45 93% 63%");
    document.body.dataset.theme = b?.theme_mode || "light";
  };

  const refresh = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      setBranding(null);
      applyCssVars(null);
      return;
    }

    const { data: profile } = await supabase
      .from("user_profiles")
      .select("org_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (!profile?.org_id) {
      setBranding(null);
      applyCssVars(null);
      return;
    }

    const { data: b } = await supabase
      .from("org_branding")
      .select("*")
      .eq("org_id", profile.org_id)
      .maybeSingle();

    // Cast and normalize the branding data
    const normalizedBranding = b
      ? ({
          ...b,
          theme_mode: (b.theme_mode === "dark" ? "dark" : "light") as "light" | "dark",
        } as Branding)
      : null;

    setBranding(normalizedBranding);
    applyCssVars(normalizedBranding);
  };

  useEffect(() => {
    void refresh();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <BrandingCtx.Provider value={{ branding, refresh }}>{children}</BrandingCtx.Provider>;
};
