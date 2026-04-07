"use client";

import { AlertCircle, DollarSign,Loader2, Package, Plus, Save, Trash2, Users } from "lucide-react";
import { useEffect,useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { logger } from "@/lib/logger";

interface JobCostingPanelProps {
  jobId: string;
}

interface MaterialItem {
  description: string;
  quantity: number;
  unitCost: number;
}

interface LaborItem {
  role: string;
  hours: number;
  rate: number;
}

interface JobCostData {
  materials: MaterialItem[];
  labor: LaborItem[];
  overhead: Record<string, number>;
}

export function JobCostingPanel({ jobId }: JobCostingPanelProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<JobCostData>({
    materials: [],
    labor: [],
    overhead: {},
  });

  useEffect(() => {
    void fetchJobCost();
  }, [jobId]);

  const fetchJobCost = async () => {
    try {
      setError(null);
      const res = await fetch(`/api/job-cost/${jobId}`);

      if (!res.ok) {
        throw new Error(`Failed to fetch job cost: ${res.status}`);
      }

      const result = await res.json();

      if (result.success && result.data) {
        setData({
          materials: result.data.materials || [],
          labor: result.data.labor || [],
          overhead: result.data.overhead || {},
        });
      }
    } catch (error) {
      logger.error("Failed to fetch job cost:", error);
      setError("Unable to load job costing data");
      toast.error("Failed to load job costing data");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/job-cost/upsert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jobId,
          materials: data.materials,
          labor: data.labor,
          overhead: data.overhead,
        }),
      });

      if (!res.ok) throw new Error("Failed to save job cost");

      toast.success("Job costing saved successfully");
    } catch (error) {
      logger.error("Failed to save job cost:", error);
      toast.error("Failed to save job costing data");
    } finally {
      setSaving(false);
    }
  };

  const addMaterial = () => {
    setData({
      ...data,
      materials: [...data.materials, { description: "", quantity: 1, unitCost: 0 }],
    });
  };

  const removeMaterial = (index: number) => {
    setData({
      ...data,
      materials: data.materials.filter((_, i) => i !== index),
    });
  };

  const updateMaterial = (index: number, field: keyof MaterialItem, value: string | number) => {
    const updated = [...data.materials];
    updated[index] = { ...updated[index], [field]: value };
    setData({ ...data, materials: updated });
  };

  const addLabor = () => {
    setData({
      ...data,
      labor: [...data.labor, { role: "", hours: 0, rate: 0 }],
    });
  };

  const removeLabor = (index: number) => {
    setData({
      ...data,
      labor: data.labor.filter((_, i) => i !== index),
    });
  };

  const updateLabor = (index: number, field: keyof LaborItem, value: string | number) => {
    const updated = [...data.labor];
    updated[index] = { ...updated[index], [field]: value };
    setData({ ...data, labor: updated });
  };

  const addOverhead = () => {
    const key = prompt("Enter overhead item name:");
    if (key) {
      setData({
        ...data,
        overhead: { ...data.overhead, [key]: 0 },
      });
    }
  };

  const removeOverhead = (key: string) => {
    const updated = { ...data.overhead };
    delete updated[key];
    setData({ ...data, overhead: updated });
  };

  const updateOverhead = (key: string, value: number) => {
    setData({
      ...data,
      overhead: { ...data.overhead, [key]: value },
    });
  };

  const calculateMaterialsTotal = () => {
    return data.materials.reduce((sum, item) => sum + item.quantity * item.unitCost, 0);
  };

  const calculateLaborTotal = () => {
    return data.labor.reduce((sum, item) => sum + item.hours * item.rate, 0);
  };

  const calculateOverheadTotal = () => {
    return Object.values(data.overhead).reduce((sum, val) => sum + val, 0);
  };

  const calculateGrandTotal = () => {
    return calculateMaterialsTotal() + calculateLaborTotal() + calculateOverheadTotal();
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="h-8 w-48 animate-pulse rounded-lg bg-muted"></div>
          <div className="h-10 w-32 animate-pulse rounded-lg bg-muted"></div>
        </div>
        {[1, 2, 3].map((i) => (
          <Card key={i} className="rounded-2xl">
            <CardHeader>
              <div className="h-6 w-32 animate-pulse rounded bg-muted"></div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted"></div>
              <div className="h-10 w-full animate-pulse rounded-lg bg-muted"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <Card className="rounded-2xl border-2 border-red-500/40 bg-gradient-to-br from-red-50 to-red-100 shadow-xl dark:from-red-950 dark:to-red-900">
        <CardContent className="py-12">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-red-100 dark:bg-red-900">
              <AlertCircle className="h-6 w-6 text-red-600 dark:text-red-400" />
            </div>
            <div className="flex-1">
              <h2 className="mb-2 text-xl font-bold text-red-700 dark:text-red-200">
                Unable to Load Job Costing
              </h2>
              <p className="mb-4 text-sm text-red-600 dark:text-red-300">
                {error} This might be a temporary issue. Try refreshing or check back in a moment.
              </p>
              <Button
                variant="outline"
                className="border-red-300 bg-white text-red-700 hover:bg-red-50 dark:border-red-700 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900"
                onClick={fetchJobCost}
              >
                <AlertCircle className="mr-2 h-4 w-4" /> Try Again
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Job Costing</h2>
        <Button onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          )}
        </Button>
      </div>

      {/* Materials */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Materials</CardTitle>
          <Button size="sm" variant="outline" onClick={addMaterial}>
            <Plus className="mr-2 h-4 w-4" />
            Add Material
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.materials.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-slate-50 to-slate-100 py-12 text-center dark:from-slate-900/50 dark:to-slate-800/50">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#117CFF]/20 to-[#FFC838]/20">
                <Package className="h-8 w-8 text-[#117CFF]" />
              </div>
              <h4 className="mb-2 font-semibold text-foreground">No Materials Yet</h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Add materials to track costs and quantities
              </p>
              <Button size="sm" variant="outline" onClick={addMaterial}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Material
              </Button>
            </div>
          ) : (
            <>
              {data.materials.map((material, index) => (
                <div key={index} className="grid grid-cols-12 items-end gap-4">
                  <div className="col-span-5">
                    <Label>Description</Label>
                    <Input
                      value={material.description}
                      onChange={(e) => updateMaterial(index, "description", e.target.value)}
                      placeholder="Material name"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Quantity</Label>
                    <Input
                      type="number"
                      value={material.quantity}
                      onChange={(e) =>
                        updateMaterial(index, "quantity", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Unit Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={material.unitCost}
                      onChange={(e) =>
                        updateMaterial(index, "unitCost", parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Line Total</Label>
                    <Input
                      disabled
                      value={`$${(material.quantity * material.unitCost).toFixed(2)}`}
                    />
                  </div>
                  <div className="col-span-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeMaterial(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Materials Total</p>
                  <p className="text-2xl font-bold">${calculateMaterialsTotal().toFixed(2)}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Labor */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Labor</CardTitle>
          <Button size="sm" variant="outline" onClick={addLabor}>
            <Plus className="mr-2 h-4 w-4" />
            Add Labor
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {data.labor.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-slate-50 to-slate-100 py-12 text-center dark:from-slate-900/50 dark:to-slate-800/50">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#117CFF]/20 to-[#FFC838]/20">
                <Users className="h-8 w-8 text-[#117CFF]" />
              </div>
              <h4 className="mb-2 font-semibold text-foreground">No Labor Yet</h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Track labor hours and rates for accurate costing
              </p>
              <Button size="sm" variant="outline" onClick={addLabor}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Labor
              </Button>
            </div>
          ) : (
            <>
              {data.labor.map((labor, index) => (
                <div key={index} className="grid grid-cols-12 items-end gap-4">
                  <div className="col-span-5">
                    <Label>Role</Label>
                    <Input
                      value={labor.role}
                      onChange={(e) => updateLabor(index, "role", e.target.value)}
                      placeholder="Labor role"
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Hours</Label>
                    <Input
                      type="number"
                      step="0.5"
                      value={labor.hours}
                      onChange={(e) => updateLabor(index, "hours", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Rate ($/hr)</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={labor.rate}
                      onChange={(e) => updateLabor(index, "rate", parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-2">
                    <Label>Line Total</Label>
                    <Input disabled value={`$${(labor.hours * labor.rate).toFixed(2)}`} />
                  </div>
                  <div className="col-span-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeLabor(index)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Labor Total</p>
                  <p className="text-2xl font-bold">${calculateLaborTotal().toFixed(2)}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Overhead */}
      <Card className="rounded-2xl">
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <CardTitle>Overhead & Other Costs</CardTitle>
          <Button size="sm" variant="outline" onClick={addOverhead}>
            <Plus className="mr-2 h-4 w-4" />
            Add Overhead
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {Object.keys(data.overhead).length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-gradient-to-br from-slate-50 to-slate-100 py-12 text-center dark:from-slate-900/50 dark:to-slate-800/50">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-[#117CFF]/20 to-[#FFC838]/20">
                <DollarSign className="h-8 w-8 text-[#117CFF]" />
              </div>
              <h4 className="mb-2 font-semibold text-foreground">No Overhead Costs Yet</h4>
              <p className="mb-3 text-sm text-muted-foreground">
                Add overhead items like permits, insurance, or equipment rental
              </p>
              <Button size="sm" variant="outline" onClick={addOverhead}>
                <Plus className="mr-2 h-4 w-4" />
                Add First Overhead
              </Button>
            </div>
          ) : (
            <>
              {Object.entries(data.overhead).map(([key, value]) => (
                <div key={key} className="grid grid-cols-12 items-end gap-4">
                  <div className="col-span-9">
                    <Label>{key}</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={value}
                      onChange={(e) => updateOverhead(key, parseFloat(e.target.value) || 0)}
                    />
                  </div>
                  <div className="col-span-3">
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() => removeOverhead(key)}
                      className="text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
              <div className="flex justify-end border-t pt-4">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Overhead Total</p>
                  <p className="text-2xl font-bold">${calculateOverheadTotal().toFixed(2)}</p>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Grand Total */}
      <Card className="rounded-2xl border-primary">
        <CardContent className="py-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground">Total Job Cost</p>
              <p className="mt-1 text-xs text-muted-foreground">Materials + Labor + Overhead</p>
            </div>
            <p className="text-4xl font-bold text-primary">${calculateGrandTotal().toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
