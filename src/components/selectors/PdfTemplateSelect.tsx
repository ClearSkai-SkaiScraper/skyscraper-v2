"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type TemplateLite = {
  id: string;
  name: string;
  category: string | null;
  templateType?: string | null;
  isDefault?: boolean;
};

export function PdfTemplateSelect(props: {
  value: string;
  onValueChange: (templateId: string) => void;
  reportType?: string;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const {
    value,
    onValueChange,
    reportType,
    placeholder = "Select PDF template",
    className,
    disabled,
  } = props;

  const [templates, setTemplates] = useState<TemplateLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchTemplates(url: string): Promise<TemplateLite[]> {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) return [];
      const data = await res.json();
      if (!Array.isArray(data)) return [];
      return data
        .filter((t) => t && typeof t.id === "string" && typeof t.name === "string")
        .map((t) => ({
          id: String(t.id),
          name: String(t.name),
          category: t.category ?? null,
          templateType: t.templateType ?? null,
          isDefault: Boolean(t.isDefault),
        }));
    }

    async function run() {
      setLoading(true);
      try {
        const query = reportType ? `?type=${encodeURIComponent(reportType)}` : "";
        const primary = await fetchTemplates(`/api/templates/list${query}`);

        // If the type-filter returns nothing, fall back to all templates.
        const resolved =
          primary.length > 0 || !reportType ? primary : await fetchTemplates(`/api/templates/list`);

        if (!cancelled) setTemplates(resolved);
      } catch (_e) {
        if (!cancelled) setTemplates([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [reportType]);

  const isDisabled = disabled || loading;

  const placeholderText = useMemo(() => {
    if (loading) return "Loading templates...";
    if (templates.length === 0) return "No templates found — visit Templates page";
    return placeholder;
  }, [loading, templates.length, placeholder]);

  return (
    <Select value={value || undefined} onValueChange={onValueChange} disabled={isDisabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholderText} />
      </SelectTrigger>
      <SelectContent>
        {templates.map((t) => (
          <SelectItem key={t.id} value={t.id}>
            {t.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
