"use client";

import { FileQuestion, type LucideIcon } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface EmptyStateProps {
  /** Lucide icon to display above the title */
  icon?: LucideIcon;
  /** Main heading text */
  title: string;
  /** Supporting description text */
  description: string;
  /** Optional CTA button label */
  actionLabel?: string;
  /** Optional CTA href (renders Link) */
  actionHref?: string;
  /** Optional CTA onClick (renders Button) */
  onAction?: () => void;
  /** Glass morphism variant matching Card style */
  glass?: boolean;
  /** Compact mode for inline/card usage */
  compact?: boolean;
  /** Additional className */
  className?: string;
  /** Optional children rendered below the description */
  children?: React.ReactNode;
}

/**
 * Shared empty-state component.
 *
 * Use when a data list, table, or detail view has no items.
 * Supports glass variant for consistency with Card component.
 *
 * @example
 * <EmptyState
 *   icon={ClipboardList}
 *   title="No claims yet"
 *   description="Create your first claim to get started."
 *   actionLabel="New Claim"
 *   actionHref="/claims/new"
 * />
 */
export function EmptyState({
  icon: Icon = FileQuestion,
  title,
  description,
  actionLabel,
  actionHref,
  onAction,
  glass = false,
  compact = false,
  className,
  children,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center text-center",
        compact ? "min-h-[200px] py-8" : "min-h-[400px] py-16",
        glass &&
          "rounded-2xl border border-slate-200/60 bg-white/80 backdrop-blur-sm dark:border-slate-700/50 dark:bg-slate-900/60",
        className
      )}
    >
      <div className="rounded-full bg-slate-100 p-3 dark:bg-slate-800">
        <Icon className="h-8 w-8 text-muted-foreground/60" />
      </div>
      <h3 className="mt-4 text-lg font-semibold text-slate-900 dark:text-slate-100">{title}</h3>
      <p className="mt-2 max-w-md text-sm text-muted-foreground">{description}</p>
      {children}
      {actionHref && actionLabel && (
        <Link href={actionHref} className="mt-6">
          <Button>{actionLabel}</Button>
        </Link>
      )}
      {!actionHref && onAction && actionLabel && (
        <Button onClick={onAction} className="mt-6">
          {actionLabel}
        </Button>
      )}
    </div>
  );
}
