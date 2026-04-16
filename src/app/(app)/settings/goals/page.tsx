"use client";

import { DollarSign, DoorOpen, FileText, Save, Settings, Target, TrendingUp } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

interface GoalSettings {
  doorsKnocked: { weekly: number; monthly: number };
  coldCalls: { weekly: number; monthly: number };
  revenue: { weekly: number; monthly: number };
  claimsSigned: { weekly: number; monthly: number };
  leadsGenerated: { weekly: number; monthly: number };
}

const DEFAULT_GOALS: GoalSettings = {
  doorsKnocked: { weekly: 100, monthly: 400 },
  coldCalls: { weekly: 15, monthly: 60 },
  revenue: { weekly: 75000, monthly: 300000 },
  claimsSigned: { weekly: 5, monthly: 20 },
  leadsGenerated: { weekly: 25, monthly: 100 },
};

export default function GoalSettingsPage() {
  const [goals, setGoals] = useState<GoalSettings>(DEFAULT_GOALS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load from API (DB-backed) first, fall back to localStorage
    void (async () => {
      try {
        const res = await fetch("/api/goals");
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data?.goals?.length > 0) {
            const dbGoals = data.data.goals;
            const categoryMap: Record<string, string> = {
              doors_knocked: "doorsKnocked",
              claims_signed: "claimsSigned",
              revenue: "revenue",
              cold_calls: "coldCalls",
              leads_generated: "leadsGenerated",
            };
            const merged = { ...DEFAULT_GOALS };
            for (const g of dbGoals) {
              const key = categoryMap[g.category] as keyof GoalSettings | undefined;
              if (key && merged[key]) {
                merged[key] = { weekly: g.weekly, monthly: g.monthly };
              }
            }
            setGoals(merged);
            setLoaded(true);
            return;
          }
        }
      } catch {
        // Fall through to localStorage
      }
      try {
        const saved = localStorage.getItem("skai-goal-settings");
        if (saved) setGoals(JSON.parse(saved));
      } catch {}
      setLoaded(true);
    })();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      // Save to DB via API
      const keyMap: Record<string, string> = {
        doorsKnocked: "doors_knocked",
        claimsSigned: "claims_signed",
        revenue: "revenue",
        coldCalls: "cold_calls",
        leadsGenerated: "leads_generated",
      };
      const apiGoals = Object.entries(keyMap).map(([lsKey, dbCategory]) => ({
        category: dbCategory,
        weekly: goals[lsKey as keyof GoalSettings]?.weekly ?? 0,
        monthly: goals[lsKey as keyof GoalSettings]?.monthly ?? 0,
      }));
      const res = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ goals: apiGoals }),
      });
      if (!res.ok) throw new Error("API save failed");
      // Also sync to localStorage for backward compat
      localStorage.setItem("skai-goal-settings", JSON.stringify(goals));
      toast.success("Goals saved successfully!");
    } catch {
      // Fallback: at least save to localStorage
      try {
        localStorage.setItem("skai-goal-settings", JSON.stringify(goals));
        toast.success("Goals saved locally (server sync pending)");
      } catch {
        toast.error("Failed to save goals");
      }
    } finally {
      setSaving(false);
    }
  };

  const updateGoal = (key: keyof GoalSettings, period: "weekly" | "monthly", value: number) => {
    setGoals((prev) => ({
      ...prev,
      [key]: { ...prev[key], [period]: value },
    }));
  };

  const goalFields: {
    key: keyof GoalSettings;
    label: string;
    icon: React.ReactNode;
    color: string;
    format?: "currency";
  }[] = [
    {
      key: "doorsKnocked",
      label: "Doors Knocked",
      icon: <DoorOpen className="h-5 w-5" />,
      color: "text-blue-500",
    },
    {
      key: "coldCalls",
      label: "Cold Calls",
      icon: <FileText className="h-5 w-5" />,
      color: "text-amber-500",
    },
    {
      key: "revenue",
      label: "Revenue",
      icon: <DollarSign className="h-5 w-5" />,
      color: "text-green-500",
      format: "currency",
    },
    {
      key: "claimsSigned",
      label: "Claims Signed",
      icon: <TrendingUp className="h-5 w-5" />,
      color: "text-purple-500",
    },
    {
      key: "leadsGenerated",
      label: "Leads Generated",
      icon: <Target className="h-5 w-5" />,
      color: "text-indigo-500",
    },
  ];

  if (!loaded) {
    return (
      <PageContainer>
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer>
      <PageHero
        section="settings"
        title="Goal Settings"
        subtitle="Set your weekly and monthly performance targets. These goals power your dashboard briefing and progress tracking."
        icon={<Settings className="h-5 w-5" />}
      >
        <Button onClick={handleSave} disabled={saving}>
          <Save className="mr-2 h-4 w-4" />
          {saving ? "Saving..." : "Save Goals"}
        </Button>
      </PageHero>

      <div className="space-y-6">
        {/* Goal Cards */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {goalFields.map((field) => (
            <Card key={field.key} className="overflow-hidden">
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <span className={field.color}>{field.icon}</span>
                  {field.label}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Weekly Target</Label>
                  <div className="relative mt-1">
                    {field.format === "currency" && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                    )}
                    <Input
                      type="number"
                      min={0}
                      value={goals[field.key].weekly}
                      onChange={(e) =>
                        updateGoal(field.key, "weekly", parseInt(e.target.value) || 0)
                      }
                      className={field.format === "currency" ? "pl-7" : ""}
                    />
                  </div>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Monthly Target</Label>
                  <div className="relative mt-1">
                    {field.format === "currency" && (
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">
                        $
                      </span>
                    )}
                    <Input
                      type="number"
                      min={0}
                      value={goals[field.key].monthly}
                      onChange={(e) =>
                        updateGoal(field.key, "monthly", parseInt(e.target.value) || 0)
                      }
                      className={field.format === "currency" ? "pl-7" : ""}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Quick Presets */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Quick Presets</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setGoals({
                    doorsKnocked: { weekly: 50, monthly: 200 },
                    coldCalls: { weekly: 8, monthly: 32 },
                    revenue: { weekly: 30000, monthly: 120000 },
                    claimsSigned: { weekly: 3, monthly: 12 },
                    leadsGenerated: { weekly: 15, monthly: 60 },
                  })
                }
              >
                🌱 Starter
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setGoals({
                    doorsKnocked: { weekly: 100, monthly: 400 },
                    coldCalls: { weekly: 15, monthly: 60 },
                    revenue: { weekly: 75000, monthly: 300000 },
                    claimsSigned: { weekly: 5, monthly: 20 },
                    leadsGenerated: { weekly: 25, monthly: 100 },
                  })
                }
              >
                🚀 Standard
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setGoals({
                    doorsKnocked: { weekly: 200, monthly: 800 },
                    coldCalls: { weekly: 30, monthly: 120 },
                    revenue: { weekly: 150000, monthly: 600000 },
                    claimsSigned: { weekly: 10, monthly: 40 },
                    leadsGenerated: { weekly: 50, monthly: 200 },
                  })
                }
              >
                🔥 Aggressive
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() =>
                  setGoals({
                    doorsKnocked: { weekly: 350, monthly: 1400 },
                    coldCalls: { weekly: 50, monthly: 200 },
                    revenue: { weekly: 250000, monthly: 1000000 },
                    claimsSigned: { weekly: 20, monthly: 80 },
                    leadsGenerated: { weekly: 100, monthly: 400 },
                  })
                }
              >
                👑 Enterprise
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
