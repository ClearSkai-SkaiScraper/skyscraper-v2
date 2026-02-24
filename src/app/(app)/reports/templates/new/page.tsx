import { redirect } from "next/navigation";

import { safeOrgContext } from "@/lib/safeOrgContext";

import { TemplateEditor } from "../_components/TemplateEditor";

export default async function NewTemplatePage() {
  const ctx = await safeOrgContext();
  if (ctx.status === "unauthenticated" || !ctx.userId) redirect("/sign-in");
  if (ctx.status !== "ok" || !ctx.orgId) redirect("/dashboard");

  return <TemplateEditor orgId={ctx.orgId} userId={ctx.userId} />;
}
