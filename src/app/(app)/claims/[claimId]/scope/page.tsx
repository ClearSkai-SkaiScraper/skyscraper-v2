"use client";

/**
 * Scope Editor Page -> Supplement Builder Redirect
 *
 * The Scope Editor has been merged into the Supplement Builder, which has
 * all the same line-item editing capabilities plus AI generation, category
 * picker, and export/save features.
 *
 * This redirect preserves the Scope tab in ClaimTabs by forwarding to
 * the Supplement Builder with the claimId.
 */

import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ScopeRedirectPage() {
  const params = useParams<{ claimId: string }>();
  const router = useRouter();

  useEffect(() => {
    if (params?.claimId) {
      router.replace("/ai/tools/supplement?claimId=" + params.claimId);
    }
  }, [params?.claimId, router]);

  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      Opening Supplement Builder...
    </div>
  );
}
