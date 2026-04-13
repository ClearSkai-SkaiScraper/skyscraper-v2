"use client";

/**
 * StatCardWithSparkline (P2 Enhancement)
 *
 * Enhanced stat card with 7-day trend sparkline.
 * Shows current value + visual trend for quick pattern recognition.
 *
 * Features:
 * - SVG-based sparkline (no external charting lib required)
 * - Trend indicator (up/down arrow with percentage)
 * - Responsive design
 * - Dark mode support
 */

import { ArrowDown, ArrowUp, Minus } from "lucide-react";
import React from "react";

import { cn } from "@/lib/utils";

interface SparklineData {
  value: number;
  label?: string;
}

interface StatCardWithSparklineProps {
  title: string;
  value: string | number;
  trend?: {
    value: number; // percentage change
    isPositive: boolean;
  };
  sparklineData?: SparklineData[];
  icon?: React.ReactNode;
  className?: string;
  accentColor?: "blue" | "green" | "purple" | "orange" | "red";
  subtitle?: string;
}

/**
 * SVG-based mini sparkline component
 * No external dependencies - pure SVG
 */
function MiniSparkline({
  data,
  accentColor = "blue",
}: {
  data: SparklineData[];
  accentColor?: string;
}) {
  if (!data || data.length < 2) return null;

  const values = data.map((d) => d.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  // SVG dimensions
  const width = 80;
  const height = 32;
  const padding = 2;

  // Calculate points
  const points = values.map((value, index) => {
    const x = padding + (index / (values.length - 1)) * (width - padding * 2);
    const y = height - padding - ((value - min) / range) * (height - padding * 2);
    return `${x},${y}`;
  });

  const pathD = `M${points.join(" L")}`;

  // Area fill path (for gradient effect)
  const areaPathD = `M${points.join(" L")} L${width - padding},${height - padding} L${padding},${height - padding} Z`;

  const colorMap: Record<string, { stroke: string; fill: string }> = {
    blue: { stroke: "#3b82f6", fill: "url(#sparklineGradientBlue)" },
    green: { stroke: "#22c55e", fill: "url(#sparklineGradientGreen)" },
    purple: { stroke: "#a855f7", fill: "url(#sparklineGradientPurple)" },
    orange: { stroke: "#f97316", fill: "url(#sparklineGradientOrange)" },
    red: { stroke: "#ef4444", fill: "url(#sparklineGradientRed)" },
  };

  const colors = colorMap[accentColor] || colorMap.blue;

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id="sparklineGradientBlue" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparklineGradientGreen" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#22c55e" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#22c55e" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparklineGradientPurple" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#a855f7" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#a855f7" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparklineGradientOrange" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#f97316" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="sparklineGradientRed" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#ef4444" stopOpacity="0.3" />
          <stop offset="100%" stopColor="#ef4444" stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      <path d={areaPathD} fill={colors.fill} />

      {/* Line */}
      <path
        d={pathD}
        fill="none"
        stroke={colors.stroke}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* End dot */}
      <circle
        cx={width - padding}
        cy={height - padding - ((values[values.length - 1] - min) / range) * (height - padding * 2)}
        r="3"
        fill={colors.stroke}
      />
    </svg>
  );
}

export function StatCardWithSparkline({
  title,
  value,
  trend,
  sparklineData,
  icon,
  className,
  accentColor = "blue",
  subtitle,
}: StatCardWithSparklineProps) {
  const accentClasses: Record<string, string> = {
    blue: "text-blue-600 dark:text-blue-400",
    green: "text-emerald-600 dark:text-emerald-400",
    purple: "text-purple-600 dark:text-purple-400",
    orange: "text-orange-600 dark:text-orange-400",
    red: "text-red-600 dark:text-red-400",
  };

  const iconBgClasses: Record<string, string> = {
    blue: "bg-blue-50 dark:bg-blue-900/30",
    green: "bg-emerald-50 dark:bg-emerald-900/30",
    purple: "bg-purple-50 dark:bg-purple-900/30",
    orange: "bg-orange-50 dark:bg-orange-900/30",
    red: "bg-red-50 dark:bg-red-900/30",
  };

  return (
    <div
      className={cn(
        "rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-all hover:shadow-md dark:border-slate-700 dark:bg-slate-800",
        className
      )}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          {/* Title */}
          <div className="flex items-center gap-2">
            {icon && (
              <span
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg",
                  iconBgClasses[accentColor],
                  accentClasses[accentColor]
                )}
              >
                {icon}
              </span>
            )}
            <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
          </div>

          {/* Value */}
          <div className="mt-2 flex items-baseline gap-2">
            <span className={cn("text-2xl font-bold", accentClasses[accentColor])}>{value}</span>
            {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
          </div>

          {/* Trend indicator */}
          {trend && (
            <div className="mt-1 flex items-center gap-1">
              {trend.value === 0 ? (
                <>
                  <Minus className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">No change</span>
                </>
              ) : trend.isPositive ? (
                <>
                  <ArrowUp className="h-3 w-3 text-emerald-500" />
                  <span className="text-xs font-medium text-emerald-500">
                    +{Math.abs(trend.value)}%
                  </span>
                </>
              ) : (
                <>
                  <ArrowDown className="h-3 w-3 text-red-500" />
                  <span className="text-xs font-medium text-red-500">
                    -{Math.abs(trend.value)}%
                  </span>
                </>
              )}
              <span className="text-xs text-muted-foreground">vs last 7 days</span>
            </div>
          )}
        </div>

        {/* Sparkline */}
        {sparklineData && sparklineData.length > 1 && (
          <div className="ml-4 flex items-center">
            <MiniSparkline data={sparklineData} accentColor={accentColor} />
          </div>
        )}
      </div>
    </div>
  );
}

// Export a helper to generate mock sparkline data for demo
export function generateMockSparklineData(
  baseValue: number,
  variance: number = 0.2,
  days: number = 7
): SparklineData[] {
  const data: SparklineData[] = [];
  let currentValue = baseValue * (1 - variance / 2);

  for (let i = 0; i < days; i++) {
    const change = (Math.random() - 0.5) * variance * baseValue;
    currentValue = Math.max(0, currentValue + change);
    data.push({
      value: Math.round(currentValue),
      label: `Day ${i + 1}`,
    });
  }

  // Ensure the last value is close to the base value
  data[data.length - 1].value = baseValue;

  return data;
}

export default StatCardWithSparkline;
