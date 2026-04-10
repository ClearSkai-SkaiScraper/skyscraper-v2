import { zodResolver } from "@hookform/resolvers/zod";
import * as React from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
// shadcn/ui
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

/**
 * Depreciation modal — drop-in component
 *
 * Purpose:
 *  - Collect per-carrier depreciation rules when a Carrier is selected
 *  - Persist to your ReportContext (or parent state) via onSave
 *  - Emit audit event hook (optional)
 *
 * Usage:
 *  <DepreciationModal
 *     open={open}
 *     onOpenChange={setOpen}
 *     carrierName={carrierName}
 *     initialValues={report.carrierDepreciation}
 *     onSave={(vals)=> updateReport({ carrierDepreciation: vals })}
 *     onAudit={(payload)=> audit("CARRIER_DEPRECIATION_SET", payload)}
 *  />
 */

const DepreciationSchema = z.object({
  percent: z
    .number({ invalid_type_error: "Enter a number" })
    .min(0, "Must be ≥ 0")
    .max(100, "Must be ≤ 100"),
  recoverable: z.boolean().default(true),
  holdbackRule: z.enum([
    "after_final_invoice",
    "after_completion_photos",
    "after_scope_approval",
    "other",
  ]),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type DepreciationValues = z.infer<typeof DepreciationSchema> & {
  carrier?: string;
};

export type DepreciationModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  carrierName?: string;
  initialValues?: Partial<DepreciationValues> | null;
  onSave: (values: DepreciationValues) => void;
  onAudit?: (payload: Record<string, unknown>) => void;
};

export function DepreciationModal(props: DepreciationModalProps) {
  const { open, onOpenChange, carrierName, initialValues, onSave, onAudit } = props;

  const form = useForm<DepreciationValues>({
    resolver: zodResolver(DepreciationSchema),
    mode: "onChange",
    defaultValues: {
      percent: Number(
        typeof initialValues?.percent === "number"
          ? initialValues?.percent
          : 0
      ),
      recoverable:
        typeof initialValues?.recoverable === "boolean"
          ? initialValues.recoverable
          : true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      holdbackRule: (initialValues?.holdbackRule as any) ?? "after_final_invoice",
      notes: initialValues?.notes ?? "",
      carrier: carrierName,
    },
  });

  const submit = form.handleSubmit((vals) => {
    const payload: DepreciationValues = { ...vals, carrier: carrierName };
    try {
      onSave(payload);
      onAudit?.({
        action: "CARRIER_DEPRECIATION_SET",
        carrier: carrierName,
        percent: payload.percent,
        recoverable: payload.recoverable,
        holdbackRule: payload.holdbackRule,
      });
      toast.success("Depreciation saved for " + (carrierName ?? "carrier"));
      onOpenChange(false);
    } catch (e) {
      console.error(e);
      toast.error("Failed to save depreciation settings.");
    }
  });

  // keep defaults in sync when carrier changes
  React.useEffect(() => {
    if (!open) return;
    form.reset({
      percent: Number(
        typeof initialValues?.percent === "number" ? initialValues.percent : 0
      ),
      recoverable:
        typeof initialValues?.recoverable === "boolean"
          ? initialValues.recoverable
          : true,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      holdbackRule: (initialValues?.holdbackRule as any) ?? "after_final_invoice",
      notes: initialValues?.notes ?? "",
      carrier: carrierName,
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [carrierName, open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>
            Depreciation Settings{carrierName ? ` — ${carrierName}` : ""}
          </DialogTitle>
          <DialogDescription>
            Configure depreciation rules for this carrier. These settings will
            apply to payouts and terminology across the report.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-5">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="percent">Depreciation %</Label>
              <Input
                id="percent"
                inputMode="decimal"
                placeholder="e.g. 25"
                {...form.register("percent", {
                  setValueAs: (v) => (v === "" || v == null ? 0 : Number(v)),
                })}
              />
              {form.formState.errors.percent && (
                <p className="text-sm text-red-600">
                  {form.formState.errors.percent.message as string}
                </p>
              )}
            </div>

            <div className="space-y-2 pt-6">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="recoverable"
                  checked={form.watch("recoverable")}
                  onCheckedChange={(c) => form.setValue("recoverable", Boolean(c))}
                />
                <Label htmlFor="recoverable">Recoverable Depreciation</Label>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Holdback Rule</Label>
            <Select
              value={form.watch("holdbackRule")}
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              onValueChange={(v) => form.setValue("holdbackRule", v as any)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select rule" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="after_final_invoice">
                  Release after Final Invoice
                </SelectItem>
                <SelectItem value="after_completion_photos">
                  Release after Completion Photos
                </SelectItem>
                <SelectItem value="after_scope_approval">
                  Release after Scope Approval
                </SelectItem>
                <SelectItem value="other">Other (specify in notes)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <Textarea id="notes" rows={4} placeholder="Any carrier-specific nuances…" {...form.register("notes")} />
          </div>

          <DialogFooter className="gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">Save</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
