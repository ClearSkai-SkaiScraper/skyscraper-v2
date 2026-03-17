import { Database, Key, Webhook, Zap } from "lucide-react";

import { AccessDenied } from "@/components/auth/AccessDenied";
import { NoOrgMembershipBanner } from "@/components/guards/NoOrgMembershipBanner";
import AccuLynxMigration from "@/components/integrations/AccuLynxMigration";
import WebhookForm from "@/components/integrations/WebhookForm";
import { PageHero } from "@/components/layout/PageHero";
import { checkRole } from "@/lib/auth/rbac";
import { getTenant } from "@/lib/auth/tenant";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Integrations | SkaiScraper",
  description: "Connect external tools, webhooks, and data sources to your workspace.",
};

export default async function IntegrationsPage() {
  // 🛡️ MASTER PROMPT #66: RBAC Protection - requires "admin" role
  const { hasAccess, role } = await checkRole("admin");

  if (!hasAccess) {
    return (
      <AccessDenied
        requiredRole="admin"
        currentRole={role}
        message="Only administrators can manage integrations and API keys."
      />
    );
  }

  const orgId = await getTenant();
  if (!orgId) {
    return <NoOrgMembershipBanner title="Integrations" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <PageHero
        title="Integrations & API"
        subtitle="Connect external services, webhooks, and CRM systems"
        icon={<Zap className="h-5 w-5" />}
      />

      {/* Integration Cards */}
      <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
        {/* Webhooks */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-sky-50 to-blue-50 p-6 dark:from-sky-950/30 dark:to-blue-950/30">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-purple-100 p-3 dark:bg-purple-900/50">
              <Webhook className="h-6 w-6 text-purple-600 dark:text-purple-400" />
            </div>
            <h3 className="text-xl font-bold text-[color:var(--text)]">Webhooks</h3>
          </div>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Receive real-time notifications when events occur in your organization
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
              0 Active
            </span>
          </div>
        </div>

        {/* API Keys */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-orange-50 to-red-50 p-6 dark:from-orange-950/30 dark:to-red-950/30">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-orange-100 p-3 dark:bg-orange-900/50">
              <Key className="h-6 w-6 text-orange-600 dark:text-orange-400" />
            </div>
            <h3 className="text-xl font-bold text-[color:var(--text)]">API Keys</h3>
          </div>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Generate API keys for programmatic access to your data
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="rounded-full bg-blue-100 px-2 py-1 font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
              0 Keys
            </span>
          </div>
        </div>

        {/* AccuLynx / CRM Migration */}
        <div className="rounded-2xl border border-[color:var(--border)] bg-gradient-to-br from-indigo-50 to-purple-50 p-6 dark:from-indigo-950/30 dark:to-purple-950/30">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-xl bg-indigo-100 p-3 dark:bg-indigo-900/50">
              <Database className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
            </div>
            <h3 className="text-xl font-bold text-[color:var(--text)]">AccuLynx Migration</h3>
          </div>
          <p className="mb-4 text-slate-700 dark:text-slate-300">
            Import contacts, jobs, and pipeline data from AccuLynx
          </p>
          <div className="flex items-center gap-2 text-sm text-slate-700 dark:text-slate-300">
            <span className="rounded-full bg-green-100 px-2 py-1 font-medium text-green-800 dark:bg-green-900 dark:text-green-200">
              Ready
            </span>
          </div>
        </div>
      </div>

      {/* Webhook Setup */}
      <div>
        <h2 className="mb-4 text-2xl font-bold text-[color:var(--text)]">Configure Webhooks</h2>
        <WebhookForm />
      </div>

      {/* AccuLynx Migration */}
      <AccuLynxMigration />

      {/* Documentation */}
      <div className="rounded-2xl border border-blue-200 bg-blue-50 p-6 dark:border-blue-800 dark:bg-blue-900/20">
        <h3 className="mb-3 text-lg font-bold text-blue-900 dark:text-blue-100">
          📚 API Documentation
        </h3>
        <p className="mb-4 text-blue-700 dark:text-blue-300">
          Learn how to integrate with SkaiScraper using our comprehensive API documentation.
        </p>
        <ul className="space-y-2 text-sm text-blue-600 dark:text-blue-400">
          <li>• Webhook signature verification</li>
          <li>• REST API endpoints and authentication</li>
          <li>• Event payload schemas</li>
          <li>• Rate limiting and best practices</li>
        </ul>
      </div>
    </div>
  );
}
