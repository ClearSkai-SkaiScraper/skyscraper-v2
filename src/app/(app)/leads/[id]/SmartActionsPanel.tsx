"use client";

import {
  Calendar,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Package,
  Phone,
  Wrench,
  X,
  Zap,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAIStream } from "@/hooks/useAIStream";

import { SmartActionModal } from "./SmartActionModal";

interface SmartActionsPanelProps {
  leadId: string;
}

type ActionType =
  | "callScript"
  | "textMessage"
  | "emailReply"
  | "jobSummary"
  | "inspectionChecklist"
  | "materialList"
  | "workOrderNotes"
  | "followUp"
  | "preInspection";

interface SmartAction {
  id: ActionType;
  label: string;
  icon: React.ReactNode;
  description: string;
}

const actions: SmartAction[] = [
  {
    id: "callScript",
    label: "Call Script",
    icon: <Phone className="h-5 w-5" />,
    description: "30-45 second conversation guide",
  },
  {
    id: "textMessage",
    label: "Text Message",
    icon: <MessageSquare className="h-5 w-5" />,
    description: "Quick scheduling text",
  },
  {
    id: "emailReply",
    label: "Email Reply",
    icon: <Mail className="h-5 w-5" />,
    description: "Professional email response",
  },
  {
    id: "jobSummary",
    label: "Job Summary",
    icon: <FileText className="h-5 w-5" />,
    description: "High-level job overview",
  },
  {
    id: "inspectionChecklist",
    label: "Inspection Checklist",
    icon: <ClipboardList className="h-5 w-5" />,
    description: "Tools & areas to check",
  },
  {
    id: "materialList",
    label: "Material List",
    icon: <Package className="h-5 w-5" />,
    description: "Materials needed (no pricing)",
  },
  {
    id: "workOrderNotes",
    label: "Work Order Notes",
    icon: <Wrench className="h-5 w-5" />,
    description: "Crew instructions & safety",
  },
  {
    id: "followUp",
    label: "Follow-Up",
    icon: <Calendar className="h-5 w-5" />,
    description: "Check-in message",
  },
  {
    id: "preInspection",
    label: "Pre-Inspection",
    icon: <ClipboardCheck className="h-5 w-5" />,
    description: "Customer prep instructions",
  },
];

export function SmartActionsPanel({ leadId }: SmartActionsPanelProps) {
  const [streamingAction, setStreamingAction] = useState<ActionType | null>(null);
  const [modalContent, setModalContent] = useState<{
    title: string;
    content: string;
    action: ActionType;
  } | null>(null);

  const {
    text: streamingText,
    isStreaming,
    startStream,
    cancelStream,
  } = useAIStream({
    onComplete: (fullText) => {
      if (streamingAction) {
        const actionObj = actions.find((a) => a.id === streamingAction);
        setModalContent({
          title: actionObj?.label || "Action",
          content: fullText,
          action: streamingAction,
        });
        setStreamingAction(null);
        toast.success(`Your ${actionObj?.label.toLowerCase()} has been generated`);
      }
    },
    onError: (err) => {
      toast.error(err.message);
      setStreamingAction(null);
    },
  });

  async function handleAction(action: SmartAction) {
    setStreamingAction(action.id);
    toast(`Creating your ${action.label.toLowerCase()}...`);

    try {
      await startStream("/api/ai/stream/analyze", {
        leadId,
        type: "smart-action",
        action: action.id,
      });
    } catch (_err) {
      // Error handled by useAIStream
    }
  }

  return (
    <>
      <Card className="rounded-xl border bg-white shadow dark:bg-neutral-900">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-yellow-500" />
            Smart Actions
          </CardTitle>
          <p className="text-sm text-gray-600">
            One-click AI-generated tools to speed up your workflow
          </p>
        </CardHeader>

        <CardContent>
          {isStreaming && streamingAction && (
            <div className="mb-6 rounded-lg border border-sky-200 bg-gradient-to-r from-sky-50 to-blue-50 p-6 dark:border-sky-800 dark:from-sky-900/20 dark:to-blue-900/20">
              <div className="mb-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Zap className="h-5 w-5 animate-pulse text-purple-600" />
                  <h3 className="font-semibold text-purple-900 dark:text-purple-100">
                    Generating {actions.find((a) => a.id === streamingAction)?.label}...
                  </h3>
                </div>
                <Button
                  onClick={cancelStream}
                  variant="ghost"
                  size="sm"
                  className="text-red-600 hover:text-red-700"
                >
                  <X className="mr-1 h-4 w-4" />
                  Cancel
                </Button>
              </div>
              <div className="max-h-[400px] min-h-[120px] overflow-y-auto whitespace-pre-wrap rounded-lg bg-white p-4 font-mono text-sm dark:bg-neutral-800">
                {streamingText || "Initializing..."}
                <span className="ml-1 inline-block h-4 w-2 animate-pulse bg-purple-600" />
              </div>
              <div className="mt-4 flex items-center gap-2 text-sm text-purple-700 dark:text-purple-300">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Streaming AI generation in real-time</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {actions.map((action) => (
              <Button
                key={action.id}
                onClick={() => handleAction(action)}
                disabled={isStreaming}
                variant="outline"
                className="h-auto flex-col items-start p-4 text-left transition-colors hover:border-purple-300 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-white"
              >
                <div className="mb-2 flex w-full items-center gap-2">
                  <div className="text-purple-600">{action.icon}</div>
                  <span className="text-sm font-semibold">{action.label}</span>
                </div>
                <span className="text-xs text-gray-500">{action.description}</span>
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {modalContent && (
        <SmartActionModal
          title={modalContent.title}
          content={modalContent.content}
          action={modalContent.action}
          leadId={leadId}
          onClose={() => setModalContent(null)}
          onRegenerate={() => {
            const actionObj = actions.find((a) => a.id === modalContent.action);
            if (actionObj) {
              setModalContent(null);
              void handleAction(actionObj);
            }
          }}
        />
      )}
    </>
  );
}
