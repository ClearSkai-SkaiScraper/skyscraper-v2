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
  { label: "Lifecycle", href: "/lifecycle" },
  { label: "Carrier", href: "/carrier" },
  { label: "Photos", href: "/photos" },
  { label: "Documents", href: "/documents" },
  { label: "AI Assistant", href: "/ai" },
  { label: "Supplements", href: "/scope" },
  { label: "Measurements", href: "/measurements" },
  { label: "Messages", href: "/messages" },
  { label: "Timeline", href: "/timeline" },
  { label: "Weather", href: "/weather" },
  { label: "Intel", href: "/intel" },
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
    <div className="relative flex items-center">
      {/* Left scroll arrow - only show on small screens */}
      {canScrollLeft && (
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 z-10 flex h-full w-8 items-center justify-center bg-gradient-to-r from-blue-600 via-blue-600 to-transparent lg:hidden"
          aria-label="Scroll tabs left"
        >
          <ChevronLeft className="h-4 w-4 text-white/80" />
        </button>
      )}

      <div
        ref={scrollRef}
        className="scrollbar-none flex w-full items-center gap-0.5 overflow-x-auto py-1 lg:justify-center lg:overflow-x-visible"
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
                "whitespace-nowrap rounded-md px-2.5 py-1.5 text-[12px] font-medium transition-all lg:px-3 lg:text-[13px]",
                isActive
                  ? "bg-white/20 text-white shadow-sm backdrop-blur-sm"
                  : "text-white/60 hover:bg-white/10 hover:text-white/90"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {/* Right scroll arrow - only show on small screens */}
      {canScrollRight && (
        <button
          onClick={() => scroll("right")}
          className="absolute right-0 z-10 flex h-full w-8 items-center justify-center bg-gradient-to-l from-indigo-600 via-indigo-600 to-transparent lg:hidden"
          aria-label="Scroll tabs right"
        >
          <ChevronRight className="h-4 w-4 text-white/80" />
        </button>
      )}
    </div>
  );
}
