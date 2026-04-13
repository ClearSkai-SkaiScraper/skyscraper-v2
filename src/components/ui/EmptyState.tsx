import type { LucideIcon } from "lucide-react";
import { Inbox } from "lucide-react";
import Link from "next/link";
import React from "react";

import { StandardButton } from "@/components/ui/StandardButton";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  EmptyState — Unified empty state component                        */
/*  Replaces:                                                          */
/*    - src/components/ui/empty-state.tsx                               */
/*    - src/components/portal/EmptyState.tsx                            */
/*    - src/components/EmptyStates.tsx                                  */
/* ------------------------------------------------------------------ */

export interface EmptyStateProps {
  title: string;
  description?: string;
  /** LucideIcon component or ReactNode */
  icon?: LucideIcon | React.ReactNode;
  /** Primary CTA */
  ctaLabel?: string;
  ctaHref?: string;
  ctaOnClick?: () => void;
  /** Secondary CTA */
  secondaryLabel?: string;
  secondaryHref?: string;
  secondaryOnClick?: () => void;
  /** Visual size */
  size?: "sm" | "md" | "lg";
  className?: string;
}

const sizeStyles = {
  sm: "py-6 text-sm",
  md: "py-12 text-base",
  lg: "min-h-[400px] py-16 text-base",
};

const iconSizes = {
  sm: "h-8 w-8",
  md: "h-12 w-12",
  lg: "h-14 w-14",
};

export default function EmptyState({
  title,
  description,
  icon,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  secondaryLabel,
  secondaryHref,
  secondaryOnClick,
  size = "md",
  className,
}: EmptyStateProps) {
  // Render icon — handle both LucideIcon components and ReactNode
  const renderIcon = () => {
    if (!icon) {
      return <Inbox className={cn("text-muted-foreground", iconSizes[size])} />;
    }
    // If it's already a rendered React element (e.g. <Icon />), use as-is
    if (React.isValidElement(icon)) {
      return icon;
    }
    // Otherwise it's a component reference (function OR forwardRef) — instantiate it
    const IconComp = icon as LucideIcon;
    return <IconComp className={cn("text-muted-foreground", iconSizes[size])} />;
  };

  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-card p-8 text-center",
        sizeStyles[size],
        className
      )}
    >
      <div className="mx-auto mb-4 flex items-center justify-center rounded-full bg-muted p-3">
        {renderIcon()}
      </div>
      <h3 className="mb-2 text-lg font-semibold text-foreground">{title}</h3>
      {description && <p className="mx-auto mb-4 max-w-md text-muted-foreground">{description}</p>}
      {(ctaLabel || secondaryLabel) && (
        <div className="flex items-center gap-3">
          {ctaLabel &&
            (ctaHref || ctaOnClick) &&
            (ctaHref ? (
              <Link href={ctaHref}>
                <StandardButton variant="indigo" gradient>
                  {ctaLabel}
                </StandardButton>
              </Link>
            ) : (
              <StandardButton onClick={ctaOnClick} variant="indigo" gradient>
                {ctaLabel}
              </StandardButton>
            ))}
          {secondaryLabel &&
            (secondaryHref || secondaryOnClick) &&
            (secondaryHref ? (
              <Link href={secondaryHref}>
                <StandardButton variant="ghost">{secondaryLabel}</StandardButton>
              </Link>
            ) : (
              <StandardButton variant="ghost" onClick={secondaryOnClick}>
                {secondaryLabel}
              </StandardButton>
            ))}
        </div>
      )}
    </div>
  );
}

/** Named export for backwards compatibility */
export { EmptyState };
