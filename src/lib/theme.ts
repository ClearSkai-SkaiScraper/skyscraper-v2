/**
 * Theme management - CSS variable based theming with light/dark mode support
 * PHASE 1A: Enhanced with mode-aware theming (Retail, Claims, Admin)
 */
import { supabase } from "@/integrations/supabase/client";
import { type AppMode } from "@/lib/constants/modes";

// === NEO-BLUE MISSION CONTROL TOKENS - CSS VARIABLE BASED ===

// Panel styles - primary glass containers
export const panel = "panel p-4";
export const panelGhost = "panel-ghost p-4";

// Component styles
export const badge = "badge";
export const chip =
  "chip bg-[var(--surface-2)] border border-[color:var(--border)] text-[color:var(--text)]";

export const glass =
  "bg-[var(--surface-glass)] backdrop-blur-xl border border-[color:var(--border)]";
export const card = `${panel} rounded-2xl shadow-[var(--card-shadow)] hover:border-[color:var(--border-bright)] transition-all duration-300`;
export const btn =
  "rounded-xl px-3 py-2 border border-[color:var(--border)] bg-[var(--surface-2)] hover:bg-[var(--surface-1)] transition-colors";
export const btnPrimary =
  "px-4 py-2.5 rounded-xl bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-medium shadow-[var(--glow)] hover:scale-[1.02] transition-all duration-200";
export const btnSecondary =
  "px-4 py-2.5 rounded-xl bg-[var(--surface-2)] border border-[color:var(--border)] text-[color:var(--text)] hover:bg-[var(--surface-1)] hover:border-[color:var(--border-bright)] transition-all duration-200";
export const glow = "shadow-[var(--glow)]";
export const textMuted = "text-[color:var(--muted)]";
export const textPrimary = "text-[color:var(--primary)]";
export const textBase = "text-[color:var(--text)]";
export const heading = "text-xl font-semibold text-[color:var(--text)]";
export const chipPrimary =
  "bg-[var(--primary-weak)] text-[color:var(--primary)] border border-[color:var(--border)] rounded-full px-3 py-1";
export const activeTab =
  "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white font-semibold rounded-full px-4 py-2 shadow-[var(--glow)]";

// === ORIGINAL THEME SYSTEM ===

export interface OrgBranding {
  theme_primary: string;
  theme_secondary: string;
  theme_accent: string;
  logo_url: string | null;
  company_name: string | null;
  claims_layout: string;
  photo_layout: string;
  report_cover_style: string;
}

export async function applyOrgTheme() {
  const { data, error } = await supabase
    .from("org_branding")
    .select(
      "theme_primary, theme_secondary, theme_accent, logo_url, company_name, claims_layout, photo_layout, report_cover_style"
    )
    .single();

  if (error || !data) return;

  if (data && typeof data === "object") {
    const branding = data as Partial<OrgBranding>;
    const root = document.documentElement;
    root.style.setProperty("--brand-primary", (branding.theme_primary as string) || "#117CFF");
    root.style.setProperty("--brand-secondary", (branding.theme_secondary as string) || "#0A1A2F");
    root.style.setProperty("--brand-accent", (branding.theme_accent as string) || "#FFC838");

    // Expose layout preferences globally for easy access (minimal typed shim)
    (window as unknown as { __orgBranding?: OrgBranding }).__orgBranding = branding as OrgBranding;
  }
}

export function getOrgBranding(): OrgBranding | null {
  return (window as any).__orgBranding || null;
}

// ========== PHASE 1A: MODE-AWARE THEME SYSTEM ==========

export interface ThemeTokens {
  colors: {
    primary: string;
    primaryHover: string;
    accent: string;
    accentHover: string;
    background: string;
    foreground: string;
    border: string;
    muted: string;
    mutedForeground: string;
    success: string;
    warning: string;
    error: string;
  };
  spacing: {
    xs: string;
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
  borderRadius: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
    full: string;
  };
  shadows: {
    sm: string;
    md: string;
    lg: string;
    xl: string;
  };
}

/**
 * Base theme tokens (shared across all modes)
 */
const baseTheme: Omit<ThemeTokens, "colors"> = {
  spacing: {
    xs: "0.25rem", // 4px
    sm: "0.5rem", // 8px
    md: "1rem", // 16px
    lg: "1.5rem", // 24px
    xl: "2rem", // 32px
  },
  borderRadius: {
    sm: "0.375rem", // 6px - rounded corners
    md: "0.5rem", // 8px
    lg: "0.75rem", // 12px
    xl: "1rem", // 16px
    full: "9999px",
  },
  shadows: {
    sm: "0 1px 2px 0 rgb(0 0 0 / 0.05)",
    md: "0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)",
    lg: "0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)",
    xl: "0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1)",
  },
};

/**
 * Claims mode colors (charcoal #0B0B0C + yellow #FFC838)
 */
