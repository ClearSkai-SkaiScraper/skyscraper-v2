import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export function useProposalPresets() {
  const [presets, setPresets] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void loadPresets();
  }, []);

  async function loadPresets() {
    const { data } = await supabase
      .from("org_settings")
      .select("presets")
      .eq("org_slug", "default")
      .maybeSingle();

    setPresets(data?.presets || {});
    setLoading(false);
  }

  return { presets, loading };
}

export function resolvePreset(presets: any, type: "retail" | "insurance" | "comprehensive") {
  return (
    presets?.[type] || {
      sections: ["cover", "overview", "signature"],
      cover: { template: "minimal", subtitle: "" },
      images: { quality: "medium" },
      watermark: null,
    }
  );
}
