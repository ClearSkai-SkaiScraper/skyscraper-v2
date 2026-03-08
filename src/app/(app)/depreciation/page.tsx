import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

/**
 * Depreciation Builder Redirect
 * The canonical builder lives at /ai/tools/depreciation.
 * This page redirects to prevent stale bookmarks from breaking.
 */
export default function DepreciationPage() {
  redirect("/ai/tools/depreciation");
}
