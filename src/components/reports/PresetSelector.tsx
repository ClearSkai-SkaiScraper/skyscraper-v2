"use client";

import { FolderOpen, Loader2,Save } from "lucide-react";
import { useEffect,useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { logger } from "@/lib/logger";

interface ReportPreset {
  id: string;
  name: string;
  description: string | null;
  type: string;
  sections: any;
  options: any;
  isDefault: boolean;
}

interface PresetSelectorProps {
  reportType: string;
  onLoadPreset: (preset: ReportPreset) => void;
  currentSections: string[];
  currentOptions: any;
}

export function PresetSelector({
  reportType,
  onLoadPreset,
  currentSections,
  currentOptions,
}: PresetSelectorProps) {
  const [presets, setPresets] = useState<ReportPreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [saveDescription, setSaveDescription] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadPresets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportType]);

  const loadPresets = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reports/presets?type=${reportType}`);
      if (res.ok) {
        const data = await res.json();
        setPresets(data.presets || []);
      }
    } catch (error) {
      logger.error("Failed to load presets:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePreset = async () => {
    if (!saveName.trim()) {
      alert("Please enter a preset name");
      return;
    }

    setSaving(true);
    try {
      const res = await fetch("/api/reports/presets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: saveName,
          description: saveDescription,
          type: reportType,
          sections: currentSections,
          options: currentOptions,
        }),
      });

      if (res.ok) {
        alert("Preset saved successfully!");
        setSaveDialogOpen(false);
        setSaveName("");
        setSaveDescription("");
        void loadPresets();
      } else {
        alert("Failed to save preset");
      }
    } catch (error) {
      logger.error("Save preset error:", error);
      alert("Failed to save preset");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      {/* Load Preset Dropdown */}
      <Select
        onValueChange={(presetId) => {
          const preset = presets.find((p) => p.id === presetId);
          if (preset) {
            onLoadPreset(preset);
          }
        }}
        disabled={loading || presets.length === 0}
      >
        <SelectTrigger className="w-[200px]">
          <FolderOpen className="mr-2 h-4 w-4" />
          <SelectValue placeholder="Load preset..." />
        </SelectTrigger>
        <SelectContent>
          {presets.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-gray-500">No presets saved</div>
          ) : (
            presets.map((preset) => (
              <SelectItem key={preset.id} value={preset.id}>
                {preset.name}
                {preset.isDefault && <span className="ml-2 text-xs text-blue-600">(Default)</span>}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>

      {/* Save Preset Button */}
      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogTrigger asChild>
          <Button variant="outline" size="sm">
            <Save className="mr-2 h-4 w-4" />
            Save Preset
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Report Preset</DialogTitle>
            <DialogDescription>
              Save your current configuration as a preset for quick reuse
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="preset-name">Preset Name</Label>
              <Input
                id="preset-name"
                placeholder="e.g., Standard Insurance Report"
                value={saveName}
                onChange={(e) => setSaveName(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="preset-description">Description (optional)</Label>
              <Textarea
                id="preset-description"
                placeholder="Describe what this preset is for..."
                value={saveDescription}
                onChange={(e) => setSaveDescription(e.target.value)}
                rows={3}
              />
            </div>

            <div className="text-sm text-gray-600 dark:text-gray-400">
              <p className="mb-1 font-medium">Current configuration:</p>
              <ul className="list-inside list-disc space-y-0.5">
                <li>{currentSections.length} sections selected</li>
                <li>Report type: {reportType}</li>
              </ul>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2">
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSavePreset} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Preset
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
