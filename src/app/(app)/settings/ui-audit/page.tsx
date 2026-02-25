import { auth } from "@clerk/nextjs/server";
import {
  BarChart3,
  Building2,
  FileText,
  FolderKanban,
  Home,
  Image,
  Mail,
  Network,
  Settings,
  Users,
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { Button } from "@/components/ui/button";

export const dynamic = "force-dynamic";

/**
 * UI Audit Page - Quick navigation to all critical pages for final QA
 * Internal admin/dev tool for release verification
 */

interface AuditSection {
  title: string;
  description: string;
  pages: Array<{
    name: string;
    path: string;
    icon: any;
    description: string;
  }>;
}

const auditSections: AuditSection[] = [
  {
    title: "Core Navigation",
    description: "Primary user-facing pages",
    pages: [
      { name: "Dashboard", path: "/dashboard", icon: Home, description: "Main dashboard" },
      {
        name: "Claims List",
        path: "/claims",
        icon: FolderKanban,
        description: "All claims overview",
      },
      {
        name: "Reports",
        path: "/reports",
        icon: FileText,
        description: "Reports marketplace",
      },
      {
        name: "Templates",
        path: "/templates",
        icon: FileText,
        description: "Template marketplace",
      },
      {
        name: "Analytics",
        path: "/reports/analytics",
        icon: BarChart3,
        description: "Analytics dashboard",
      },
    ],
  },
  {
    title: "Network Pages",
    description: "Three-network system pages",
    pages: [
      { name: "Network Hub", path: "/network", icon: Network, description: "Overview hub" },
      {
        name: "Trades Directory",
        path: "/network/trades",
        icon: Users,
        description: "Trades companies list",
      },
      {
        name: "Vendors Directory",
        path: "/network/vendors",
        icon: Building2,
        description: "Vendor locations",
      },
      {
        name: "Client Directory",
        path: "/network/clients",
        icon: Users,
        description: "Client networks",
      },
    ],
  },
  {
    title: "Claim Workspace",
    description: "Claim detail sub-routes (use any claim ID)",
    pages: [
      {
        name: "Claim Overview",
        path: "/claims/[ID]",
        icon: FolderKanban,
        description: "Main workspace",
      },
      {
        name: "Timeline",
        path: "/claims/[ID]/timeline",
        icon: BarChart3,
        description: "Activity timeline",
      },
      {
        name: "Photos",
        path: "/claims/[ID]/photos",
        icon: Image,
        description: "Photo management",
      },
      {
        name: "Documents",
        path: "/claims/[ID]/documents",
        icon: FileText,
        description: "Document library",
      },
      {
        name: "Reports Tab",
        path: "/claims/[ID]/reports",
        icon: FileText,
        description: "Reports + AI artifacts",
      },
      {
        name: "Messages",
        path: "/claims/[ID]/messages",
        icon: Mail,
        description: "Client messages",
      },
    ],
  },
  {
    title: "Settings & Admin",
    description: "Configuration pages",
    pages: [
      {
        name: "Settings",
        path: "/settings",
        icon: Settings,
        description: "User settings",
      },
      {
        name: "Organization",
        path: "/settings/organization",
        icon: Building2,
        description: "Org settings",
      },
      { name: "Team", path: "/settings/team", icon: Users, description: "Team management" },
      {
        name: "Branding",
        path: "/settings/branding",
        icon: FileText,
        description: "Brand customization",
      },
    ],
  },
];

export default async function UIAuditPage() {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="border-b border-gray-200 bg-white">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🔍 UI Audit & QA Navigator</h1>
              <p className="mt-2 text-gray-600">
                Quick access to all critical pages for final release verification
              </p>
            </div>
            <Link href="/settings">
              <Button variant="outline">← Back to Settings</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="space-y-8">
          {auditSections.map((section) => (
            <div key={section.title} className="rounded-lg border border-gray-200 bg-white p-6">
              <h2 className="mb-2 text-xl font-semibold text-gray-900">{section.title}</h2>
              <p className="mb-4 text-sm text-gray-600">{section.description}</p>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
                {section.pages.map((page) => (
                  <Link
                    key={page.path}
                    href={page.path}
                    className="group flex items-start gap-3 rounded-lg border border-gray-200 p-4 transition-all hover:border-blue-500 hover:bg-blue-50"
                  >
                    <page.icon className="mt-0.5 h-5 w-5 flex-shrink-0 text-gray-400 group-hover:text-blue-600" />
                    <div>
                      <div className="font-medium text-gray-900 group-hover:text-blue-600">
                        {page.name}
                      </div>
                      <div className="mt-0.5 text-xs text-gray-500">{page.description}</div>
                      <div className="mt-1 font-mono text-xs text-gray-400">{page.path}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* QA Checklist */}
        <div className="mt-8 rounded-lg border border-blue-200 bg-blue-50 p-6">
          <h2 className="mb-3 text-lg font-semibold text-blue-900">✅ Final QA Checklist</h2>
          <ul className="space-y-2 text-sm text-blue-800">
            <li>• All buttons have consistent Raven blue (#3b82f6) primary style</li>
            <li>• No white text on white backgrounds</li>
            <li>• Dropdowns/menus have readable text colors</li>
            <li>• Timeline event dropdowns are readable</li>
            <li>• Empty states are helpful and styled consistently</li>
            <li>• Loading states show skeletons/spinners</li>
            <li>• No &quot;Coming Soon&quot; or demo links in navigation</li>
            <li>• All forms validate and show clear error messages</li>
            <li>• PDF exports work with org branding</li>
            <li>• Mobile responsive (test at 375px, 768px, 1024px)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
