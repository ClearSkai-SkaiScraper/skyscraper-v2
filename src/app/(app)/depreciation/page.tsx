"use client";

import { useUser } from "@clerk/nextjs";
import { Calculator } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { PageHero } from "@/components/layout/PageHero";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export const dynamic = "force-dynamic";

type Claim = {
  id: string;
  claimNumber: string;
  title: string | null;
  carrier: string | null;
  insured_name?: string | null;
};

export default function DepreciationPage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  // PDF Generation State
  const [claims, setClaims] = useState<Claim[]>([]);
  const [selectedClaimId, setSelectedClaimId] = useState("");
  const [notesToCarrier, setNotesToCarrier] = useState("");
  const [includeBuyerLetter, setIncludeBuyerLetter] = useState(true);
  const [includePhotos, setIncludePhotos] = useState(true);
  const [loading, setLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState("");
  const [error, setError] = useState("");

  // Load claims on mount (must be before any conditional return to avoid hooks violation)
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    fetch("/api/claims")
      .then((res) => res.json())
      .then((data) => {
        if (data.claims) {
          setClaims(data.claims);
        }
      })
      .catch((err) => logger.error("Failed to load claims:", err));
  }, [isLoaded, isSignedIn]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  // Handle PDF generation
  const handleGeneratePackage = async () => {
    if (!selectedClaimId) {
      setError("Please select a claim");
      return;
    }

    setLoading(true);
    setError("");
    setPdfUrl("");

    try {
      const res = await fetch("/api/reports/depreciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claimId: selectedClaimId,
          notesToCarrier,
          includeBuyerLetter,
          includePhotos,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to generate package. Please try again.");
        setLoading(false);
        return;
      }

      setPdfUrl(data.url);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to generate package");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gradient-to-b from-slate-50 via-sky-50/40 to-slate-50 px-4 pb-10 pt-6 md:px-6">
      <div className="mx-auto max-w-6xl">
        <PageHero
          section="claims"
          title="Depreciation Release Package"
          subtitle="Generate release documents — invoice, lien waiver, certificate, and buyer letter — automatically"
          icon={<Calculator className="h-5 w-5" />}
        />
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm transition-shadow hover:shadow-md dark:border-slate-700 dark:bg-slate-800">
          <div className="mx-auto max-w-3xl p-6">
            {/* OLD CALCULATOR TABLE REMOVED - Use PDF generation workflow below */}

            {/* PDF Generation Section */}
            <div className="mt-8 rounded-3xl border border-border bg-card p-6 shadow-lg">
              <h2 className="mb-4 text-xl font-semibold text-foreground">
                Generate Depreciation Package
              </h2>
              <p className="mb-6 text-sm text-muted-foreground">
                Generate professional depreciation release documents—invoice, lien waiver,
                certificate, and optional buyer letter. Package auto-saves to claim Reports tab.
              </p>

              <div className="space-y-4">
                {/* Claim Selector */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Select Claim
                  </label>
                  <select
                    value={selectedClaimId}
                    onChange={(e) => setSelectedClaimId(e.target.value)}
                    aria-label="Select claim for depreciation package"
                    className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    <option value="">Choose a claim...</option>
                    {claims.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.claimNumber} - {c.insured_name} ({c.carrier || "No carrier"})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes */}
                <div>
                  <label className="mb-2 block text-sm font-medium text-foreground">
                    Notes to Carrier <span className="text-muted-foreground">(optional)</span>
                  </label>
                  <textarea
                    value={notesToCarrier}
                    onChange={(e) => setNotesToCarrier(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-4 py-2 text-foreground outline-none ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    rows={3}
                    placeholder="Add any specific notes or instructions for the carrier..."
                  />
                </div>

                {/* Checkboxes */}
                <div className="flex flex-col gap-3 sm:flex-row sm:gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includeBuyerLetter}
                      onChange={(e) => setIncludeBuyerLetter(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="text-sm text-foreground">Include Buyer/Title Letter</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={includePhotos}
                      onChange={(e) => setIncludePhotos(e.target.checked)}
                      className="h-4 w-4 rounded border-input text-primary ring-offset-background focus-visible:ring-2 focus-visible:ring-ring"
                    />
                    <span className="text-sm text-foreground">Include Completion Photos</span>
                  </label>
                </div>

                {/* Error */}
                {error && (
                  <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
                    {error}
                  </div>
                )}

                {/* Generate Button */}
                <div className="flex justify-end">
                  <Button
                    onClick={handleGeneratePackage}
                    disabled={!selectedClaimId || loading}
                    variant="primaryBubble"
                    size="lg"
                    className="px-6"
                  >
                    {loading ? "Generating Package..." : "Generate Depreciation Package"}
                  </Button>
                </div>

                {/* Download Link */}
                {pdfUrl && (
                  <div className="rounded-lg border border-green-500/50 bg-green-500/10 p-4">
                    <p className="mb-2 text-sm font-medium text-green-600 dark:text-green-400">
                      ✅ Package generated successfully!
                    </p>
                    <div className="flex gap-3">
                      <Button asChild size="sm" className="gap-2 bg-green-600 hover:bg-green-700">
                        <a href={pdfUrl} target="_blank" rel="noopener noreferrer">
                          📄 View PDF
                        </a>
                      </Button>
                      <Button
                        asChild
                        variant="outline"
                        size="sm"
                        className="gap-2 border-green-600 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20"
                      >
                        <a href={pdfUrl} download>
                          ⬇️ Download PDF
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
