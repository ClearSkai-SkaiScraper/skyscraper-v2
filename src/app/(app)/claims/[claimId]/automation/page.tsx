// app/(app)/claims/[claimId]/automation/page.tsx
/**
 * 🔥 SKAI AUTOMATIONS PAGE
 * Complete autonomous claims engine dashboard
 */

"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { DominusAlertsPanel } from "@/components/automation/DominusAlertsPanel";
import { DominusGodModeButton } from "@/components/automation/DominusGodModeButton";
import { DominusRecommendations } from "@/components/automation/DominusRecommendations";
import { DominusTaskBoard } from "@/components/automation/DominusTaskBoard";
import { logger } from "@/lib/logger";

interface AutomationPageProps {
  params: { claimId: string };
}

export default function ClaimAutomationPage({ params }: AutomationPageProps) {
  const [intelligence, setIntelligence] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchIntelligence = async () => {
    try {
      const res = await fetch(`/api/automation/intelligence?claimId=${params.claimId}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setIntelligence(data);
    } catch (error) {
      logger.error("Failed to fetch intelligence:", error);
      toast.error("Failed to load automation data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void fetchIntelligence();
  }, [params.claimId]);

  const handleDismissAlert = async (alertId: string) => {
    try {
      await fetch("/api/automation/alert/dismiss", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ alertId }),
      });
      toast.success("Alert dismissed");
      void fetchIntelligence();
    } catch (error) {
      toast.error("Failed to dismiss alert");
    }
  };

  const handleAcceptRecommendation = async (recommendationId: string) => {
    try {
      await fetch("/api/automation/recommendation/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId }),
      });
      toast.success("Recommendation accepted");
      void fetchIntelligence();
    } catch (error) {
      toast.error("Failed to accept recommendation");
    }
  };

  const handleDismissRecommendation = async (recommendationId: string) => {
    try {
      await fetch("/api/automation/recommendation/accept", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recommendationId }),
      });
      void fetchIntelligence();
    } catch (error) {
      toast.error("Failed to dismiss recommendation");
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    try {
      await fetch("/api/automation/task/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskId }),
      });
      toast.success("Task completed!");
      void fetchIntelligence();
    } catch (error) {
      toast.error("Failed to complete task");
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-6">
        <p>Loading SkaiPDF Intelligence...</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-3 text-3xl font-bold">
            🔥 Skai Automations
            <span className="rounded-full bg-red-100 px-3 py-1 text-sm font-normal text-red-800">
              AUTONOMOUS CLAIMS ENGINE
            </span>
          </h1>
          <p className="mt-1 text-sm text-gray-600">
            Let the claim manage itself. SkaiPDF detects, predicts, alerts, and acts automatically.
          </p>
        </div>
        <DominusGodModeButton claimId={params.claimId} onComplete={fetchIntelligence} />
      </div>

      {/* Stats Bar */}
      <div className="mb-8 grid grid-cols-4 gap-4">
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="text-sm font-semibold text-blue-600">Total Tasks</p>
          <p className="text-3xl font-bold text-blue-900">{intelligence?.stats.totalTasks || 0}</p>
        </div>
        <div className="rounded-lg border border-orange-200 bg-orange-50 p-4">
          <p className="text-sm font-semibold text-orange-600">Open Tasks</p>
          <p className="text-3xl font-bold text-orange-900">{intelligence?.stats.openTasks || 0}</p>
        </div>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4">
          <p className="text-sm font-semibold text-red-600">Critical Alerts</p>
          <p className="text-3xl font-bold text-red-900">
            {intelligence?.stats.criticalAlerts || 0}
          </p>
        </div>
        <div className="rounded-lg border border-purple-200 bg-purple-50 p-4">
          <p className="text-sm font-semibold text-purple-600">AI Recommendations</p>
          <p className="text-3xl font-bold text-purple-900">
            {intelligence?.stats.activeRecommendations || 0}
          </p>
        </div>
      </div>

      {/* Recommendations Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold">🧠 AI Recommendations</h2>
        <DominusRecommendations
          recommendations={intelligence?.recommendations || []}
          onAccept={handleAcceptRecommendation}
          onDismiss={handleDismissRecommendation}
        />
      </div>

      {/* Alerts Section */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold">⚠️ Intelligent Alerts</h2>
        <DominusAlertsPanel alerts={intelligence?.alerts || []} onDismiss={handleDismissAlert} />
      </div>

      {/* Task Board */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-bold">📌 Task Board</h2>
        <DominusTaskBoard tasks={intelligence?.tasks || []} onComplete={handleCompleteTask} />
      </div>

      {/* Activity History */}
      <div>
        <h2 className="mb-4 text-xl font-bold">📊 Automation History</h2>
        <div className="rounded-lg border bg-gray-50 p-4">
          {intelligence?.triggers?.length > 0 ? (
            <div className="space-y-2">
              {intelligence.triggers.map((trigger: any) => (
                <div key={trigger.id} className="flex items-center gap-3 text-sm">
                  <span className="text-gray-500">
                    {new Date(trigger.createdAt).toLocaleString()}
                  </span>
                  <span className="font-semibold">{trigger.triggerType}</span>
                  <span
                    className={`rounded px-2 py-1 text-xs ${
                      trigger.status === "PROCESSED"
                        ? "bg-green-100 text-green-800"
                        : "bg-yellow-100 text-yellow-800"
                    }`}
                  >
                    {trigger.status}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No automation history yet</p>
          )}
        </div>
      </div>
    </div>
  );
}
