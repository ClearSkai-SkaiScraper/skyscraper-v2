"use client";

import { logger } from "@/lib/logger";
import { Camera, CloudRain, FilePlus, FileText, Hammer, MapPin, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { TOKEN_COSTS } from "@/lib/config/tokens";
import { PATHS } from "@/lib/paths";

interface ToolbarAction {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  href?: string;
  onClick?: () => void;
  tokenCost?: number;
  color: string;
}

export default function ToolbarActions() {
  const router = useRouter();
  const [balance, setBalance] = useState<number | null>(null);

  // Check token balance on mount
  // TODO: Replace with actual balance check from API
  const checkBalance = async () => {
    try {
      const res = await fetch("/api/tokens/balance");
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
      }
    } catch (error) {
      logger.error("Failed to check balance:", error);
    }
  };

  const handleAIAction = (action: string, cost: number) => {
    // Check balance before opening modal
    if (balance !== null && balance < cost) {
      // Open upsell modal
      // TODO: Implement upsell modal component
      alert("Insufficient tokens. Please purchase more tokens to continue.");
      router.push(PATHS.ACCOUNT_BILLING);
      return;
    }

    // Route to appropriate modal/page
    switch (action) {
      case "mockup":
        router.push(PATHS.AI_TOOLS_MOCKUP);
        break;
      case "damage-builder":
        router.push(PATHS.AI_DAMAGE_BUILDER);
        break;
      case "dol":
        router.push(PATHS.AI_DOL);
        break;
      case "weather":
        router.push(PATHS.AI_TOOLS_WEATHER);
        break;
      case "box-summary":
        router.push(PATHS.CARRIER_EXPORT);
        break;
    }
  };

  const actions: ToolbarAction[] = [
    {
      id: "new-report",
      label: "New Report",
      icon: FileText,
      href: PATHS.REPORT_NEW,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "new-proposal",
      label: "New Proposal",
      icon: FilePlus,
      href: PATHS.PROPOSALS_NEW,
      tokenCost: 2,
      color: "bg-indigo-600 hover:bg-indigo-700",
    },
    {
      id: "ai-mockup",
      label: "AI Mockup",
      icon: Sparkles,
      onClick: () => handleAIAction("mockup", TOKEN_COSTS.AI_MOCKUP),
      tokenCost: TOKEN_COSTS.AI_MOCKUP,
      color: "bg-purple-600 hover:bg-purple-700",
    },
    {
      id: "damage-builder",
      label: "Damage Builder",
      icon: Hammer,
      onClick: () => handleAIAction("damage-builder", TOKEN_COSTS.AI_MOCKUP),
      tokenCost: TOKEN_COSTS.AI_MOCKUP,
      color: "bg-red-600 hover:bg-red-700",
    },
    {
      id: "quick-dol",
      label: "Quick DOL",
      icon: MapPin,
      onClick: () => handleAIAction("dol", TOKEN_COSTS.QUICK_DOL_PULL),
      tokenCost: TOKEN_COSTS.QUICK_DOL_PULL,
      color: "bg-blue-600 hover:bg-blue-700",
    },
    {
      id: "weather",
      label: "Weather Report",
      icon: CloudRain,
      onClick: () => handleAIAction("weather", TOKEN_COSTS.WEATHER_REPORT_BASIC),
      tokenCost: TOKEN_COSTS.WEATHER_REPORT_BASIC,
      color: "bg-cyan-600 hover:bg-cyan-700",
    },
    {
      id: "box-summary",
      label: "Box Summary",
      icon: Camera,
      onClick: () => handleAIAction("box-summary", TOKEN_COSTS.BOX_SUMMARY_AI),
      tokenCost: TOKEN_COSTS.BOX_SUMMARY_AI,
      color: "bg-orange-600 hover:bg-orange-700",
    },
  ];

  return (
    <div className="safe-area-inset-top sticky top-0 z-40 border-b border-gray-200 bg-white">
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="scrollbar-hide flex items-center gap-2 overflow-x-auto py-3">
          {actions.map((action) => {
            const Icon = action.icon;

            return (
              <button
                key={action.id}
                onClick={action.onClick || (() => action.href && router.push(action.href))}
                className={`group relative flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2 ${action.color} `}
                aria-label={action.label}
              >
                <Icon className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                <span className="hidden sm:inline">{action.label}</span>

                {/* Token cost tooltip */}
                {action.tokenCost !== undefined && (
                  <span
                    className="pointer-events-none absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-gray-900 px-2 py-1 text-xs text-white opacity-0 transition-opacity group-hover:opacity-100"
                    role="tooltip"
                  >
                    {action.tokenCost} token{action.tokenCost !== 1 ? "s" : ""}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
