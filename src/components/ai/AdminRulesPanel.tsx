"use client";

import { Code, Eye, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

interface Rule {
  id: string;
  name: string;
  description: string;
  trigger: any; // DSL object
  action: any; // DSL object
  priority: number;
  enabled: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminRulesPanelProps {
  orgId: string;
}

export function AdminRulesPanel({ orgId }: AdminRulesPanelProps) {
  const [rules, setRules] = useState<Rule[]>([]);
  const [loading, setLoading] = useState(true);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [editingRule, setEditingRule] = useState<Rule | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    void fetchRules();
  }, [orgId]);

  const fetchRules = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/ai/rules?orgId=${orgId}`);

      if (!response.ok) {
        throw new Error("Failed to fetch rules");
      }

      const data = await response.json();
      setRules(data.rules || []);
    } catch (err) {
      logger.error("Failed to fetch rules:", err);
      toast.error("Error", {
        description: "Failed to load rules",
      });
    } finally {
      setLoading(false);
    }
  };

  const toggleRuleEnabled = async (ruleId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/ai/rules/${ruleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      if (!response.ok) {
        throw new Error("Failed to update rule");
      }

      setRules(rules.map((r) => (r.id === ruleId ? { ...r, enabled } : r)));
      toast.success("Success", {
        description: `Rule ${enabled ? "enabled" : "disabled"}`,
      });
    } catch (_err) {
      toast.error("Error", {
        description: "Failed to update rule",
      });
    }
  };

  const deleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return;

    try {
      const response = await fetch(`/api/ai/rules/${ruleId}`, {
        method: "DELETE",
      });

      if (!response.ok) {
        throw new Error("Failed to delete rule");
      }

      setRules(rules.filter((r) => r.id !== ruleId));
      toast.success("Success", {
        description: "Rule deleted",
      });
    } catch (_err) {
      toast.error("Error", {
        description: "Failed to delete rule",
      });
    }
  };

  const getCategoryBadgeColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "code_compliance":
        return "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400";
      case "carrier_patterns":
        return "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400";
      case "quality_checks":
        return "bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400";
      case "risk_flags":
        return "bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-400";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-950 dark:text-gray-400";
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
          <Skeleton className="mt-2 h-4 w-48" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Business Rules Management</CardTitle>
              <CardDescription>Create and manage AI decision rules</CardDescription>
            </div>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Rule
                </Button>
              </DialogTrigger>
              <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Rule</DialogTitle>
                  <DialogDescription>
                    Define a new business rule using the DSL builder
                  </DialogDescription>
                </DialogHeader>
                <RuleEditor
                  rule={null}
                  onSave={(newRule) => {
                    setRules([...rules, newRule]);
                    setIsCreateDialogOpen(false);
                    toast.success("Success", {
        description: "Rule created successfully",
      });
                  }}
                  onCancel={() => setIsCreateDialogOpen(false)}
                />
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            {rules.length === 0 ? (
              <div className="py-12 text-center text-muted-foreground">
                <Code className="mx-auto mb-2 h-12 w-12 opacity-50" />
                <p className="font-medium">No rules created yet</p>
                <p className="text-sm">Create your first business rule to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {rules.map((rule) => (
                  <Card key={rule.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="mb-3 flex items-start justify-between">
                        <div className="flex-1">
                          <div className="mb-1 flex items-center gap-2">
                            <h4 className="font-semibold">{rule.name}</h4>
                            <Badge className={getCategoryBadgeColor(rule.category)}>
                              {rule.category.replace(/_/g, " ")}
                            </Badge>
                            <Badge variant="outline">Priority: {rule.priority}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">{rule.description}</p>
                        </div>
                        <Switch
                          checked={rule.enabled}
                          onCheckedChange={(enabled) => toggleRuleEnabled(rule.id, enabled)}
                        />
                      </div>

                      <div className="flex items-center gap-2 border-t pt-3">
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Eye className="mr-1 h-4 w-4" />
                              View DSL
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-w-3xl">
                            <DialogHeader>
                              <DialogTitle>{rule.name}</DialogTitle>
                              <DialogDescription>Rule DSL Definition</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div>
                                <Label className="text-xs text-muted-foreground">Trigger</Label>
                                <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                                  {JSON.stringify(rule.trigger, null, 2)}
                                </pre>
                              </div>
                              <div>
                                <Label className="text-xs text-muted-foreground">Action</Label>
                                <pre className="mt-1 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                                  {JSON.stringify(rule.action, null, 2)}
                                </pre>
                              </div>
                            </div>
                          </DialogContent>
                        </Dialog>

                        <Dialog>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Code className="mr-1 h-4 w-4" />
                              Edit
                            </Button>
                          </DialogTrigger>
                          <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
                            <DialogHeader>
                              <DialogTitle>Edit Rule</DialogTitle>
                              <DialogDescription>Modify rule configuration</DialogDescription>
                            </DialogHeader>
                            <RuleEditor
                              rule={rule}
                              onSave={(updatedRule) => {
                                setRules(rules.map((r) => (r.id === rule.id ? updatedRule : r)));
                                toast.success("Success", {
        description: "Rule updated successfully",
      });
                              }}
                              onCancel={() => {}}
                            />
                          </DialogContent>
                        </Dialog>

                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteRule(rule.id)}
                          className="text-destructive"
                        >
                          <Trash2 className="mr-1 h-4 w-4" />
                          Delete
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}

interface RuleEditorProps {
  rule: Rule | null;
  onSave: (rule: Rule) => void;
  onCancel: () => void;
}

function RuleEditor({ rule, onSave, onCancel }: RuleEditorProps) {
  const [name, setName] = useState(rule?.name || "");
  const [description, setDescription] = useState(rule?.description || "");
  const [category, setCategory] = useState(rule?.category || "quality_checks");
  const [priority, setPriority] = useState(rule?.priority || 5);
  const [triggerDSL, setTriggerDSL] = useState(JSON.stringify(rule?.trigger || {}, null, 2));
  const [actionDSL, setActionDSL] = useState(JSON.stringify(rule?.action || {}, null, 2));
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    try {
      setSaving(true);

      // Validate JSON
      const trigger = JSON.parse(triggerDSL);
      const action = JSON.parse(actionDSL);

      const ruleData = {
        id: rule?.id || crypto.randomUUID(),
        name,
        description,
        category,
        priority,
        trigger,
        action,
        enabled: rule?.enabled ?? true,
        createdAt: rule?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      // API call would go here
      // For now, just return the data
      onSave(ruleData);
    } catch (_err) {
      toast.error("Invalid JSON", {
        description: "Please check your DSL syntax",
      });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <Label htmlFor="name">Rule Name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter rule name"
        />
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe what this rule does"
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="category">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="code_compliance">Code Compliance</SelectItem>
              <SelectItem value="carrier_patterns">Carrier Patterns</SelectItem>
              <SelectItem value="quality_checks">Quality Checks</SelectItem>
              <SelectItem value="risk_flags">Risk Flags</SelectItem>
              <SelectItem value="negotiation">Negotiation</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="priority">Priority (1-10)</Label>
          <Input
            id="priority"
            type="number"
            min="1"
            max="10"
            value={priority}
            onChange={(e) => setPriority(parseInt(e.target.value))}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="trigger">Trigger DSL (JSON)</Label>
        <Textarea
          id="trigger"
          value={triggerDSL}
          onChange={(e) => setTriggerDSL(e.target.value)}
          placeholder='{"all": [{"path": "claim.status", "op": "equals", "value": "new"}]}'
          rows={8}
          className="font-mono text-xs"
        />
      </div>

      <div>
        <Label htmlFor="action">Action DSL (JSON)</Label>
        <Textarea
          id="action"
          value={actionDSL}
          onChange={(e) => setActionDSL(e.target.value)}
          placeholder='{"type": "recommend", "priority": "high", "message": "Take action"}'
          rows={8}
          className="font-mono text-xs"
        />
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={saving || !name || !description}>
          {saving ? "Saving..." : "Save Rule"}
        </Button>
      </DialogFooter>
    </div>
  );
}
