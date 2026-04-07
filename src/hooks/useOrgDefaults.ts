import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

type OrgDefaults = {
  default_mode?: string;
  default_photo_layout?: number;
};

export function useOrgDefaults() {
  const [defaults, setDefaults] = useState<OrgDefaults>();

  useEffect(() => {
    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: prof } = await supabase
        .from("user_profiles")
        .select("org_id")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!prof?.org_id) return;

      const { data: orgDefaults } = await supabase
        .from("org_defaults")
        .select("*")
        .eq("org_id", prof.org_id)
        .maybeSingle();

      if (orgDefaults) {
        setDefaults({
          default_mode: orgDefaults.default_mode,
          default_photo_layout: orgDefaults.default_photo_layout,
        });
      }
    })();
  }, []);

  return defaults;
}
