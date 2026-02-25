"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

/**
 * Commission Plans have been merged into the main /commissions page.
 * This page now redirects there automatically.
 */
export default function CommissionPlansRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/commissions");
  }, [router]);

  return (
    <div className="flex min-h-[400px] items-center justify-center">
      <p className="text-sm text-slate-500 dark:text-slate-400">
        Redirecting to Commission Tracker…
      </p>
    </div>
  );
}
