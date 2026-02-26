"use client";

/**
 * ============================================================================
 * UpgradeModal — Prompt users to upgrade when hitting a feature gate
 * ============================================================================
 *
 * Usage:
 *   <UpgradeModal
 *     feature="ai_assistant"
 *     isOpen={showUpgrade}
 *     onClose={() => setShowUpgrade(false)}
 *   />
 */

import { useRouter } from "next/navigation";

import type { FeatureKey } from "@/lib/billing/featureGates";
import { getMinPlanForFeature, PLAN_DISPLAY_NAMES } from "@/lib/billing/featureGates";

const FEATURE_DESCRIPTIONS: Record<
  FeatureKey,
  { title: string; description: string; icon: string }
> = {
  ai_assistant: {
    title: "AI Assistant",
    description:
      "Get AI-powered insights, chat support, and smart recommendations for your roofing projects.",
    icon: "🤖",
  },
  ai_damage_analysis: {
    title: "AI Damage Analysis",
    description:
      "Upload photos and get instant AI-powered damage assessments with detailed reports.",
    icon: "📸",
  },
  advanced_reports: {
    title: "Advanced Reports",
    description:
      "Generate professional PDF reports with custom templates, weather data, and photo grids.",
    icon: "📊",
  },
  pdf_export: {
    title: "PDF Export",
    description: "Export claims, reports, and project plans as branded PDF documents.",
    icon: "📄",
  },
  custom_branding: {
    title: "Custom Branding",
    description:
      "Add your company logo, colors, and branding to all reports and client-facing pages.",
    icon: "🎨",
  },
  api_access: {
    title: "API Access",
    description: "Integrate SkaiScraper with your existing tools via our REST API.",
    icon: "🔌",
  },
  integrations: {
    title: "Integrations",
    description: "Connect with QuickBooks, CompanyCam, EagleView, and more.",
    icon: "🔗",
  },
  team_seats: {
    title: "Team Seats",
    description: "Add team members with role-based access control and real-time collaboration.",
    icon: "👥",
  },
  client_portal: {
    title: "Client Portal",
    description: "Give homeowners a branded portal to track their claim progress.",
    icon: "🏠",
  },
  message_center: {
    title: "Message Center",
    description: "Communicate with clients and trade partners in one place.",
    icon: "💬",
  },
  pipeline: {
    title: "Pipeline",
    description: "Track projects through every stage from lead to warranty.",
    icon: "📈",
  },
  weather_verification: {
    title: "Weather Verification",
    description: "Verify storm dates and conditions with certified weather data.",
    icon: "⛈️",
  },
  priority_support: {
    title: "Priority Support",
    description: "Get faster response times and dedicated support from our team.",
    icon: "⚡",
  },
  white_label: {
    title: "White Label",
    description: "Remove all SkaiScraper branding and use your own domain.",
    icon: "🏷️",
  },
};

interface UpgradeModalProps {
  feature: FeatureKey;
  isOpen: boolean;
  onClose: () => void;
}

export function UpgradeModal({ feature, isOpen, onClose }: UpgradeModalProps) {
  const router = useRouter();
  const info = FEATURE_DESCRIPTIONS[feature];
  const minPlan = getMinPlanForFeature(feature);
  const planName = PLAN_DISPLAY_NAMES[minPlan];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl dark:bg-gray-900">
        {/* Header */}
        <div className="mb-4 text-center">
          <span className="mb-2 inline-block text-4xl">{info.icon}</span>
          <h3 className="text-xl font-bold text-gray-900 dark:text-white">Upgrade to {planName}</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">to unlock {info.title}</p>
        </div>

        {/* Feature description */}
        <div className="mb-6 rounded-lg bg-blue-50 p-4 dark:bg-blue-900/20">
          <p className="text-sm text-blue-800 dark:text-blue-200">{info.description}</p>
        </div>

        {/* Price callout */}
        <div className="mb-6 text-center">
          <p className="text-3xl font-bold text-gray-900 dark:text-white">
            $80<span className="text-base font-normal text-gray-500">/seat/mo</span>
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            One plan. No add-ons. Everything included.
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-gray-300 px-4 py-2.5 text-sm font-medium text-gray-700 transition hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            Maybe Later
          </button>
          <button
            onClick={() => {
              router.push("/billing");
              onClose();
            }}
            className="flex-1 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-blue-700"
          >
            Upgrade Now →
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpgradeModal;
