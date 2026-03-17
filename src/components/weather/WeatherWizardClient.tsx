"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { logger } from "@/lib/logger";
import { PerilType, WeatherWizardPayload } from "@/lib/weather/types";

import { PerilTypeSelector } from "./PerilTypeSelector";
import { WeatherOptionsGrid } from "./WeatherOptionsGrid";

interface Claim {
  id: string;
  claimNumber: string;
  insured_name: string | null;
  propertyAddress: string | null;
  typeOfLoss: string;
  dateOfLoss: string | null;
  roofType: string | null;
}

interface WeatherWizardClientProps {
  initialClaimId?: string;
}

export function WeatherWizardClient({ initialClaimId }: WeatherWizardClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [claims, setClaims] = useState<Claim[]>([]);
  const [loadingClaims, setLoadingClaims] = useState(true);

  // Form State
  const [claimId, setClaimId] = useState(initialClaimId || "");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [dateOfLoss, setDateOfLoss] = useState("");
  const [peril, setPeril] = useState<PerilType>("HAIL");
  const [autoDetectPeril, setAutoDetectPeril] = useState(false);
  const [options, setOptions] = useState<WeatherWizardPayload["options"]>({
    hail: true,
    wind: true,
    rain: false,
    snow: false,
    radar: true,
    stormEvents: true,
    buildingCodeLoads: false,
    cocorahs: false,
    satellite: false,
    aiSeverityRating: true,
    lossTimeline: true,
  });

  // Load claims on mount
  useEffect(() => {
    async function loadClaims() {
      try {
        const res = await fetch("/api/claims/list-lite");
        const data = await res.json();
        setClaims(data.claims || []);
      } catch (err) {
        logger.error("Failed to load claims:", err);
      } finally {
        setLoadingClaims(false);
      }
    }
    loadClaims();
  }, []);

  // Auto-fill when claim is selected
  useEffect(() => {
    if (claimId) {
      const selectedClaim = claims.find((c) => c.id === claimId);
      if (selectedClaim) {
        if (selectedClaim.propertyAddress) {
          const parts = selectedClaim.propertyAddress.split(",").map((p) => p.trim());
          setAddress(parts[0] || "");
          setCity(parts[1] || "");
          setState(parts[2]?.split(" ")[0] || "");
          setZip(parts[2]?.split(" ")[1] || "");
        }
        if (selectedClaim.dateOfLoss) {
          setDateOfLoss(selectedClaim.dateOfLoss.split("T")[0]);
        }
      }
    }
  }, [claimId, claims]);

  // Auto-detect peril toggle
  useEffect(() => {
    if (autoDetectPeril) {
      setPeril("AUTO_DETECT");
    } else if (peril === "AUTO_DETECT") {
      setPeril("HAIL");
    }
  }, [autoDetectPeril, peril]);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const payload: WeatherWizardPayload = {
        claim_id: claimId,
        address,
        city,
        state,
        zip,
        dateOfLoss,
        peril,
        autoDetectPeril,
        options,
      };

      const res = await fetch("/api/weather/build-smart", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, save: true }),
      });

      if (!res.ok) throw new Error("Failed to generate weather report");

      const data = await res.json();

      // Redirect to report viewer if reportId is returned
      if (data.reportId) {
        router.push(`/weather/${data.reportId}`);
      }
    } catch (err) {
      logger.error("Error generating weather report:", err);
      alert("Failed to generate weather report. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const canProceed = (currentStep: number) => {
    if (currentStep === 1) return claimId && address;
    if (currentStep === 2) return dateOfLoss && peril;
    if (currentStep === 3) return true;
    return false;
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6 py-6">
      {/* Header */}
      <div className="space-y-2 text-center">
        <h1 className="bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-3xl font-bold text-transparent">
          🌩️ Weather Builder
        </h1>
        <p className="text-sm text-gray-600">
          Generate AI-powered weather verification reports for your claims
        </p>
      </div>

      {/* Stepper */}
      <div className="flex items-center justify-center gap-2">
        {[1, 2, 3, 4].map((s) => (
          <div key={s} className="flex items-center">
            <button
              onClick={() => s < step && setStep(s)}
              disabled={s > step}
              className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold transition-all ${
                s < step
                  ? "cursor-pointer bg-green-500 text-white hover:bg-green-600"
                  : s === step
                    ? "bg-gradient-to-r from-purple-600 to-blue-600 text-white"
                    : "cursor-not-allowed bg-gray-200 text-gray-400"
              } `}
            >
              {s < step ? "✓" : s}
            </button>
            {s < 4 && (
              <div className={`mx-1 h-1 w-12 ${s < step ? "bg-green-500" : "bg-gray-200"}`} />
            )}
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div className="space-y-6 rounded-2xl bg-white p-8 shadow-lg">
        {/* Step 1: Claim & Location */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold">Claim & Location</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Claim</label>
              {loadingClaims ? (
                <div className="text-sm text-gray-500">Loading claims...</div>
              ) : (
                <select
                  value={claimId}
                  onChange={(e) => setClaimId(e.target.value)}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                  title="Select Claim"
                >
                  <option value="">Choose a claim...</option>
                  {claims.map((claim) => (
                    <option key={claim.id} value={claim.id}>
                      {claim.claimNumber} - {claim.insured_name || "Unnamed"} -{" "}
                      {claim.propertyAddress || "No address"}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Address</label>
              <input
                type="text"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="123 Main St"
                className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Phoenix"
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">State</label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  placeholder="AZ"
                  maxLength={2}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">ZIP</label>
                <input
                  type="text"
                  value={zip}
                  onChange={(e) => setZip(e.target.value)}
                  placeholder="85001"
                  maxLength={5}
                  className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Loss Details */}
        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Loss Details</h2>

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Date of Loss</label>
              <input
                type="date"
                aria-label="Date of loss"
                value={dateOfLoss}
                onChange={(e) => setDateOfLoss(e.target.value)}
                className="w-full rounded-xl border border-gray-300 px-4 py-2 focus:border-transparent focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 p-3">
              <input
                type="checkbox"
                id="autoDetect"
                aria-label="Auto-detect peril type"
                checked={autoDetectPeril}
                onChange={(e) => setAutoDetectPeril(e.target.checked)}
                className="h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <label htmlFor="autoDetect" className="text-sm text-gray-700">
                Let AI detect peril type from photos and claim data
              </label>
            </div>

            {!autoDetectPeril && (
              <PerilTypeSelector selected={peril} onChange={setPeril} showAutoDetect={false} />
            )}
          </div>
        )}

        {/* Step 3: Weather Options */}
        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">Weather Data Options</h2>
            <p className="text-sm text-gray-600">
              Select which weather data sources and analyses to include in your report
            </p>
            <WeatherOptionsGrid options={options} onChange={setOptions} />
          </div>
        )}

        {/* Step 4: Generate */}
        {step === 4 && (
          <div className="space-y-6 text-center">
            <h2 className="text-xl font-semibold">Ready to Generate</h2>
            <div className="space-y-4 text-sm text-gray-600">
              <div className="flex justify-between border-b py-2">
                <span className="font-medium">Claim:</span>
                <span>{claims.find((c) => c.id === claimId)?.claimNumber || "—"}</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span className="font-medium">Location:</span>
                <span>
                  {address}, {city}, {state} {zip}
                </span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span className="font-medium">Date of Loss:</span>
                <span>{dateOfLoss}</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span className="font-medium">Peril:</span>
                <span>{peril}</span>
              </div>
              <div className="flex justify-between border-b py-2">
                <span className="font-medium">Options Selected:</span>
                <span>
                  {Object.values(options).filter(Boolean).length} of {Object.keys(options).length}
                </span>
              </div>
            </div>
            <button
              onClick={handleGenerate}
              disabled={loading}
              className="rounded-full bg-gradient-indigo px-8 py-3 font-semibold text-white shadow-lg transition-all hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "⚡ Generating..." : "🌩️ Generate Weather Report"}
            </button>
          </div>
        )}
      </div>

      {/* Navigation */}
      <div className="flex justify-between">
        <button
          onClick={() => setStep(Math.max(1, step - 1))}
          disabled={step === 1}
          className="rounded-full border border-gray-300 px-6 py-2 font-medium text-gray-700 hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Previous
        </button>
        {step < 4 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canProceed(step)}
            className="rounded-full bg-gradient-indigo px-6 py-2 font-semibold text-white hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Next →
          </button>
        ) : null}
      </div>
    </div>
  );
}
