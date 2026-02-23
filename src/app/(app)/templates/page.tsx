import { redirect } from "next/navigation";

/**
 * /templates → /templates/projects redirect
 *
 * The templates area lives under /templates/projects.
 * This page prevents a 404 when users click "Templates" in nav.
 */
export default function TemplatesPage() {
  redirect("/templates/projects");
}
