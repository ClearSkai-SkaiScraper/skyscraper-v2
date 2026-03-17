"use client";

import { AlertTriangle, Check, ChevronDown, ChevronUp, Info, Pencil, X } from "lucide-react";
import { useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

export interface Finding {
  index: number;
  label: string;
  severity: string;
  confidence: number;
  memberCount: number;
  score: number;
  caption: string;
  ircCode: { code: string; title: string; text: string } | null;
  shapeType: string;
  damageCategory: string;
  component: string;
  color: { r: number; g: number; b: number };
  bbox: { x: number; y: number; w: number; h: number };
}

interface FindingEditorProps {
  finding: Finding;
  photoId: string;
  claimId: string;
  onUpdate: (index: number, updates: Partial<Finding>) => void;
  onRemove?: (index: number) => void;
  isExpanded?: boolean;
}

export function FindingEditor({
  finding,
  photoId,
  claimId,
  onUpdate,
  onRemove,
  isExpanded: defaultExpanded = false,
}: FindingEditorProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [editCaption, setEditCaption] = useState(finding.caption);
  const [editSeverity, setEditSeverity] = useState(finding.severity);
  const [editLabel, setEditLabel] = useState(finding.label);

  const severityColor = {
    severe: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
    critical: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
    high: "text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-950",
    moderate: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
    medium: "text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950",
    minor: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
    low: "text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-950",
  };

  const handleSave = () => {
    onUpdate(finding.index, {
      caption: editCaption,
      severity: editSeverity,
      label: editLabel,
    });
    setIsEditing(false);
  };

  const handleCancel = () => {
    setEditCaption(finding.caption);
    setEditSeverity(finding.severity);
    setEditLabel(finding.label);
    setIsEditing(false);
  };

  const colorStyle = {
    borderLeftColor: `rgb(${Math.round(finding.color.r * 255)}, ${Math.round(finding.color.g * 255)}, ${Math.round(finding.color.b * 255)})`,
  };

  return (
    <Card
      className={cn("border-l-4 transition-all", isEditing && "ring-2 ring-primary/20")}
      style={colorStyle}
    >
      <CardHeader className="px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="rounded p-0.5 hover:bg-muted"
            >
              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </button>
            <CardTitle className="text-sm font-medium">
              {isEditing ? (
                <Input
                  value={editLabel}
                  onChange={(e) => setEditLabel(e.target.value)}
                  className="h-7 w-48 text-sm"
                />
              ) : (
                <>
                  Finding #{finding.index + 1} — {finding.label}
                </>
              )}
            </CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge
              variant="secondary"
              className={cn(
                "text-xs",
                severityColor[finding.severity.toLowerCase() as keyof typeof severityColor]
              )}
            >
              {isEditing ? (
                <Select value={editSeverity} onValueChange={setEditSeverity}>
                  <SelectTrigger className="h-5 w-24 border-0 p-0 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="severe">Severe</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="minor">Minor</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                finding.severity
              )}
            </Badge>
            <Badge variant="outline" className="text-xs">
              {Math.round(finding.confidence * 100)}%
            </Badge>
            {!isEditing ? (
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)} className="h-7">
                <Pencil className="h-3 w-3" />
              </Button>
            ) : (
              <div className="flex gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSave}
                  className="h-7 text-green-600"
                >
                  <Check className="h-3 w-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCancel}
                  className="h-7 text-red-600"
                >
                  <X className="h-3 w-3" />
                </Button>
              </div>
            )}
          </div>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-3 px-4 pb-3 pt-0">
          {/* IRC Code */}
          {finding.ircCode && (
            <div className="flex items-start gap-2 rounded bg-blue-50 p-2 text-sm dark:bg-blue-950/30">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-blue-500" />
              <div>
                <span className="font-medium text-blue-700 dark:text-blue-300">
                  {finding.ircCode.code}
                </span>
                <span className="text-blue-600 dark:text-blue-400"> — {finding.ircCode.title}</span>
              </div>
            </div>
          )}

          {/* Caption */}
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Professional Caption</Label>
            {isEditing ? (
              <Textarea
                value={editCaption}
                onChange={(e) => setEditCaption(e.target.value)}
                rows={4}
                className="text-sm"
              />
            ) : (
              <p className="text-sm leading-relaxed text-foreground/80">{finding.caption}</p>
            )}
          </div>

          {/* Metadata row */}
          <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>Shape: {finding.shapeType}</span>
            <span>Category: {finding.damageCategory}</span>
            <span>Component: {finding.component}</span>
            {finding.memberCount > 1 && <span>{finding.memberCount} detections grouped</span>}
            <span>Score: {finding.score.toFixed(2)}</span>
          </div>

          {/* Remove button */}
          {onRemove && (
            <div className="pt-1">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-red-500 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/30"
                onClick={() => onRemove(finding.index)}
              >
                <AlertTriangle className="mr-1 h-3 w-3" />
                Exclude from report
              </Button>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
