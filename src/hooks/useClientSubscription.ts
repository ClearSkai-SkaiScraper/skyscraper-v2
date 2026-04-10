import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";

export default function useClientSubscription() {
  const [loading, setLoading] = useState(true);
  const [hasSubscription, setHasSubscription] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [orgRow, setOrgRow] = useState<any | null>(null);

  useEffect(() => {
    let mounted = true;
    void (async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) {
          if (mounted) {
            setHasSubscription(false);
            setLoading(false);
          }
          return;
        }

        // For now, assume all authenticated users have subscription access
        // TODO: Implement proper subscription checking once Prisma types are regenerated
        if (mounted) {
          setHasSubscription(true);
          setLoading(false);
        }
      } catch (_e) {
        if (mounted) {
          setHasSubscription(false);
          setLoading(false);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  return { loading, hasSubscription, orgRow };
}
