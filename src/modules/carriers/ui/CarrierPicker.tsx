"use client";

// ============================================================================
// CARRIER PICKER - Phase 5 Feature 4: Carrier Presets Dropdown + Depreciation Modal
// ============================================================================

import { useEffect, useState } from "react";

import { audit } from "@/lib/audit";
import { getCarrierById } from "@/lib/carriers";
import { DepreciationModal, type DepreciationValues } from "@/modules/exports/ui/DepreciationModal";

interface CarrierPickerProps {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  onSelect: (preset: any) => void;
  selectedCarrierId?: string;
  orgId: string;
  jobId: string;
  userName?: string;
  initialDepreciation?: DepreciationValues | null;
  onDepreciationChange?: (values: DepreciationValues) => void;
}

export default function CarrierPicker({
  onSelect,
  selectedCarrierId,
  orgId,
  jobId,
  userName,
  initialDepreciation,
  onDepreciationChange,
}: CarrierPickerProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [presets, setPresets] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [depOpen, setDepOpen] = useState(false);
  const [carrierName, setCarrierName] = useState<string | undefined>();

  useEffect(() => {
    fetch("/api/carriers/presets")
      .then((r) => r.json())
      .then((data) => {
        setPresets(data.presets || []);
        setLoading(false);
      })
      .catch((err) => {
        console.error("[CarrierPicker] Load failed:", err);
        setLoading(false);
      });
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const carrierId = e.target.value;
    const preset = presets.find((p) => p.id === carrierId);

    if (preset) {
      onSelect(preset);

      // Get carrier info from static list
      const carrier = getCarrierById(carrierId);
      if (carrier) {
        setCarrierName(carrier.name);

        // Open depreciation modal if carrier has depreciation logic
        if (carrier.terms.hasDep) {
          setDepOpen(true);
        }
      }
    }
  };

  const handleDepreciationSave = (values: DepreciationValues) => {
    // Update parent component
    onDepreciationChange?.(values);

    // Log audit event
    void audit({
      action: "CARRIER_DEPRECIATION_SET",
      orgId,
      jobId,
      userName,
      payload: {
        carrier: values.carrier,
        percent: values.percent,
        recoverable: values.recoverable,
        holdbackRule: values.holdbackRule,
        notes: values.notes,
      },
    });
  };

  if (loading) {
    return <div className="text-sm text-gray-500">Loading carriers...</div>;
  }

  return (
    <>
      <div>
        <label className="mb-2 block text-sm font-medium text-gray-700">
          Insurance Carrier (Optional)
        </label>
        <select
          value={selectedCarrierId || ""}
          onChange={handleChange}
          className="w-full rounded border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">-- Select carrier for custom terminology --</option>
          {presets.map((preset) => (
            <option key={preset.id} value={preset.id}>
              {preset.name}
            </option>
          ))}
        </select>
        <div className="mt-1 text-xs text-gray-500">
          Selecting a carrier will automatically adjust depreciation terminology and email phrasing
          to match their preferences.
        </div>
      </div>

      <DepreciationModal
        open={depOpen}
        onOpenChange={setDepOpen}
        carrierName={carrierName}
        initialValues={initialDepreciation}
        onSave={handleDepreciationSave}
      />
    </>
  );
}
