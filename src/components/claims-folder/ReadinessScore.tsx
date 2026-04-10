"use client";

/**
 * Readiness Score Component
 * Visual display of claim folder completeness with breakdown
 */

import {
  AlertCircle,
  Calendar,
  Camera,
  CheckCircle,
  CloudLightning,
  DollarSign,
  FileText,
  PenTool,
  Scale,
} from "lucide-react";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

export interface ReadinessCategory {
  key: string;
  label: string;
  score: number;
  maxScore: number;
  status: "complete" | "partial" | "missing";
  icon: React.ReactNode;
}

export interface ReadinessScoreProps {
  score: number;
  grade?: "A" | "B" | "C" | "D" | "F";
  categories?: ReadinessCategory[];
  recommendation?: string;
  compact?: boolean;
  showBreakdown?: boolean;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const defaultCategories: ReadinessCategory[] = [
  {
    key: "weather",
    label: "Weather",
    score: 0,
    maxScore: 15,
    status: "missing",
    icon: <CloudLightning className="h-4 w-4" />,
  },
  {
    key: "photos",
    label: "Photos",
    score: 0,
    maxScore: 20,
    status: "missing",
    icon: <Camera className="h-4 w-4" />,
  },
  {
    key: "codes",
    label: "Codes",
    score: 0,
    maxScore: 15,
    status: "missing",
    icon: <Scale className="h-4 w-4" />,
  },
  {
    key: "scope",
    label: "Scope",
    score: 0,
    maxScore: 20,
    status: "missing",
    icon: <DollarSign className="h-4 w-4" />,
  },
  {
    key: "narratives",
    label: "Narratives",
    score: 0,
    maxScore: 15,
    status: "missing",
    icon: <FileText className="h-4 w-4" />,
  },
  {
    key: "signatures",
    label: "Signatures",
    score: 0,
    maxScore: 10,
    status: "missing",
    icon: <PenTool className="h-4 w-4" />,
  },
  {
    key: "timeline",
    label: "Timeline",
    score: 0,
    maxScore: 5,
    status: "missing",
    icon: <Calendar className="h-4 w-4" />,
  },
];

function getGradeFromScore(score: number): "A" | "B" | "C" | "D" | "F" {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

function getGradeColor(grade: "A" | "B" | "C" | "D" | "F"): string {
  switch (grade) {
    case "A":
      return "text-green-600 dark:text-green-400";
    case "B":
      return "text-blue-600 dark:text-blue-400";
    case "C":
      return "text-yellow-600 dark:text-yellow-400";
    case "D":
      return "text-orange-600 dark:text-orange-400";
    case "F":
      return "text-red-600 dark:text-red-400";
  }
}

function getScoreColor(score: number): string {
  if (score >= 90) return "bg-green-500";
  if (score >= 80) return "bg-blue-500";
  if (score >= 70) return "bg-yellow-500";
  if (score >= 60) return "bg-orange-500";
  return "bg-red-500";
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function getStatusIcon(status: "complete" | "partial" | "missing") {
  switch (status) {
    case "complete":
      return <CheckCircle className="h-4 w-4 text-green-500" />;
    case "partial":
      return <AlertCircle className="h-4 w-4 text-yellow-500" />;
    case "missing":
      return <AlertCircle className="h-4 w-4 text-red-500" />;
  }
}

function getStatusBadge(status: "complete" | "partial" | "missing") {
  switch (status) {
    case "complete":
      return (
        <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
          ✓
        </Badge>
      );
    case "partial":
      return (
        <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
          ⚠
        </Badge>
      );
    case "missing":
      return (
        <Badge className="bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400">✗</Badge>
      );
  }
}

export function ReadinessScore({
  score,
  grade,
  categories = defaultCategories,
  recommendation,
  compact = false,
  showBreakdown = true,
  className,
}: ReadinessScoreProps) {
  const calculatedGrade = grade || getGradeFromScore(score);
  const gradeColor = getGradeColor(calculatedGrade);
  const scoreColor = getScoreColor(score);

  if (compact) {
    return (
      <div className={cn("flex items-center gap-3", className)}>
        <div className="relative h-12 w-12">
          <svg className="h-12 w-12 -rotate-90 transform">
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              className="text-slate-200 dark:text-slate-700"
            />
            <circle
              cx="24"
              cy="24"
              r="20"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
              strokeDasharray={`${(score / 100) * 125.6} 125.6`}
              className={scoreColor.replace("bg-", "text-")}
            />
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <span className={cn("text-sm font-bold", gradeColor)}>{score}%</span>
          </div>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-700 dark:text-slate-300">Claim Strength</p>
          <p className={cn("text-lg font-bold", gradeColor)}>Grade: {calculatedGrade}</p>
        </div>
      </div>
    );
  }

  return (
    <Card className={cn("overflow-hidden", className)}>
      <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/30">
        <CardTitle className="flex items-center justify-between">
          <span>Claim Readiness Score</span>
          <div className={cn("text-3xl font-bold", gradeColor)}>{score}%</div>
        </CardTitle>
      </CardHeader>
      <CardContent className="pt-6">
        {/* Main Progress Bar */}
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span className="text-slate-600 dark:text-slate-400">Overall Completeness</span>
            <span className={cn("font-semibold", gradeColor)}>Grade: {calculatedGrade}</span>
          </div>
          <Progress value={score} className="h-3" />
        </div>

        {/* Recommendation */}
        {recommendation && (
          <div className="mb-6 rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-950/30">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              <strong>Recommendation:</strong> {recommendation}
            </p>
          </div>
        )}

        {/* Category Breakdown */}
        {showBreakdown && categories.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Section Breakdown
            </h4>
            <div className="grid gap-2">
              {categories.map((cat) => (
                <div
                  key={cat.key}
                  className="flex items-center justify-between rounded-lg border border-slate-200 p-2 dark:border-slate-700"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 dark:text-slate-400">{cat.icon}</span>
                    <span className="text-sm font-medium text-slate-700 dark:text-slate-300">
                      {cat.label}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-500">
                      {cat.score}/{cat.maxScore}
                    </span>
                    {getStatusBadge(cat.status)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="mt-6 grid grid-cols-3 gap-4 border-t border-slate-200 pt-4 dark:border-slate-700">
          <div className="text-center">
            <p className="text-2xl font-bold text-green-600 dark:text-green-400">
              {categories.filter((c) => c.status === "complete").length}
            </p>
            <p className="text-xs text-slate-500">Complete</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
              {categories.filter((c) => c.status === "partial").length}
            </p>
            <p className="text-xs text-slate-500">Partial</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-red-600 dark:text-red-400">
              {categories.filter((c) => c.status === "missing").length}
            </p>
            <p className="text-xs text-slate-500">Missing</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default ReadinessScore;
