"use client";

/**
 * Section Card Component
 * Individual section in the ClaimIQ Assembly grid
 */

import {
  Calendar,
  Camera,
  CheckCircle,
  CheckSquare,
  ClipboardCheck,
  CloudLightning,
  DollarSign,
  FileSignature,
  FileText,
  FileWarning,
  Grid3X3,
  HardHat,
  List,
  Mail,
  Paperclip,
  PenTool,
  Scale,
  UserCheck,
} from "lucide-react";
import React from "react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

const ICON_MAP: Record<string, React.ReactNode> = {
  FileText: <FileText className="h-5 w-5" />,
  List: <List className="h-5 w-5" />,
  FileSignature: <FileSignature className="h-5 w-5" />,
  CloudLightning: <CloudLightning className="h-5 w-5" />,
  ClipboardCheck: <ClipboardCheck className="h-5 w-5" />,
  Grid3X3: <Grid3X3 className="h-5 w-5" />,
  Camera: <Camera className="h-5 w-5" />,
  Scale: <Scale className="h-5 w-5" />,
  DollarSign: <DollarSign className="h-5 w-5" />,
  FileWarning: <FileWarning className="h-5 w-5" />,
  HardHat: <HardHat className="h-5 w-5" />,
  Calendar: <Calendar className="h-5 w-5" />,
  UserCheck: <UserCheck className="h-5 w-5" />,
  Mail: <Mail className="h-5 w-5" />,
  CheckSquare: <CheckSquare className="h-5 w-5" />,
  PenTool: <PenTool className="h-5 w-5" />,
  Paperclip: <Paperclip className="h-5 w-5" />,
};

export interface SectionCardProps {
  sectionKey: string;
  title: string;
  description: string;
  icon: string;
  status: "complete" | "partial" | "missing" | "loading";
  required: boolean;
  dataAvailable?: boolean;
  onClick?: () => void;
  className?: string;
}

export function SectionCard({
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  sectionKey,
  title,
  description,
  icon,
  status,
  required,
  dataAvailable = false,
  onClick,
  className,
}: SectionCardProps) {
  const IconComponent = ICON_MAP[icon] || <FileText className="h-5 w-5" />;

  const statusColors = {
    complete: "border-green-300 bg-green-50 dark:border-green-700 dark:bg-green-950/20",
    partial: "border-yellow-300 bg-yellow-50 dark:border-yellow-700 dark:bg-yellow-950/20",
    missing: "border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-900",
    loading: "border-blue-300 bg-blue-50 dark:border-blue-700 dark:bg-blue-950/20",
  };

  const iconColors = {
    complete: "text-green-600 dark:text-green-400",
    partial: "text-yellow-600 dark:text-yellow-400",
    missing: "text-slate-400 dark:text-slate-500",
    loading: "text-blue-600 dark:text-blue-400",
  };

  const statusBadges = {
    complete: (
      <Badge className="bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400">
        <CheckCircle className="mr-1 h-3 w-3" />
        Ready
      </Badge>
    ),
    partial: (
      <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
        Partial
      </Badge>
    ),
    missing: (
      <Badge variant="outline" className="text-slate-500">
        Missing
      </Badge>
    ),
    loading: (
      <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
        Loading...
      </Badge>
    ),
  };

  return (
    <Card
      className={cn(
        "cursor-pointer transition-all hover:shadow-md",
        statusColors[status],
        onClick && "hover:scale-[1.02]",
        className
      )}
      onClick={onClick}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div
            className={cn("rounded-lg bg-white/80 p-2 dark:bg-slate-800/80", iconColors[status])}
          >
            {IconComponent}
          </div>
          <div className="flex flex-col items-end gap-1">
            {statusBadges[status]}
            {required && <span className="text-xs text-red-500">Required</span>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <CardTitle className="mb-1 text-sm">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
        {dataAvailable && status !== "complete" && (
          <p className="mt-2 text-xs text-blue-600 dark:text-blue-400">
            Data available → Click to add
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export default SectionCard;
