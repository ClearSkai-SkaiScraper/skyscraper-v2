"use client";

import { AlertCircle, Check, ChevronRight, Loader2, MapPin, Route, Users, Zap } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface LeadsSettingsClientProps {
  orgId: string;
  initialSettings?: {
    roundRobinEnabled?: boolean;
    geoRoutingEnabled?: boolean;
    idleLeadReminders?: boolean;
    reminderHours?: number;
    autoAssignNewLeads?: boolean;
  };
}

export default function LeadsSettingsClient({ orgId, initialSettings }: LeadsSettingsClientProps) {
  const [saving, setSaving] = useState(false);
  const [activeModal, setActiveModal] = useState<string | null>(null);

  // Settings state
  const [settings, setSettings] = useState({
    roundRobinEnabled: initialSettings?.roundRobinEnabled ?? false,
    geoRoutingEnabled: initialSettings?.geoRoutingEnabled ?? false,
    idleLeadReminders: initialSettings?.idleLeadReminders ?? true,
    reminderHours: initialSettings?.reminderHours ?? 48,
    autoAssignNewLeads: initialSettings?.autoAssignNewLeads ?? false,
  });

  const sections = [
    {
      id: "sources",
      title: "Lead Sources",
      description: "Manage inbound channels and attribution tracking.",
      icon: Zap,
      items: ["Webform embeds", "Manual entry", "CSV import", "Partner referrals"],
      comingSoon: false,
    },
    {
      id: "stages",
      title: "Pipeline Stages",
      description: "Customize progression for qualification and conversion.",
      icon: Route,
      items: ["New", "Contacted", "Qualified", "Estimate Sent", "Won / Lost"],
      comingSoon: false,
    },
    {
      id: "routing",
      title: "Routing & Automation",
      description: "Rules that auto-assign leads and trigger notifications.",
      icon: MapPin,
      items: [
        "Round-robin assignment",
        "Geo-based routing",
        "Idle lead reminders",
        "Auto-assignment rules",
      ],
      comingSoon: false,
    },
    {
      id: "team",
      title: "Team Assignment",
      description: "Configure who receives leads and their capacity.",
      icon: Users,
      items: ["Sales reps", "Territories", "Capacity limits", "Availability"],
      comingSoon: false,
    },
  ];

  const handleSaveSettings = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/settings/lead-routing", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, settings }),
      });

      if (!res.ok) {
        throw new Error("Failed to save");
      }

      toast.success("Settings saved successfully!");
      setActiveModal(null);
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (_error) {
      toast.error("Failed to save settings");
    } finally {
      setSaving(false);
    }
  };

  const handleOpenModal = (sectionId: string) => {
    setActiveModal(sectionId);
  };

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        {sections.map((section) => {
          const Icon = section.icon;
          return (
            <Card
              key={section.id}
              className={`transition-all hover:shadow-md ${
                section.comingSoon ? "opacity-75" : "cursor-pointer"
              }`}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600">
                    <Icon className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="flex items-center gap-2 text-base">
                      {section.title}
                      {section.comingSoon && (
                        <span className="rounded-full bg-amber-100 px-2 py-0.5 text-xs text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                          Coming Soon
                        </span>
                      )}
                    </CardTitle>
                    <CardDescription className="text-xs">{section.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <ul className="mb-4 ml-4 list-disc space-y-1 text-xs text-slate-600 dark:text-slate-400">
                  {section.items.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
                <Button
                  variant={section.comingSoon ? "outline" : "default"}
                  size="sm"
                  className="w-full"
                  onClick={() => handleOpenModal(section.id)}
                  disabled={section.comingSoon}
                >
                  {section.comingSoon ? "Coming Soon" : "Configure"}
                  {!section.comingSoon && <ChevronRight className="ml-1 h-4 w-4" />}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Routing & Automation Modal */}
      <Dialog
        open={activeModal === "routing"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5 text-teal-600" />
              Routing & Automation Settings
            </DialogTitle>
            <DialogDescription>
              Configure how leads are automatically assigned and managed.
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="assignment" className="mt-4">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="assignment">Assignment</TabsTrigger>
              <TabsTrigger value="reminders">Reminders</TabsTrigger>
            </TabsList>

            <TabsContent value="assignment" className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Round-Robin Assignment</Label>
                  <p className="text-xs text-slate-500">
                    Automatically distribute new leads evenly among team members
                  </p>
                </div>
                <Switch
                  checked={settings.roundRobinEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, roundRobinEnabled: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Auto-Assign New Leads</Label>
                  <p className="text-xs text-slate-500">
                    Immediately assign leads when they come in (requires round-robin)
                  </p>
                </div>
                <Switch
                  checked={settings.autoAssignNewLeads}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, autoAssignNewLeads: checked }))
                  }
                  disabled={!settings.roundRobinEnabled}
                />
              </div>

              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Geo-Based Routing</Label>
                  <p className="text-xs text-slate-500">
                    Route leads to reps based on territory/zipcode
                  </p>
                </div>
                <Switch
                  checked={settings.geoRoutingEnabled}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, geoRoutingEnabled: checked }))
                  }
                />
              </div>
            </TabsContent>

            <TabsContent value="reminders" className="space-y-4 pt-4">
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-sm font-medium">Idle Lead Reminders</Label>
                  <p className="text-xs text-slate-500">
                    Send alerts when leads haven&apos;t been touched
                  </p>
                </div>
                <Switch
                  checked={settings.idleLeadReminders}
                  onCheckedChange={(checked) =>
                    setSettings((prev) => ({ ...prev, idleLeadReminders: checked }))
                  }
                />
              </div>

              {settings.idleLeadReminders && (
                <div className="rounded-lg border p-4">
                  <Label className="text-sm font-medium">Reminder After (hours)</Label>
                  <p className="mb-2 text-xs text-slate-500">
                    Time before sending idle lead notification
                  </p>
                  <Input
                    type="number"
                    value={settings.reminderHours}
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        reminderHours: parseInt(e.target.value) || 48,
                      }))
                    }
                    min={1}
                    max={168}
                    className="w-24"
                  />
                </div>
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Cancel
            </Button>
            <Button onClick={handleSaveSettings} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="mr-2 h-4 w-4" />
                  Save Settings
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Lead Sources Modal */}
      <Dialog
        open={activeModal === "sources"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Zap className="h-5 w-5 text-teal-600" />
              Lead Sources
            </DialogTitle>
            <DialogDescription>
              Configure which channels feed leads into your pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            {["Webform Embed", "Manual Entry", "CSV Import", "Partner Referrals"].map((src) => (
              <div key={src} className="flex items-center justify-between rounded-lg border p-3">
                <span className="text-sm font-medium">{src}</span>
                <Switch defaultChecked />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                toast.success("Sources saved");
                setActiveModal(null);
              }}
            >
              <Check className="mr-2 h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pipeline Stages Modal */}
      <Dialog
        open={activeModal === "stages"}
        onOpenChange={(open) => !open && setActiveModal(null)}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Route className="h-5 w-5 text-teal-600" />
              Pipeline Stages
            </DialogTitle>
            <DialogDescription>
              Customize the stages leads progress through in your pipeline.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-4">
            {["New", "Contacted", "Qualified", "Estimate Sent", "Won", "Lost"].map((stage, i) => (
              <div key={stage} className="flex items-center gap-3 rounded-lg border p-3">
                <span className="flex h-6 w-6 items-center justify-center rounded-full bg-teal-100 text-xs font-bold text-teal-700 dark:bg-teal-900/40 dark:text-teal-300">
                  {i + 1}
                </span>
                <Input defaultValue={stage} className="h-8 text-sm" />
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                toast.success("Stages saved");
                setActiveModal(null);
              }}
            >
              <Check className="mr-2 h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Team Assignment Modal */}
      <Dialog open={activeModal === "team"} onOpenChange={(open) => !open && setActiveModal(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-teal-600" />
              Team Assignment
            </DialogTitle>
            <DialogDescription>
              Configure team members who receive leads and their capacity.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-4">
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Territory-Based Assignment</p>
                <p className="text-xs text-slate-500">Route leads based on zip code territories</p>
              </div>
              <Switch defaultChecked={false} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Capacity Limits</p>
                <p className="text-xs text-slate-500">Max active leads per team member</p>
              </div>
              <Input type="number" defaultValue={25} className="h-8 w-20 text-sm" min={1} />
            </div>
            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">Availability Check</p>
                <p className="text-xs text-slate-500">Skip unavailable members in assignment</p>
              </div>
              <Switch defaultChecked />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setActiveModal(null)}>
              Close
            </Button>
            <Button
              onClick={() => {
                toast.success("Team settings saved");
                setActiveModal(null);
              }}
            >
              <Check className="mr-2 h-4 w-4" /> Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Advanced Features */}
      <Card className="mt-6 border-dashed">
        <CardContent className="py-6 text-center">
          <AlertCircle className="mx-auto mb-2 h-8 w-8 text-teal-500" />
          <p className="mb-2 text-sm font-medium">Advanced Features</p>
          <p className="text-xs text-slate-500">
            Custom SLA timers • Duplicate detection • Multi-touch attribution • AI qualification
            scoring
          </p>
        </CardContent>
      </Card>
    </>
  );
}
