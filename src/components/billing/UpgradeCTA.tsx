"use client";

import { ArrowUpRight, Zap } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

interface UpgradeCTAProps {
  title?: string;
  description?: string;
  className?: string;
  variant?: "default" | "compact" | "banner";
}

export function UpgradeCTA({
  title = "Unlock Full Power",
  description = "Upgrade your plan to access AI tools, higher limits, and faster workflows.",
  className,
  variant = "default",
}: UpgradeCTAProps) {
  const router = useRouter();
  const [hidden, setHidden] = useState(true); // Hidden by default until we know the plan

  useEffect(() => {
    // Check user's plan — hide for paid plans
    async function checkPlan() {
      try {
        const res = await fetch("/api/trades/company/seats");
        if (!res.ok) {
          setHidden(false); // Show upgrade if we can't determine plan
          return;
        }
        const data = await res.json();
        const planKey = (data?.plan?.key || data?.currentPlan || "free").toLowerCase();
        // Hide for business, enterprise, team — they're already paid
        if (["business", "enterprise", "team"].includes(planKey)) {
          setHidden(true);
        } else {
          setHidden(false);
        }
      } catch {
        setHidden(false);
      }
    }
    // Also hide in test mode
    if (process.env.NEXT_PUBLIC_TEST_MODE === "true") {
      setHidden(true);
      return;
    }
    void checkPlan();
  }, []);

  if (hidden) return null;

  if (variant === "banner") {
    return (
      <div
        className={cn(
          "bg-gradient-blue/10 relative cursor-pointer overflow-hidden rounded-2xl border border-blue-500/20 p-6 backdrop-blur-xl transition-all hover:border-blue-500/40 hover:shadow-xl",
          className
        )}
        onClick={() => router.push("/pricing")}
      >
        <div className="bg-gradient-blue/5 absolute inset-0" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-cyan">
              <Zap className="h-6 w-6 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-900 dark:text-white">{title}</h3>
              <p className="text-sm text-slate-600 dark:text-slate-300">{description}</p>
            </div>
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push("/pricing");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-blue px-6 py-3 font-semibold text-white shadow-lg transition-all hover:scale-105 hover:shadow-xl"
          >
            Upgrade Now <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    );
  }

  if (variant === "compact") {
    return (
      <div
        className={cn(
          "inline-flex cursor-pointer items-center gap-3 rounded-xl border border-blue-500/20 bg-blue-600/10 px-4 py-2 backdrop-blur-xl transition-all hover:border-blue-500/40 hover:bg-blue-600/20",
          className
        )}
        onClick={() => router.push("/pricing")}
      >
        <Zap className="h-4 w-4 text-blue-400" />
        <span className="text-sm font-medium text-[color:var(--text)]">{title}</span>
        <ArrowUpRight className="h-4 w-4 text-blue-400" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "cursor-pointer rounded-2xl border border-white/10 bg-white/5 p-6 shadow-lg backdrop-blur-xl transition-all hover:border-white/20 hover:bg-white/[0.08] hover:shadow-xl",
        className
      )}
      onClick={() => router.push("/pricing")}
    >
      <div className="flex items-start gap-4">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-cyan">
          <Zap className="h-6 w-6 text-white" />
        </div>
        <div className="flex-1">
          <h3 className="mb-2 text-xl font-semibold text-slate-900 dark:text-white">{title}</h3>
          <p className="mb-4 text-sm text-slate-700 dark:text-slate-300">{description}</p>
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push("/pricing");
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-cyan px-4 py-2 font-medium text-white shadow-md transition-all hover:scale-105 hover:opacity-95 hover:shadow-xl"
          >
            Upgrade Now <ArrowUpRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
