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
  jobsPosted: { weekly: number; monthly: number };
  revenue: { weekly: number; monthly: number };
  claimsSigned: { weekly: number; monthly: number };
  leadsGenerated: { weekly: number; monthly: number };
}

const DEFAULT_GOALS: GoalSettings = {
  doorsKnocked: { weekly: 100, monthly: 400 },
  jobsPosted: { weekly: 15, monthly: 60 },
  revenue: { weekly: 75000, monthly: 300000 },
  claimsSigned: { weekly: 5, monthly: 20 },
  leadsGenerated: { weekly: 25, monthly: 100 },
};

export default function GoalSettingsPage() {
  const [goals, setGoals] = useState<GoalSettings>(DEFAULT_GOALS);
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    // Load from localStorage
    try {
      const saved = localStorage.getItem("skai-goal-settings");
      if (saved) setGoals(JSON.parse(saved));
    } catch {}
    setLoaded(true);
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      localStorage.setItem("skai-goal-settings", JSON.stringify(goals));
      toast.success("Goals saved successfully!");
    } catch {
      toast.error("Failed to save goals");
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
      key: "jobsPosted",
      label: "Jobs Posted",
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
                    jobsPosted: { weekly: 8, monthly: 32 },
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
                    jobsPosted: { weekly: 15, monthly: 60 },
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
                    jobsPosted: { weekly: 30, monthly: 120 },
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
                    jobsPosted: { weekly: 50, monthly: 200 },
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
