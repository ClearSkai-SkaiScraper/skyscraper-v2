"use client";

/**
 * Scope Editor Hub — Legacy redirect
 *
 * The standalone Scope Editor has been merged into the Supplement Builder.
 * This redirect prevents stale bookmarks from breaking.
 */

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function ScopeEditorRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/ai/tools/supplement");
  }, [router]);
  return (
    <div className="flex items-center justify-center py-24 text-muted-foreground">
      Redirecting to Supplement Builder…
    </div>
  );
}
