"use client";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

interface DemoModeBannerProps {
  variant?: "minimal" | "full";
  className?: string;
}

/**
 * Demo Mode Banner
 * Shows when NEXT_PUBLIC_DEMO_MODE=true
 * Alerts users they're in investor demo mode
 */
export function DemoModeBanner({ variant = "full", className = "" }: DemoModeBannerProps) {
  // Check if demo mode is enabled (client-side)
  // eslint-disable-next-line no-restricted-syntax
  const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  if (!isDemoMode) return null;

  if (variant === "minimal") {
    return (
      <Badge
        variant="outline"
        className={`border-amber-500 bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-100 ${className}`}
      >
        <AlertCircle className="mr-1 h-3 w-3" />
        Demo Mode
      </Badge>
    );
  }

  return (
    <Alert className={`border-amber-500 bg-amber-50 dark:bg-amber-950 ${className}`}>
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-900 dark:text-amber-100">
        <strong>Investor Demo Mode Active</strong> • Some features are read-only. Data resets every
        24 hours. This is a demonstration environment.
      </AlertDescription>
    </Alert>
  );
}

/**
 * Demo Mode Guard HOC
 * Wraps components that should show demo restrictions
 */
export function withDemoGuard<P extends object>(
  Component: React.ComponentType<P>,
  restrictedAction: string
) {
  return function GuardedComponent(props: P) {
    // eslint-disable-next-line no-restricted-syntax
    const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

    if (isDemoMode) {
      return (
        <div className="relative">
          <div className="pointer-events-none opacity-50">
            <Component {...props} />
          </div>
          <div className="absolute inset-0 flex items-center justify-center bg-black/10 backdrop-blur-[1px]">
            <Badge variant="outline" className="border-amber-500 bg-white shadow-lg">
              <AlertCircle className="mr-2 h-4 w-4 text-amber-600" />
              {restrictedAction} disabled in demo mode
            </Badge>
          </div>
        </div>
      );
    }

    return <Component {...props} />;
  };
}
