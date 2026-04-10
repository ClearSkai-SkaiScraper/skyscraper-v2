"use client";

import { CloudRain, FileText, MapPin, Package, Sparkles } from "lucide-react";
import Link from "next/link";

import { PATHS } from "@/lib/paths";

interface AICard {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  badge: string;
  runHref: string;
  historyHref: string;
  color: string;
}

let cards: AICard[] = [
  {
    id: "proposals",
    title: "AI Proposals",
    description:
      "Generate complete proposals with AI - retail sales, claims packets, or contractor work orders with live preview.",
    icon: FileText,
    badge: "Included",
    runHref: PATHS.PROPOSALS_NEW,
    historyHref: PATHS.PROPOSALS,
    color: "indigo",
  },
  {
    id: "mockup",
    title: "AI Mockup Generator",
    description:
      "Upload damage photos and get AI-annotated mockups with captions for instant estimates.",
    icon: Sparkles,
    badge: "Included",
    runHref: PATHS.AI_TOOLS_MOCKUP,
    historyHref: PATHS.AI_TOOLS_MOCKUP_HISTORY,
    color: "purple",
  },
  {
    id: "dol",
    title: "Quick DOL Pull",
    description:
      "Enter an address and get a comprehensive 30-second property summary with claim history.",
    icon: MapPin,
    badge: "Included",
    runHref: PATHS.AI_DOL,
    historyHref: PATHS.AI_DOL,
    color: "emerald",
  },
  {
    id: "weather",
    title: "Weather Verification Report",
    description:
      "Generate claims-ready weather reports with storm data, wind speeds, and verification documentation.",
    icon: CloudRain,
    badge: "Included",
    runHref: PATHS.AI_TOOLS_WEATHER,
    historyHref: PATHS.AI_TOOLS_WEATHER,
    color: "cyan",
  },
  {
    id: "export",
    title: "Carrier Export Builder",
    description:
      "Bundle photos, captions, DOL data, and weather into carrier-ready ZIP packages or formatted PDFs.",
    icon: Package,
    badge: "Included",
    runHref: PATHS.CARRIER_EXPORT,
    historyHref: PATHS.AI_EXPORTS,
    color: "orange",
  },
];

// Ensure deterministic card visibility in test mode so Playwright can assert titles
// eslint-disable-next-line no-restricted-syntax
if (process.env.TEST_AUTH_BYPASS === "1") {
  // No-op now; placeholder for any future test-only augmentation
  cards = [...cards];
}

export default function AICardsGrid() {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {cards.map((card) => {
        const Icon = card.icon;

        return (
          <div
            key={card.id}
            className="flex flex-col overflow-hidden rounded-xl border border-[color:var(--border)] bg-[var(--surface-1)] shadow-[var(--card-shadow)] transition-all duration-200 hover:shadow-[var(--glow)]"
          >
            {/* Card Header - Subtle theme-aware design */}
            <div className="border-b border-[color:var(--border)] bg-[var(--surface-2)] p-6">
              <Icon className="mb-3 h-8 w-8 text-[color:var(--primary)]" aria-hidden="true" />
              <h3 className="text-lg font-semibold text-[color:var(--text)]">{card.title}</h3>
            </div>

            {/* Card Body */}
            <div className="flex flex-1 flex-col p-6">
              <p className="mb-4 text-sm text-[color:var(--muted)]">{card.description}</p>

              {/* Included Badge */}
              <div className="mb-2 flex items-center gap-2">
                <span className="inline-flex items-center rounded-full bg-[var(--primary-weak)] px-2.5 py-0.5 text-xs font-medium text-[color:var(--primary)]">
                  ✓ {card.badge}
                </span>
                <span className="text-xs text-[color:var(--muted)]">with Pro plan</span>
              </div>

              {/* Actions */}
              <div className="mt-auto flex flex-col gap-2 pt-4">
                <Link
                  href={card.runHref}
                  className="w-full rounded-lg bg-[color:var(--primary)] px-4 py-2 text-center text-sm font-semibold text-white transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
                >
                  Run now
                </Link>
                <Link
                  href={card.historyHref}
                  className="w-full rounded-lg border border-[color:var(--border)] bg-[var(--surface-2)] px-4 py-2 text-center text-sm font-medium text-[color:var(--text)] transition-colors hover:bg-[var(--surface-1)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--primary)] focus-visible:ring-offset-2"
                >
                  View history
                </Link>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
