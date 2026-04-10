// src/components/claims/AdjusterCombobox.tsx
"use client";

import { Check, ChevronsUpDown, Shield } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface AdjusterOption {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
}

interface AdjusterComboboxProps {
  /** Current adjuster name value */
  currentName: string | null;
  currentEmail: string | null;
  currentPhone: string | null;
  /** Called when user selects an existing adjuster — fills all three fields */
  onSelect: (adjuster: { name: string; email: string; phone: string }) => void;
}

export function AdjusterCombobox({
  currentName,
  currentEmail,
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  currentPhone,
  onSelect,
}: AdjusterComboboxProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [options, setOptions] = useState<AdjusterOption[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout>();

  // Fetch adjuster contacts from CRM
  const fetchAdjusters = useCallback(async (q: string) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ tag: "adjuster" });
      if (q.trim()) params.set("q", q);
      const res = await fetch(`/api/contacts/search?${params}`);
      if (res.ok) {
        const data = await res.json();
        setOptions(data.contacts || []);
      }
    } catch {
      // Silently fail — user can still type manually
    } finally {
      setLoading(false);
    }
  }, []);

  // Load adjusters when dropdown opens
  useEffect(() => {
    if (open) {
      void fetchAdjusters(query);
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }
  }, [open]);

  // Debounced search
  useEffect(() => {
    if (!open) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchAdjusters(query), 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, open, fetchAdjusters]);

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const hasCurrentAdjuster = currentName && currentName !== "Not set";

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="w-full justify-between text-xs"
        onClick={() => setOpen(!open)}
      >
        <div className="flex items-center gap-1.5">
          <Shield className="h-3.5 w-3.5 text-blue-600" />
          <span className="truncate">
            {hasCurrentAdjuster ? `Recall: ${currentName}` : "Recall Adjuster…"}
          </span>
        </div>
        <ChevronsUpDown className="h-3.5 w-3.5 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {/* Search input */}
          <div className="border-b border-slate-200 p-2 dark:border-slate-700">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search saved adjusters…"
              className="w-full rounded-md border-0 bg-slate-50 px-3 py-1.5 text-sm outline-none placeholder:text-slate-400 focus:ring-2 focus:ring-blue-200 dark:bg-slate-800 dark:text-white"
              autoFocus
            />
          </div>

          {/* Options list */}
          <div className="max-h-48 overflow-y-auto p-1">
            {loading && <p className="px-3 py-2 text-xs text-muted-foreground">Searching…</p>}

            {!loading && options.length === 0 && (
              <p className="px-3 py-2 text-xs text-muted-foreground">
                {query ? "No matching adjusters found" : "No saved adjusters yet"}
              </p>
            )}

            {options.map((adj) => {
              const fullName = `${adj.firstName} ${adj.lastName}`.trim();
              const isSelected =
                currentName === fullName || (currentEmail && currentEmail === adj.email);

              return (
                <button
                  key={adj.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-slate-100 dark:hover:bg-slate-800",
                    isSelected && "bg-blue-50 dark:bg-blue-950/30"
                  )}
                  onClick={() => {
                    onSelect({
                      name: fullName,
                      email: adj.email || "",
                      phone: adj.phone || "",
                    });
                    setOpen(false);
                    setQuery("");
                  }}
                >
                  {isSelected ? (
                    <Check className="h-3.5 w-3.5 shrink-0 text-blue-600" />
                  ) : (
                    <Shield className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{fullName}</p>
                    {adj.email && (
                      <p className="truncate text-xs text-muted-foreground">{adj.email}</p>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
