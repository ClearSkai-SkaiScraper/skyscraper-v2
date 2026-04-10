/**
 * Quick AI Actions Bar
 *
 * One-click AI shortcuts for common tasks.
 * Appears at the top of claim detail for instant access.
 */

"use client";

import {
  CheckCircle2,
  Download,
  FileText,
  ListChecks,
  Loader2,
  MessageSquare,
  XCircle,
} from "lucide-react";
import { useState } from "react";

import { logger } from "@/lib/logger";

interface QuickAIActionsProps {
  claimId: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onActionComplete?: (action: string, result: any) => void;
}

interface QuickAction {
  id: string;
  label: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  task: string;
}

export function QuickAIActions({ claimId, onActionComplete }: QuickAIActionsProps) {
  const [loading, setLoading] = useState<string | null>(null);
  const [results, setResults] = useState<Record<string, "success" | "error">>({});

  const actions: QuickAction[] = [
    {
      id: "summarize",
      label: "Summarize for Homeowner",
      description: "Generate plain-English summary",
      icon: <FileText className="h-4 w-4" />,
      color: "bg-blue-600 hover:bg-blue-700",
      task: "triage",
    },
    {
      id: "scope",
      label: "Draft Scope",
      description: "AI-generated line items",
      icon: <ListChecks className="h-4 w-4" />,
      color: "bg-blue-600 hover:bg-blue-700",
      task: "damage",
    },
    {
      id: "update",
      label: "Write Update",
      description: "Homeowner communication draft",
      icon: <MessageSquare className="h-4 w-4" />,
      color: "bg-purple-600 hover:bg-purple-700",
      task: "triage",
    },
    {
      id: "report",
      label: "Generate Report",
      description: "Full AI-powered report",
      icon: <Download className="h-4 w-4" />,
      color: "bg-orange-600 hover:bg-orange-700",
      task: "policy",
    },
  ];

  const runAction = async (action: QuickAction) => {
    setLoading(action.id);
    setResults((prev) => {
      const copy = { ...prev };
      delete copy[action.id];
      return copy;
    });

    try {
      const response = await fetch(`/api/claims/${claimId}/ai`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: action.task }),
      });

      const data = await response.json();

      if (data.success) {
        setResults((prev) => ({ ...prev, [action.id]: "success" }));
        onActionComplete?.(action.id, data.result);
      } else {
        throw new Error(data.error);
      }
    } catch (error) {
      logger.error(`[QuickAIActions] Action ${action.id} failed:`, error);
      setResults((prev) => ({ ...prev, [action.id]: "error" }));
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-gradient-to-r from-slate-50 to-slate-100 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="font-semibold text-slate-900">Quick AI Actions</h3>
        <span className="text-xs text-slate-600">One-click shortcuts</span>
      </div>

      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">
        {actions.map((action) => {
          const isLoading = loading === action.id;
          const result = results[action.id];

          return (
            <button
              key={action.id}
              onClick={() => runAction(action)}
              disabled={isLoading}
              className={`relative rounded-lg p-3 text-white transition-all hover:scale-105 hover:shadow-lg active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 ${action.color} `}
            >
              <div className="flex flex-col items-start gap-2">
                <div className="flex w-full items-center justify-between">
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : action.icon}
                  {result === "success" && <CheckCircle2 className="h-4 w-4 text-green-300" />}
                  {result === "error" && <XCircle className="h-4 w-4 text-red-300" />}
                </div>
                <div>
                  <div className="text-sm font-semibold">{action.label}</div>
                  <div className="text-xs opacity-90">{action.description}</div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
