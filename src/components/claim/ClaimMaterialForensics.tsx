"use client";

// components/claim/ClaimMaterialForensics.tsx
// 🧬 MATERIAL FORENSICS UI — Engineering-grade failure analysis display

import { useEffect,useState } from "react";

import { MaterialForensicsOutput } from "@/lib/intel/forensics/materials";
import { logger } from "@/lib/logger";

interface ClaimMaterialForensicsProps {
  claimId: string;
  data?: any; // Pre-loaded forensic data
}

interface FailureLikelihood {
  score: number;
  evidence: string[];
}

export default function ClaimMaterialForensics({ claimId, data: initialData }: ClaimMaterialForensicsProps) {
  const [data, setData] = useState<any>(initialData);
  const [loading, setLoading] = useState(!initialData);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch existing forensic data
  useEffect(() => {
    if (!initialData) {
      void fetchForensicData();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  const fetchForensicData = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/intel/material-forensics?claimId=${claimId}`);
      if (res.ok) {
        const json = await res.json();
        setData(json.data);
      } else if (res.status === 404) {
        // No forensic report exists yet
        setData(null);
      } else {
        throw new Error("Failed to fetch forensic data");
      }
    } catch (err) {
      logger.error("Forensic fetch error:", err);
      setError("Failed to load forensic analysis");
    } finally {
      setLoading(false);
    }
  };

  const generateForensics = async () => {
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/intel/material-forensics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });

      if (!res.ok) {
        throw new Error("Forensic generation failed");
      }

      const json = await res.json();
      setData({
        ...json.data,
        id: json.forensicId,
        metrics: json.metrics,
      });
      alert("✅ Material forensics generated successfully!");
    } catch (err) {
      logger.error("Generation error:", err);
      setError("Failed to generate forensic analysis");
      alert("❌ Forensic generation failed. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <EmptyState 
        onGenerate={generateForensics} 
        generating={generating} 
      />
    );
  }

  const payload = data.payload as MaterialForensicsOutput;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Material Forensic Analysis</h2>
          <p className="mt-1 text-sm text-gray-500">Engineering-grade failure analysis with ASTM/UL citations</p>
        </div>
        <button
          onClick={generateForensics}
          disabled={generating}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {generating ? "⏳ Regenerating..." : "🔄 Regenerate"}
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-red-800">
          {error}
        </div>
      )}

      {/* Material Condition Summary */}
      <Section title="Material Condition Summary">
        <p className="leading-relaxed text-gray-700">{payload.materialConditionSummary}</p>
      </Section>

      {/* Failure Likelihood Scores */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        <ForensicLikelihood title="Hail Failure" data={payload.failureLikelihood.hailFailure} color="blue" />
        <ForensicLikelihood title="Wind Failure" data={payload.failureLikelihood.windFailure} color="purple" />
        <ForensicLikelihood title="Age-Related Failure" data={payload.failureLikelihood.ageFailure} color="yellow" />
        <ForensicLikelihood title="Thermal Failure" data={payload.failureLikelihood.thermalFailure} color="orange" />
        <ForensicLikelihood title="Installation Failure" data={payload.failureLikelihood.installationFailure} color="red" />
      </div>

      {/* Forensic Findings */}
      <ListSection title="Forensic Findings" items={payload.forensicFindings} icon="🔬" />

      {/* Manufacturer Violations */}
      {payload.manufacturerViolations && payload.manufacturerViolations.length > 0 && (
        <ListSection 
          title="Manufacturer Specification Violations" 
          items={payload.manufacturerViolations} 
          icon="⚠️"
          color="red"
        />
      )}

      {/* ASTM Violations */}
      {payload.astmViolations && payload.astmViolations.length > 0 && (
        <ListSection 
          title="Test Standard Failures (ASTM/UL)" 
          items={payload.astmViolations} 
          icon="📋"
          color="orange"
        />
      )}

      {/* Test Standards Cited */}
      {payload.testStandardsCited && payload.testStandardsCited.length > 0 && (
        <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
          <h3 className="mb-2 text-sm font-semibold text-gray-700">📚 Test Standards Cited</h3>
          <div className="flex flex-wrap gap-2">
            {payload.testStandardsCited.map((standard, i) => (
              <span key={i} className="rounded-full border border-gray-300 bg-white px-3 py-1 text-xs font-medium text-gray-700">
                {standard}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Replacement Justification */}
      <Section title="Replacement Justification" icon="✅">
        <p className="whitespace-pre-line leading-relaxed text-gray-700">{payload.replacementJustification}</p>
      </Section>

      {/* Recommended Actions */}
      <ListSection title="Recommended Actions" items={payload.recommendedActions} icon="📌" />

      {/* Engineering Conclusion */}
      <div className="rounded-lg border-2 border-blue-200 bg-blue-50 p-6">
        <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-blue-900">🏗️ Engineering Conclusion</h3>
        <p className="font-medium leading-relaxed text-blue-900">{payload.engineeringConclusion}</p>
      </div>
    </div>
  );
}

// Empty state when no forensic data exists
function EmptyState({ onGenerate, generating }: { onGenerate: () => void; generating: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 px-4 py-12">
      <div className="mb-4 text-6xl">🧬</div>
      <h3 className="mb-2 text-xl font-bold text-gray-900">No Material Forensics Available</h3>
      <p className="mb-6 max-w-md text-center text-gray-600">
        Generate an engineering-grade material failure analysis with ASTM/UL citations, manufacturer spec violations, and replacement justification.
      </p>
      <button
        onClick={onGenerate}
        disabled={generating}
        className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {generating ? "⏳ Generating..." : "🔬 Generate Material Forensics"}
      </button>
    </div>
  );
}

// Section component
function Section({ title, icon, children }: { title: string; icon?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      {children}
    </div>
  );
}

// List section component
function ListSection({ title, items, icon, color }: { title: string; items: string[]; icon?: string; color?: string }) {
  const borderColor = color === "red" ? "border-red-200" : color === "orange" ? "border-orange-200" : "border-gray-200";
  const bgColor = color === "red" ? "bg-red-50" : color === "orange" ? "bg-orange-50" : "bg-white";

  return (
    <div className={`${bgColor} border ${borderColor} rounded-lg p-6`}>
      <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-700">
        {icon && <span>{icon}</span>}
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item, i) => (
          <li key={i} className="flex gap-3">
            <span className="font-medium text-gray-400">{i + 1}.</span>
            <span className="flex-1 text-gray-700">{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

// Forensic likelihood score card
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ForensicLikelihood({ title, data, color }: { title: string; data: FailureLikelihood; color: string }) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-red-700 bg-red-100 border-red-300";
    if (score >= 60) return "text-orange-700 bg-orange-100 border-orange-300";
    if (score >= 40) return "text-yellow-700 bg-yellow-100 border-yellow-300";
    if (score >= 20) return "text-blue-700 bg-blue-100 border-blue-300";
    return "text-gray-700 bg-gray-100 border-gray-300";
  };

  const getProgressColor = (score: number) => {
    if (score >= 80) return "bg-red-600";
    if (score >= 60) return "bg-orange-500";
    if (score >= 40) return "bg-yellow-500";
    if (score >= 20) return "bg-blue-500";
    return "bg-gray-400";
  };

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h4 className="text-sm font-semibold text-gray-700">{title}</h4>
        <span className={`rounded-full border px-3 py-1 text-xs font-bold ${getScoreColor(data.score)}`}>
          {data.score}%
        </span>
      </div>
      
      {/* Progress bar */}
      <div className="mb-3 h-2 w-full overflow-hidden rounded-full bg-gray-200">
        <div
          className={`h-2 rounded-full ${getProgressColor(data.score)} transition-all duration-300`}
          style={{ width: `${Math.min(100, Math.max(0, data.score))}%` }}
        ></div>
      </div>

      {/* Evidence list */}
      {data.evidence && data.evidence.length > 0 && (
        <div className="space-y-1">
          {data.evidence.map((ev, i) => (
            <p key={i} className="text-xs leading-relaxed text-gray-600">
              • {ev}
            </p>
          ))}
        </div>
      )}
    </div>
  );
}
