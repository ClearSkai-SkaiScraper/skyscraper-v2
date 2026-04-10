"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";

export default function CorrelationWizardPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [claimId, setClaimId] = useState("");
  const [loading, setLoading] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [result, setResult] = useState<any>(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  async function generateCorrelation() {
    if (!claimId) {
      alert("Please enter a Claim ID");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/correlate/damage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ claimId }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Correlation failed");
      }

      setResult(data.correlation);
      alert("Forensic correlation analysis complete!");
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  }

  if (result) {
    return (
      <div className="mx-auto max-w-4xl space-y-8 p-10">
        <PageHero title="Forensic Damage Correlation Analysis" subtitle="Analysis results" />

        <section className="rounded bg-white p-6 shadow">
          <h2 className="mb-3 text-xl font-semibold">Summary</h2>
          <p className="text-gray-700">{result.summary}</p>
        </section>

        <CorrelationBlock title="🧊 Hail" data={result.hailCorrelation} />
        <CorrelationBlock title="🌬️ Wind" data={result.windCorrelation} />
        <CorrelationBlock title="🌧️ Rain/Leak" data={result.rainLeakCorrelation} />
        <CorrelationBlock title="❄️ Freeze/Thaw" data={result.freezeThawCorrelation} />

        <section className="rounded border-l-4 border-blue-600 bg-blue-50 p-6 shadow">
          <h2 className="mb-2 text-xl font-semibold">Timeline Match</h2>
          <div className="mb-3 text-3xl font-bold text-blue-700">{result.timelineMatch.score}%</div>
          <p className="text-gray-700">{result.timelineMatch.explanation}</p>
        </section>

        <section className="rounded border-l-4 border-green-600 bg-green-50 p-6 shadow">
          <h2 className="mb-3 text-xl font-semibold">Final Conclusion</h2>
          <p className="text-gray-800">{result.finalCausationConclusion}</p>
        </section>

        <section className="rounded bg-white p-6 shadow">
          <h2 className="mb-3 text-xl font-semibold">Recommendations</h2>
          <ul className="ml-6 list-disc space-y-2">
            {result.recommendations.map((r: string, i: number) => (
              <li key={i} className="text-gray-700">
                {r}
              </li>
            ))}
          </ul>
        </section>

        <div className="flex gap-4">
          <button
            onClick={() => setResult(null)}
            className="rounded bg-gray-600 px-6 py-3 text-white hover:bg-gray-700"
          >
            New Analysis
          </button>
          <Button
            onClick={() => router.push(`/claims/${claimId}`)}
            className="bg-sky-600 hover:bg-sky-700"
          >
            View Claim
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-10">
      <PageHero
        title="Forensic Damage Correlation Engine"
        subtitle="Generate courtroom-level causation analysis linking weather events to property damage"
      />

      <div className="space-y-6 rounded bg-white p-8 shadow">
        <div>
          <label className="mb-2 block font-semibold">Claim ID</label>
          <input
            type="text"
            className="w-full rounded border p-3"
            placeholder="Enter claim ID"
            value={claimId}
            onChange={(e) => setClaimId(e.target.value)}
          />
        </div>

        <div className="rounded border-l-4 border-purple-600 bg-purple-50 p-4">
          <h3 className="mb-2 font-semibold">What This Analysis Provides:</h3>
          <ul className="ml-6 list-disc space-y-1 text-sm text-gray-700">
            <li>Hail causation likelihood & evidence</li>
            <li>Wind causation likelihood & evidence</li>
            <li>Rain/leak correlation analysis</li>
            <li>Freeze/thaw cycle impact assessment</li>
            <li>Timeline proximity scoring</li>
            <li>Forensic conclusion statement</li>
            <li>Actionable recommendations</li>
          </ul>
        </div>

        <button
          onClick={generateCorrelation}
          disabled={loading}
          className="w-full rounded bg-purple-700 px-6 py-4 text-lg font-semibold text-white hover:bg-purple-800 disabled:bg-gray-400"
        >
          {loading ? "Analyzing..." : "🧠 Generate Forensic Correlation"}
        </button>
      </div>

      <div className="rounded bg-gray-100 p-6 text-sm text-gray-600">
        <p className="mb-2 font-semibold">Requirements:</p>
        <ul className="ml-6 list-disc space-y-1">
          <li>Claim must have at least one Weather Intelligence Report</li>
          <li>Claim must have at least one Damage Assessment</li>
          <li>Analysis uses AI to correlate findings with meteorological data</li>
        </ul>
      </div>
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CorrelationBlock({ title, data }: any) {
  const getColorClass = (likelihood: number) => {
    if (likelihood >= 80) return "text-green-600";
    if (likelihood >= 50) return "text-yellow-600";
    return "text-red-600";
  };

  const getBgClass = (likelihood: number) => {
    if (likelihood >= 80) return "bg-green-50 border-green-600";
    if (likelihood >= 50) return "bg-yellow-50 border-yellow-600";
    return "bg-red-50 border-red-600";
  };

  return (
    <section className={`rounded border-l-4 p-6 shadow ${getBgClass(data.likelihood)}`}>
      <h2 className="mb-3 text-xl font-semibold">{title} Causation</h2>
      <div className={`mb-4 text-4xl font-bold ${getColorClass(data.likelihood)}`}>
        {data.likelihood}%
      </div>
      <p className="mb-4 text-gray-700">{data.explanation}</p>
      {data.evidence?.length > 0 && (
        <div>
          <h4 className="mb-2 font-semibold text-gray-800">Evidence:</h4>
          <ul className="ml-6 list-disc space-y-1">
            {data.evidence.map((e: string, i: number) => (
              <li key={i} className="text-gray-600">
                {e}
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
