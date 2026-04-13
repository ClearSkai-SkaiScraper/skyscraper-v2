"use client";

import { ArrowRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface StickyCTAProps {
  className?: string;
}

export function StickyCTA({ className }: StickyCTAProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check if user previously dismissed
    const dismissed = sessionStorage.getItem("sticky-cta-dismissed");
    if (dismissed) {
      setIsDismissed(true);
      return;
    }

    const handleScroll = () => {
      // Show after scrolling 500px
      const shouldShow = window.scrollY > 500;
      setIsVisible(shouldShow);
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleDismiss = () => {
    setIsDismissed(true);
    sessionStorage.setItem("sticky-cta-dismissed", "true");
  };

  if (isDismissed) return null;

  return (
    <div
      className={cn(
        "fixed bottom-0 left-0 right-0 z-50 transition-all duration-300 ease-out",
        isVisible ? "translate-y-0 opacity-100" : "translate-y-full opacity-0",
        className
      )}
    >
      <div className="border-t border-white/10 bg-gradient-to-r from-[#117CFF] via-[#0066DD] to-[#004AAD] shadow-2xl">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="flex items-center gap-3 text-white">
              <span className="text-2xl">⚡</span>
              <div>
                <p className="text-sm font-semibold sm:text-base">
                  Ready to transform your storm restoration business?
                </p>
                <p className="hidden text-xs text-white/70 sm:block sm:text-sm">
                  Join 50+ contractors already using SkaiScraper
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Link href="/sign-up">
                <Button
                  size="sm"
                  className="bg-white font-semibold text-[#117CFF] shadow-lg hover:bg-white/90"
                >
                  Start Free Trial
                  <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
              <Link href="/pricing">
                <Button
                  size="sm"
                  variant="ghost"
                  className="hidden text-white hover:bg-white/10 sm:inline-flex"
                >
                  View Pricing
                </Button>
              </Link>
              <button
                onClick={handleDismiss}
                className="ml-2 rounded-full p-1.5 text-white/60 transition-colors hover:bg-white/10 hover:text-white"
                aria-label="Dismiss"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
