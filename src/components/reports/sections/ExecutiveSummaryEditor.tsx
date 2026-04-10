/**
 * EXECUTIVE SUMMARY EDITOR
 * Section 1 of Universal Claims Report
 */

"use client";

import { Check,Save } from "lucide-react";
import { useEffect,useState } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { logger } from "@/lib/logger";

interface ExecutiveSummaryData {
  stormEvent: string;
  roofCondition: string;
  conclusion: string;
}

interface ExecutiveSummaryEditorProps {
  claimId: string;
  initialData?: ExecutiveSummaryData;
}

export function ExecutiveSummaryEditor({ claimId, initialData }: ExecutiveSummaryEditorProps) {
  const [data, setData] = useState<ExecutiveSummaryData>(
    initialData || {
      stormEvent: "",
      roofCondition: "",
      conclusion: "",
    }
  );

  const [isSaving, setIsSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const debouncedData = useDebounce(data, 2000);

  useEffect(() => {
    if (debouncedData && lastSaved !== null) {
      void saveData();
    }
  }, [debouncedData]);
// eslint-disable-next-line react-hooks/exhaustive-deps

  async function saveData() {
    setIsSaving(true);
    try {
      const response = await fetch(`/api/claims/${claimId}/report`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          section: "executiveSummary",
          data,
        }),
      });

      if (!response.ok) throw new Error("Save failed");

      setLastSaved(new Date());
      logger.debug("[EXEC_SUMMARY] Auto-saved");
    } catch (error) {
      logger.error("[EXEC_SUMMARY] Save error:", error);
    } finally {
      setIsSaving(false);
    }
  }

  function updateField(field: keyof ExecutiveSummaryData, value: string) {
    setData((prev) => ({ ...prev, [field]: value }));
    if (lastSaved === null) setLastSaved(new Date());
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Executive Summary</h2>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          {isSaving ? (
            <>
              <Save className="h-4 w-4 animate-spin" />
              <span>Saving...</span>
            </>
          ) : lastSaved ? (
            <>
              <Check className="h-4 w-4 text-green-500" />
              <span>Saved {lastSaved.toLocaleTimeString()}</span>
            </>
          ) : null}
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Storm Event</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.stormEvent}
            onChange={(e) => updateField("stormEvent", e.target.value)}
            placeholder="Describe the storm event that caused the damage..."
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roof Condition</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.roofCondition}
            onChange={(e) => updateField("roofCondition", e.target.value)}
            placeholder="Describe the current condition of the roof..."
            rows={4}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Conclusion</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            value={data.conclusion}
            onChange={(e) => updateField("conclusion", e.target.value)}
            placeholder="Professional conclusion and recommendations..."
            rows={4}
          />
        </CardContent>
      </Card>
    </div>
  );
}
