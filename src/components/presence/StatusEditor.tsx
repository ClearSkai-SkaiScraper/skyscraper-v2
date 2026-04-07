/**
 * StatusEditor — lets users set a custom status with emoji + text
 *
 * Shows preset options for pros and clients, plus a custom input.
 * Used on profile pages and in settings.
 */

"use client";

import { Check, Loader2, Smile, X } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface StatusPreset {
  emoji: string;
  text: string;
}

interface StatusEditorProps {
  userType?: "pro" | "client";
  /** Callback when status is saved */
  onStatusSaved?: (status: { customStatus: string | null; statusEmoji: string | null }) => void;
  /** Compact inline mode */
  compact?: boolean;
  className?: string;
}

export default function StatusEditor({
  userType = "pro",
  onStatusSaved,
  compact = false,
  className = "",
}: StatusEditorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [customStatus, setCustomStatus] = useState("");
  const [statusEmoji, setStatusEmoji] = useState("");
  const [presets, setPresets] = useState<StatusPreset[]>([]);
  const [saving, setSaving] = useState(false);
  const [currentStatus, setCurrentStatus] = useState<{
    customStatus: string | null;
    statusEmoji: string | null;
  }>({ customStatus: null, statusEmoji: null });

  // Load current status + presets
  useEffect(() => {
    async function loadStatus() {
      try {
        const res = await fetch("/api/presence/status");
        if (res.ok) {
          const data = await res.json();
          const source = userType === "client" ? data.client : data.pro;
          if (source) {
            setCurrentStatus({
              customStatus: source.customStatus,
              statusEmoji: source.statusEmoji,
            });
            setCustomStatus(source.customStatus || "");
            setStatusEmoji(source.statusEmoji || "");
          }
          setPresets(userType === "client" ? data.presets.client : data.presets.pro);
        }
      } catch {
        // Ignore
      }
    }
    void loadStatus();
  }, [userType]);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/presence/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customStatus: customStatus.trim() || null,
          statusEmoji: statusEmoji.trim() || null,
          userType,
        }),
      });

      if (!res.ok) throw new Error("Failed to save");

      const newStatus = {
        customStatus: customStatus.trim() || null,
        statusEmoji: statusEmoji.trim() || null,
      };
      setCurrentStatus(newStatus);
      onStatusSaved?.(newStatus);
      setIsOpen(false);
      toast.success("Status updated!");
    } catch {
      toast.error("Failed to update status");
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    setCustomStatus("");
    setStatusEmoji("");
    setSaving(true);
    try {
      await fetch("/api/presence/status", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customStatus: null,
          statusEmoji: null,
          userType,
        }),
      });
      setCurrentStatus({ customStatus: null, statusEmoji: null });
      onStatusSaved?.({ customStatus: null, statusEmoji: null });
      toast.success("Status cleared");
    } catch {
      toast.error("Failed to clear status");
    } finally {
      setSaving(false);
    }
  };

  const selectPreset = (preset: StatusPreset) => {
    setStatusEmoji(preset.emoji);
    setCustomStatus(preset.text);
  };

  // Compact: just show current status with edit button
  if (compact && !isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`group flex items-center gap-1.5 rounded-full border border-slate-200 bg-white/80 px-3 py-1 text-sm transition hover:border-blue-300 hover:bg-blue-50 ${className}`}
      >
        {currentStatus.customStatus ? (
          <>
            {currentStatus.statusEmoji && <span>{currentStatus.statusEmoji}</span>}
            <span className="max-w-40 truncate text-slate-700">{currentStatus.customStatus}</span>
          </>
        ) : (
          <>
            <Smile className="h-3.5 w-3.5 text-slate-400 group-hover:text-blue-500" />
            <span className="text-slate-400 group-hover:text-blue-500">Set status</span>
          </>
        )}
      </button>
    );
  }

  if (!isOpen && !compact) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className={`flex items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-2 text-sm text-slate-500 transition hover:border-blue-400 hover:bg-blue-50 hover:text-blue-600 ${className}`}
      >
        <Smile className="h-4 w-4" />
        {currentStatus.customStatus ? (
          <>
            {currentStatus.statusEmoji} {currentStatus.customStatus}
          </>
        ) : (
          "Set your status"
        )}
      </button>
    );
  }

  return (
    <div className={`rounded-xl border border-slate-200 bg-white p-4 shadow-lg ${className}`}>
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-slate-900">Set Your Status</h4>
        <button onClick={() => setIsOpen(false)} className="rounded-full p-1 hover:bg-slate-100">
          <X className="h-4 w-4 text-slate-400" />
        </button>
      </div>

      {/* Custom input */}
      <div className="mb-3 flex gap-2">
        <Input
          value={statusEmoji}
          onChange={(e) => setStatusEmoji(e.target.value)}
          placeholder="😊"
          className="w-14 text-center text-lg"
          maxLength={2}
        />
        <Input
          value={customStatus}
          onChange={(e) => setCustomStatus(e.target.value)}
          placeholder="What's your status?"
          className="flex-1"
          maxLength={100}
        />
      </div>

      {/* Presets */}
      <div className="mb-3 max-h-40 space-y-1 overflow-y-auto">
        {presets.map((preset) => (
          <button
            key={preset.text}
            onClick={() => selectPreset(preset)}
            className={`flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm transition hover:bg-blue-50 ${
              customStatus === preset.text
                ? "bg-blue-50 font-medium text-blue-700"
                : "text-slate-600"
            }`}
          >
            <span className="text-base">{preset.emoji}</span>
            <span className="flex-1">{preset.text}</span>
            {customStatus === preset.text && <Check className="h-3.5 w-3.5 text-blue-600" />}
          </button>
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between">
        {currentStatus.customStatus && (
          <Button variant="ghost" size="sm" onClick={handleClear} disabled={saving}>
            Clear status
          </Button>
        )}
        <div className="ml-auto flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                Saving
              </>
            ) : (
              "Save"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
