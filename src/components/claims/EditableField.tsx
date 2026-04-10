// src/components/claims/EditableField.tsx
"use client";

import { Check } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

interface EditableFieldProps {
  label: string;
  value: string | null;
  onSave: (newValue: string) => Promise<void>;
  type?: "text" | "email" | "tel" | "date";
  placeholder?: string;
  mono?: boolean;
}

export function EditableField({
  label,
  value,
  onSave,
  type = "text",
  placeholder,
  mono = false,
}: EditableFieldProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(value || "");
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const savingRef = useRef(false);

  // Sync external value changes
  useEffect(() => {
    if (!isEditing) {
      setEditValue(value || "");
    }
  }, [value, isEditing]);

  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      if (type !== "date") {
        inputRef.current.select();
      }
    }
  }, [isEditing, type]);

  const handleSave = useCallback(async () => {
    // Prevent double-saves
    if (savingRef.current) return;

    if (editValue === (value || "")) {
      setIsEditing(false);
      return;
    }

    savingRef.current = true;
    setSaving(true);
    setError(null);

    try {
      await onSave(editValue);
      setIsEditing(false);
      // Flash a brief saved indicator
      setJustSaved(true);
      setTimeout(() => setJustSaved(false), 1500);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message || "Failed to save");
      setTimeout(() => setError(null), 3000);
    } finally {
      setSaving(false);
      savingRef.current = false;
    }
  }, [editValue, value, onSave]);

  const handleCancel = useCallback(() => {
    setEditValue(value || "");
    setIsEditing(false);
    setError(null);
  }, [value]);

  const handleBlur = useCallback(
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    (e: React.FocusEvent) => {
      // When the input loses focus, auto-save if the value changed
      // Small delay to allow Tab to work before we close the field
      setTimeout(() => {
        if (savingRef.current) return;
        if (editValue !== (value || "")) {
          void handleSave();
        } else {
          setIsEditing(false);
        }
      }, 100);
    },
    [editValue, value, handleSave]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        void handleSave();
      } else if (e.key === "Escape") {
        e.preventDefault();
        handleCancel();
      } else if (e.key === "Tab") {
        // Let the browser handle Tab natively for focus movement.
        // The onBlur handler will auto-save the current value.
        // No e.preventDefault() — Tab must propagate.
      }
    },
    [handleSave, handleCancel]
  );

  if (isEditing) {
    return (
      <div>
        <label className="text-sm font-medium text-muted-foreground">{label}</label>
        <div className="mt-1">
          <input
            ref={inputRef}
            type={type}
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onKeyDown={handleKeyDown}
            onBlur={handleBlur}
            disabled={saving}
            placeholder={placeholder}
            className={`w-full rounded-lg border border-blue-400 bg-background px-3 py-2 text-base text-foreground outline-none ring-2 ring-blue-200 transition-colors focus-visible:border-blue-500 focus-visible:ring-blue-300 disabled:opacity-50 ${mono ? "font-mono" : ""}`}
          />
        </div>
        {error && <p className="mt-1 text-xs text-destructive">{error}</p>}
        {saving && <p className="mt-1 animate-pulse text-xs text-muted-foreground">Saving…</p>}
      </div>
    );
  }

  return (
    <div>
      <label className="text-sm font-medium text-muted-foreground">
        {label}
        {justSaved && (
          <span className="ml-2 inline-flex items-center gap-1 text-xs font-normal text-emerald-600 dark:text-emerald-400">
            <Check className="h-3 w-3" /> Saved
          </span>
        )}
      </label>
      <button
        onClick={() => setIsEditing(true)}
        className={`mt-1 w-full cursor-pointer rounded-lg px-3 py-2 text-left text-base text-foreground transition-colors hover:bg-muted ${mono ? "font-mono" : ""} ${!value ? "italic text-muted-foreground" : "font-medium"}`}
      >
        {value || placeholder || "Click to edit"}
      </button>
    </div>
  );
}
