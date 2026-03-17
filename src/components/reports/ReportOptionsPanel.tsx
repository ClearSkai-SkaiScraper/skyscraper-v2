"use client";

import {
  ArrowUpDown,
  BookOpen,
  Camera,
  FileText,
  LayoutGrid,
  Printer,
  Settings2,
  Wrench,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

export interface ReportOptions {
  captionStyle: "full" | "concise" | "code-only";
  photoOrder: "claim-value" | "upload-order" | "severity";
  layout: "single" | "double";
  printSafe: boolean;
  includeRepairability: boolean;
  includeBuildingCodes: boolean;
  includePhotos: boolean;
  includeAnnotations: boolean;
}

interface ReportOptionsPanelProps {
  options: ReportOptions;
  onChange: (options: ReportOptions) => void;
  isArizona?: boolean;
  photoCount?: number;
  findingCount?: number;
}

export function ReportOptionsPanel({
  options,
  onChange,
  isArizona = false,
  photoCount = 0,
  findingCount = 0,
}: ReportOptionsPanelProps) {
  const update = <K extends keyof ReportOptions>(key: K, value: ReportOptions[K]) => {
    onChange({ ...options, [key]: value });
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-sm">
          <Settings2 className="h-4 w-4" />
          Report Options
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        {/* Caption Style */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <FileText className="h-3.5 w-3.5" />
            Caption Style
          </Label>
          <Select
            value={options.captionStyle}
            onValueChange={(v) => update("captionStyle", v as ReportOptions["captionStyle"])}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="full">
                <div className="flex flex-col">
                  <span>Full Professional</span>
                  <span className="text-xs text-muted-foreground">
                    5-section: observation, technical, code, claim, repairability
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="concise">
                <div className="flex flex-col">
                  <span>Concise</span>
                  <span className="text-xs text-muted-foreground">
                    Observation + building code reference only
                  </span>
                </div>
              </SelectItem>
              <SelectItem value="code-only">
                <div className="flex flex-col">
                  <span>Code Reference Only</span>
                  <span className="text-xs text-muted-foreground">
                    Just the IRC/IBC code citation
                  </span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Photo Order */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <ArrowUpDown className="h-3.5 w-3.5" />
            Photo Ordering
          </Label>
          <Select
            value={options.photoOrder}
            onValueChange={(v) => update("photoOrder", v as ReportOptions["photoOrder"])}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="claim-value">Highest Claim Value First</SelectItem>
              <SelectItem value="severity">Most Severe First</SelectItem>
              <SelectItem value="upload-order">Upload Order (chronological)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Layout */}
        <div className="space-y-2">
          <Label className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <LayoutGrid className="h-3.5 w-3.5" />
            Page Layout
          </Label>
          <Select
            value={options.layout}
            onValueChange={(v) => update("layout", v as ReportOptions["layout"])}
          >
            <SelectTrigger className="h-8 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="single">Single Column (standard)</SelectItem>
              <SelectItem value="double">Two Column (compact)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Toggle Switches */}
        <div className="space-y-3 pt-1">
          <div className="flex items-center justify-between">
            <Label className="flex cursor-pointer items-center gap-1.5 text-sm" htmlFor="photos">
              <Camera className="h-3.5 w-3.5 text-muted-foreground" />
              Include Photos
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {photoCount}
              </Badge>
            </Label>
            <Switch
              id="photos"
              checked={options.includePhotos}
              onCheckedChange={(v) => update("includePhotos", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label
              className="flex cursor-pointer items-center gap-1.5 text-sm"
              htmlFor="annotations"
            >
              <Settings2 className="h-3.5 w-3.5 text-muted-foreground" />
              Show Annotations
              <Badge variant="secondary" className="ml-1 text-[10px]">
                {findingCount}
              </Badge>
            </Label>
            <Switch
              id="annotations"
              checked={options.includeAnnotations}
              onCheckedChange={(v) => update("includeAnnotations", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label
              className="flex cursor-pointer items-center gap-1.5 text-sm"
              htmlFor="repairability"
            >
              <Wrench className="h-3.5 w-3.5 text-muted-foreground" />
              Repairability Analysis
            </Label>
            <Switch
              id="repairability"
              checked={options.includeRepairability}
              onCheckedChange={(v) => update("includeRepairability", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex cursor-pointer items-center gap-1.5 text-sm" htmlFor="codes">
              <BookOpen className="h-3.5 w-3.5 text-muted-foreground" />
              Building Codes
              {isArizona && (
                <Badge
                  variant="outline"
                  className="ml-1 border-amber-400 text-[10px] text-amber-600"
                >
                  AZ
                </Badge>
              )}
            </Label>
            <Switch
              id="codes"
              checked={options.includeBuildingCodes}
              onCheckedChange={(v) => update("includeBuildingCodes", v)}
            />
          </div>

          <div className="flex items-center justify-between">
            <Label className="flex cursor-pointer items-center gap-1.5 text-sm" htmlFor="print">
              <Printer className="h-3.5 w-3.5 text-muted-foreground" />
              Print-Safe Mode
            </Label>
            <Switch
              id="print"
              checked={options.printSafe}
              onCheckedChange={(v) => update("printSafe", v)}
            />
          </div>
        </div>

        {/* Print-safe explanation */}
        {options.printSafe && (
          <p className="rounded bg-muted/50 p-2 text-[11px] text-muted-foreground">
            Print-safe mode uses darker text, larger minimum font sizes, and avoids edge-bleed for
            optimal inkjet/laser printing results.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
