import { Lock } from "lucide-react";
import Link from "next/link";

import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { Button } from "@/components/ui/button";

interface AuthRequiredStateProps {
  /** URL to redirect back to after sign-in */
  redirectUrl: string;
  /** Custom message explaining why auth is needed */
  message?: string;
  /** Custom title (default: "Sign In Required") */
  title?: string;
}

/**
 * Shared auth-required state card.
 * Renders a centered lock icon, title, message, and sign-in CTA.
 * Dark-mode safe. Use inside a PageContainer where auth check fails.
 */
export function AuthRequiredState({
  redirectUrl,
  message = "Please sign in to access this page.",
  title = "Sign In Required",
}: AuthRequiredStateProps) {
  return (
    <PageSectionCard>
      <div className="py-8 text-center">
        <Lock className="mx-auto mb-4 h-12 w-12 text-slate-400 dark:text-slate-500" />
        <h2 className="mb-2 text-xl font-bold text-slate-900 dark:text-white">{title}</h2>
        <p className="mb-4 text-sm text-slate-500 dark:text-slate-400">{message}</p>
        <Button asChild>
          <Link href={`/sign-in?redirect_url=${redirectUrl}`}>Sign In →</Link>
        </Button>
      </div>
    </PageSectionCard>
  );
}
