"use client";

import { usePathname } from "next/navigation";
import { ReactNode } from "react";

import { getSectionTheme, SECTION_THEMES, type SectionTheme } from "@/config/sectionThemes";
import { cn } from "@/lib/utils";

interface PageHeroProps {
  title: string;
  subtitle?: string;
  description?: string;
  icon?: ReactNode;
  actions?: ReactNode;
  /** Section-based theme — overrides gradient when set */
  section?: SectionTheme;
  gradient?: string;
  children?: ReactNode;
  className?: string;
  size?: "default" | "compact";
}

export function PageHero({
  title,
  subtitle,
  description,
  icon,
  actions,
  section,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  gradient,
  children,
  className,
  size = "default",
}: PageHeroProps) {
  const pathname = usePathname();
  const effectiveSubtitle = subtitle ?? description;

  // Auto-detect section from current route when no explicit section is given
  const resolvedSection: SectionTheme = section ?? getSectionTheme(pathname || "");

  // Priority: resolvedSection (explicit or auto-detected) ALWAYS wins.
  // Fallback to "command" theme if section is somehow invalid.
  const theme = SECTION_THEMES[resolvedSection] ?? SECTION_THEMES["command"];
  const gradientClass = theme.gradient;
  const subtitleColor = theme.subtitleColor;

  const rightContent = actions ?? children;

  // Size variants
  const sizeClasses = size === "compact" ? "px-6 py-4" : "px-6 py-5";

  return (
    <div
      className={cn("mb-6 rounded-2xl text-white shadow-lg", gradientClass, sizeClasses, className)}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          {icon && <div className="flex-shrink-0 text-white/90">{icon}</div>}
          <div>
            <h1
              className={cn(
                "font-bold tracking-tight",
                size === "compact" ? "text-lg md:text-xl" : "text-xl md:text-2xl"
              )}
            >
              {title}
            </h1>
            {effectiveSubtitle && (
              <p
                className={cn(
                  "mt-0.5",
                  subtitleColor,
                  size === "compact" ? "text-xs md:text-sm" : "text-sm"
                )}
              >
                {effectiveSubtitle}
              </p>
            )}
          </div>
        </div>
        {rightContent && <div className="flex flex-wrap items-center gap-2">{rightContent}</div>}
      </div>
    </div>
  );
}