const claimsColors: ThemeTokens["colors"] = {
  primary: "#0B0B0C", // charcoal
  primaryHover: "#1a1a1b",
  accent: "#FFC838", // yellow
  accentHover: "#ffb700",
  background: "#ffffff",
  foreground: "#0B0B0C",
  border: "#e5e7eb",
  muted: "#f9fafb",
  mutedForeground: "#6b7280",
  success: "#10b981",
  warning: "#FFC838",
  error: "#ef4444",
};

/**
 * Retail mode colors (contractor-branded blue)
 */
const retailColors: ThemeTokens["colors"] = {
  primary: "#2563eb", // blue-600
  primaryHover: "#1d4ed8",
  accent: "#3b82f6", // blue-500
  accentHover: "#2563eb",
  background: "#ffffff",
  foreground: "#0f172a",
  border: "#e5e7eb",
  muted: "#f9fafb",
  mutedForeground: "#64748b",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

/**
 * Admin mode colors (violet/purple)
 */
const adminColors: ThemeTokens["colors"] = {
  primary: "#7c3aed", // violet-600
  primaryHover: "#6d28d9",
  accent: "#8b5cf6", // violet-500
  accentHover: "#7c3aed",
  background: "#ffffff",
  foreground: "#0f172a",
  border: "#e5e7eb",
  muted: "#f9fafb",
  mutedForeground: "#64748b",
  success: "#10b981",
  warning: "#f59e0b",
  error: "#ef4444",
};

/**
 * Get theme tokens for a specific mode
 */
export function getTheme(mode: AppMode = "retail"): ThemeTokens {
  let colors: ThemeTokens["colors"];

  switch (mode) {
    case "claims":
      colors = claimsColors;
      break;
    case "admin":
      colors = adminColors;
      break;
    case "retail":
    default:
      colors = retailColors;
      break;
  }

  return {
    ...baseTheme,
    colors,
  };
}

/**
 * Apply mode-specific theme to DOM
 */
export function applyModeTheme(mode: AppMode = "retail") {
  const theme = getTheme(mode);
  const root = document.documentElement;

  // Apply CSS custom properties
  root.style.setProperty("--color-primary", theme.colors.primary);
  root.style.setProperty("--color-primary-hover", theme.colors.primaryHover);
  root.style.setProperty("--color-accent", theme.colors.accent);
  root.style.setProperty("--color-accent-hover", theme.colors.accentHover);
  root.style.setProperty("--color-background", theme.colors.background);
  root.style.setProperty("--color-foreground", theme.colors.foreground);
  root.style.setProperty("--color-border", theme.colors.border);
  root.style.setProperty("--color-muted", theme.colors.muted);
  root.style.setProperty("--color-muted-foreground", theme.colors.mutedForeground);
  root.style.setProperty("--color-success", theme.colors.success);
  root.style.setProperty("--color-warning", theme.colors.warning);
  root.style.setProperty("--color-error", theme.colors.error);

  // Apply spacing
  root.style.setProperty("--spacing-xs", theme.spacing.xs);
  root.style.setProperty("--spacing-sm", theme.spacing.sm);
  root.style.setProperty("--spacing-md", theme.spacing.md);
  root.style.setProperty("--spacing-lg", theme.spacing.lg);
  root.style.setProperty("--spacing-xl", theme.spacing.xl);

  // Apply border radius
  root.style.setProperty("--radius-sm", theme.borderRadius.sm);
  root.style.setProperty("--radius-md", theme.borderRadius.md);
  root.style.setProperty("--radius-lg", theme.borderRadius.lg);
  root.style.setProperty("--radius-xl", theme.borderRadius.xl);
  root.style.setProperty("--radius-full", theme.borderRadius.full);

  // Apply shadows
  root.style.setProperty("--shadow-sm", theme.shadows.sm);
  root.style.setProperty("--shadow-md", theme.shadows.md);
  root.style.setProperty("--shadow-lg", theme.shadows.lg);
  root.style.setProperty("--shadow-xl", theme.shadows.xl);
}

/**
 * Tailwind CSS class builder for mode-aware styling
 */
export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(" ");
}

/**
 * Get mode-aware button classes
 */
export function getButtonClasses(
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  mode: AppMode = "retail",
  variant: "primary" | "secondary" = "primary"
): string {
  const baseClasses =
    "inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";

  if (variant === "primary") {
    return cn(
      baseClasses,
      "bg-[var(--color-primary)] text-white hover:bg-[var(--color-primary-hover)] focus:ring-[var(--color-primary)]"
    );
  }

  return cn(
    baseClasses,
    "bg-[var(--color-muted)] text-[var(--color-foreground)] hover:bg-[var(--color-border)] focus:ring-[var(--color-muted-foreground)]"
  );
}

/**
 * Get mode-aware card classes
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function getCardClasses(mode: AppMode = "retail"): string {
  return "rounded-lg border border-[var(--color-border)] bg-[var(--color-background)] shadow-md";
}
