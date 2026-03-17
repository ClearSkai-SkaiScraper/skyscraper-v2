"use client";

import {
  Calculator,
  Download,
  FileText,
  Loader2,
  Palette,
  Save,
  Send,
  Sparkles,
  TrendingDown,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface Claim {
  id: string;
  claimNumber: string;
  insured_name: string;
  propertyAddress?: string;
}

interface DashboardAIAssistantProps {
  claims: Claim[];
  orgId: string;
}

type AIAction = "supplement" | "depreciation" | "estimate";

export function DashboardAIAssistant({ claims, orgId }: DashboardAIAssistantProps) {
  const [selectedClaimId, setSelectedClaimId] = useState<string>("");
  const [activeAction, setActiveAction] = useState<AIAction | null>(null);
  const [prompt, setPrompt] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [output, setOutput] = useState<string>("");

  const handleActionClick = (action: AIAction) => {
    setActiveAction(action);
    setOutput("");

    // Set default prompts based on action
    const defaultPrompts = {
      supplement: "Generate a supplement request for additional damage found during inspection...",
      depreciation: "Calculate depreciation for damaged items based on age and condition...",
      estimate: "Create a detailed scope of work and estimate for repairs...",
    };

    setPrompt(defaultPrompts[action]);
  };

  const handleRun = async () => {
    if (!selectedClaimId || !activeAction || !prompt.trim()) {
      return;
    }

    setIsLoading(true);
    try {
      // Call AI API endpoint
      const response = await fetch("/api/ai/dashboard-assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaimId,
          action: activeAction,
          prompt: prompt.trim(),
          orgId,
        }),
      });

      if (!response.ok) {
        throw new Error("AI request failed");
      }

      const data = await response.json();
      setOutput(data.output || "No output generated");
    } catch (error) {
      logger.error("[DashboardAIAssistant] Error:", error);
      setOutput("Error: Failed to generate AI response. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveToClaim = async () => {
    if (!output || !selectedClaimId) return;

    try {
      await fetch("/api/claims/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaimId,
          content: output,
          type: activeAction,
          title: `AI ${activeAction} - ${new Date().toLocaleDateString()}`,
        }),
      });

      // Show success feedback
      alert("Document saved to claim!");
    } catch (error) {
      logger.error("[DashboardAIAssistant] Save error:", error);
      alert("Failed to save document");
    }
  };

  const handleSendToPortal = async () => {
    if (!output || !selectedClaimId) return;

    try {
      await fetch("/api/portal/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaimId,
          content: output,
          type: activeAction,
        }),
      });

      alert("Document sent to client portal!");
    } catch (error) {
      logger.error("[DashboardAIAssistant] Send error:", error);
      alert("Failed to send to portal");
    }
  };

  const handleDownload = () => {
    if (!output) return;

    const blob = new Blob([output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ai-${activeAction}-${Date.now()}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const selectedClaim = claims.find((c) => c.id === selectedClaimId);

  return (
    <Card className="rounded-2xl border border-purple-500/20 bg-gradient-to-br from-white/60 to-purple-50/30 shadow-[0_0_30px_-12px_rgba(0,0,0,0.25)] backdrop-blur-xl dark:from-slate-900/50 dark:to-purple-900/10">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-slate-900 dark:text-white">
          <Sparkles className="h-5 w-5 text-purple-600 dark:text-purple-400" />
          AI Assistant
        </CardTitle>
        <p className="text-sm text-slate-600 dark:text-slate-400">
          Generate supplements, estimates, and reports with AI
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Claim Selector */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            Select Claim
          </label>
          <Select value={selectedClaimId} onValueChange={setSelectedClaimId}>
            <SelectTrigger className="bg-white/80 dark:bg-slate-800/80">
              <SelectValue placeholder="Choose a claim..." />
            </SelectTrigger>
            <SelectContent>
              {claims.length === 0 && (
                <SelectItem value="_empty" disabled>
                  No claims available
                </SelectItem>
              )}
              {claims.map((claim) => (
                <SelectItem key={claim.id} value={claim.id}>
                  {claim.claimNumber} - {claim.insured_name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selectedClaim && (
            <p className="text-xs text-slate-600 dark:text-slate-400">
              {selectedClaim.propertyAddress || "No address"}
            </p>
          )}
        </div>

        {/* AI Action Buttons */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            AI Actions
          </label>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant={activeAction === "supplement" ? "default" : "outline"}
              className="flex h-auto flex-col items-center gap-2 py-4"
              onClick={() => handleActionClick("supplement")}
              disabled={!selectedClaimId}
            >
              <FileText className="h-5 w-5" />
              <span className="text-xs">Write Supplement</span>
            </Button>
            <Button
              variant={activeAction === "depreciation" ? "default" : "outline"}
              className="flex h-auto flex-col items-center gap-2 py-4"
              onClick={() => handleActionClick("depreciation")}
              disabled={!selectedClaimId}
            >
              <TrendingDown className="h-5 w-5" />
              <span className="text-xs">Depreciation</span>
            </Button>
            <Button
              variant={activeAction === "estimate" ? "default" : "outline"}
              className="flex h-auto flex-col items-center gap-2 py-4"
              onClick={() => handleActionClick("estimate")}
              disabled={!selectedClaimId}
            >
              <Calculator className="h-5 w-5" />
              <span className="text-xs">Estimate/Scope</span>
            </Button>
            <Link href="/settings/branding">
              <Button
                variant="outline"
                className="flex h-auto w-full flex-col items-center gap-2 py-4"
              >
                <Palette className="h-5 w-5" />
                <span className="text-xs">Company Branding</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Prompt Input */}
        {activeAction && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Instructions
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Enter specific instructions for the AI..."
              className="min-h-[100px] bg-white/80 dark:bg-slate-800/80"
              disabled={isLoading}
            />
            <Button onClick={handleRun} disabled={isLoading || !prompt.trim()} className="w-full">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Run AI
                </>
              )}
            </Button>
          </div>
        )}

        {/* Output Preview */}
        {output && (
          <div className="space-y-3">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Output</label>
            <div className="max-h-[300px] overflow-y-auto rounded-lg border border-slate-200 bg-white/80 p-4 text-sm dark:border-slate-700 dark:bg-slate-800/80">
              <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 dark:text-slate-300">
                {output}
              </pre>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={handleSaveToClaim} className="flex-1">
                <Save className="mr-2 h-4 w-4" />
                Save to Claim
              </Button>
              <Button variant="outline" size="sm" onClick={handleSendToPortal} className="flex-1">
                <Send className="mr-2 h-4 w-4" />
                Send to Portal
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
