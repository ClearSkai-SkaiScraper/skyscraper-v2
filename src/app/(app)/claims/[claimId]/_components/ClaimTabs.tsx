// src/app/(app)/claims/[claimId]/_components/ClaimTabs.tsx
"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

interface ClaimTabsProps {
  claimId: string;
}

const tabs = [
  { label: "Overview", href: "/overview" },
  { label: "Carrier", href: "/carrier" },
  { label: "Photos", href: "/photos" },
  { label: "Documents", href: "/documents" },
  { label: "AI Assistant", href: "/ai" },
  { label: "Supplements", href: "/scope" },
  { label: "Measurements", href: "/measurements" },
  { label: "Messages", href: "/messages" },
  { label: "Timeline", href: "/timeline" },
  { label: "Weather", href: "/weather" },
  { label: "Trades", href: "/trades" },
  { label: "Client", href: "/client" },
  { label: "Notes", href: "/notes" },
  { label: "Final Payout", href: "/final-payout" },
];

export default function ClaimTabs({ claimId }: ClaimTabsProps) {
  const pathname = usePathname();
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const checkScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  useEffect(() => {
    checkScroll();
    const el = scrollRef.current;
    if (!el) return;
    el.addEventListener("scroll", checkScroll, { passive: true });
    window.addEventListener("resize", checkScroll);
    return () => {
      el.removeEventListener("scroll", checkScroll);
      window.removeEventListener("resize", checkScroll);
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    scrollRef.current?.scrollBy({ left: dir === "left" ? -200 : 200, behavior: "smooth" });
  };

  return (
    <div className="relative -mb-px flex items-center">
      {/* Left scroll arrow */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 z-10 flex h-full w-8 items-center justify-center bg-gradient-to-r from-blue-600 via-blue-600 to-transparent"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="h-4 w-4 text-white/80" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="scrollbar-none flex items-center gap-0.5 overflow-x-auto pb-0"
      >
        {tabs.map((tab) => {
          const href = `/claims/${claimId}${tab.href}`;
          const isActive =
            pathname === href || (tab.href === "/overview" && pathname === `/claims/${claimId}`);

          return (
            <Link
              key={tab.href}
              href={href}
              className={cn(
                "whitespace-nowrap border-b-2 px-2.5 py-2.5 text-[13px] font-medium transition-colors",
                isActive
                  ? "border-white text-white"
                  : "border-transparent text-white/60 hover:border-white/40 hover:text-white/90"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Right scroll arrow */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 z-10 flex h-full w-8 items-center justify-center bg-gradient-to-l from-indigo-600 via-indigo-600 to-transparent"
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="h-4 w-4 text-white/80" />
        </button>
      )}
    </div>
  );
}
