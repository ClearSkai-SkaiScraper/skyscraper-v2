"use client";

import { useUser } from "@clerk/nextjs";
import { CheckCircle, Image as ImageIcon, Loader2, Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Wizard, WizardStep } from "@/components/common/Wizard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

export default function NewDamageAssessmentPage() {
  const router = useRouter();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { isLoaded, isSignedIn } = useUser();

  // Step 1: Context
  const [claimId, setClaimId] = useState("");
  const [leadId, setLeadId] = useState("");

  // Step 2: Photos
  const [photos, setPhotos] = useState<Array<{ url: string; id: string; label?: string }>>([]);
  const [uploading, setUploading] = useState(false);

  // Step 3: Supporting data
  const [hoverData, setHoverData] = useState("");
  const [carrierEstimate, setCarrierEstimate] = useState("");
  const [notes, setNotes] = useState("");

  // Step 4: Results
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [assessment, setAssessment] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    setUploading(true);
    try {
      // TODO: Upload to your storage (S3, Firebase, etc.) and get URLs
      // For now, create mock photo objects
      const newPhotos = Array.from(files).map((file, idx) => ({
        id: `photo-${Date.now()}-${idx}`,
        url: URL.createObjectURL(file),
        label: file.name,
      }));

      setPhotos((prev) => [...prev, ...newPhotos]);
    } catch (error) {
      logger.error("Upload error:", error);
    } finally {
      setUploading(false);
    }
  };

  const handleAnalyze = async () => {
    if (photos.length === 0) {
      alert("Please upload at least one photo");
      return;
    }

    setAnalyzing(true);
    try {
      const response = await fetch("/api/damage/build", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          claim_id: claimId || null,
          leadId: leadId || null,
          photos,
          hoverData: hoverData ? JSON.parse(hoverData) : null,
          carrierEstimateText: carrierEstimate || null,
          notesText: notes || null,
        }),
      });

      const data = await response.json();
      if (data.assessment) {
        setAssessment(data);
      } else {
        alert("Analysis failed: " + (data.error || "Unknown error"));
      }
    } catch (error) {
      logger.error("Analysis error:", error);
      alert("Failed to analyze damage");
    } finally {
      setAnalyzing(false);
    }
  };

  const steps: WizardStep[] = [
    {
      id: "context",
      title: "Select Claim / Context",
      description: "Choose the claim or lead this damage assessment belongs to.",
      render: () => (
        <div className="space-y-4">
          <div>
            <Label htmlFor="claim-id">Claim ID (Optional)</Label>
            <Input
              id="claim-id"
              value={claimId}
              onChange={(e) => setClaimId(e.target.value)}
              placeholder="Enter claim ID or leave blank for standalone"
            />
            <p className="mt-1 text-xs text-muted-foreground">
              Search for existing claim or leave blank to create standalone assessment
            </p>
          </div>

          <div>
            <Label htmlFor="lead-id">Lead ID (Optional)</Label>
            <Input
              id="lead-id"
              value={leadId}
              onChange={(e) => setLeadId(e.target.value)}
              placeholder="Enter lead ID if applicable"
            />
          </div>
        </div>
      ),
    },
    {
      id: "photos",
      title: "Upload & Tag Photos",
      description: "Upload roof/exterior photos for AI damage analysis.",
      render: () => (
        <div className="space-y-4">
          <div className="rounded-lg border-2 border-dashed p-8 text-center">
            <ImageIcon className="mx-auto mb-4 h-12 w-12 text-muted-foreground" />
            <Label htmlFor="photo-upload" className="cursor-pointer text-primary hover:underline">
              Click to upload photos
            </Label>
            <Input
              id="photo-upload"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileUpload}
            />
            <p className="mt-2 text-sm text-muted-foreground">
              Upload photos of roof, gutters, siding, windows, and other damage
            </p>
          </div>

          {uploading && (
            <p className="text-center text-sm">
              <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
              Uploading...
            </p>
          )}

          {photos.length > 0 && (
            <div>
              <p className="mb-2 text-sm font-medium">{photos.length} photo(s) uploaded</p>
              <div className="grid grid-cols-4 gap-2">
                {photos.map((photo) => (
                  <div
                    key={photo.id}
                    // eslint-disable-next-line @next/next/no-img-element
                    className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-muted"
                  >
                    <img
                      src={photo.url}
                      alt={photo.label || "Damage photo"}
                      className="h-full w-full object-cover"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "supporting-data",
      title: "Attach Supporting Data",
      description: "Add HOVER data, carrier estimate text, or notes.",
      render: () => (
        <div className="space-y-4">
          <div>
            <Label htmlFor="hover-json">HOVER JSON (Optional)</Label>
            <Textarea
              id="hover-json"
              value={hoverData}
              onChange={(e) => setHoverData(e.target.value)}
              placeholder="Paste HOVER JSON data here..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="carrier-estimate">Carrier Estimate Text (Optional)</Label>
            <Textarea
              id="carrier-estimate"
              value={carrierEstimate}
              onChange={(e) => setCarrierEstimate(e.target.value)}
              placeholder="Paste carrier estimate text for comparison..."
              rows={4}
            />
          </div>

          <div>
            <Label htmlFor="notes">Internal Notes (Optional)</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any internal notes or context..."
              rows={3}
            />
          </div>
        </div>
      ),
    },
    {
      id: "run-ai",
      title: "Run AI Damage Analysis",
      description: "Review summary and findings, then save to the claim.",
      render: () => (
        <div className="space-y-4">
          {!assessment ? (
            <div className="py-12 text-center">
              <Upload className="mx-auto mb-4 h-16 w-16 text-muted-foreground" />
              <h3 className="mb-2 text-lg font-semibold">Ready to Analyze</h3>
              <p className="mb-6 text-sm text-muted-foreground">
                Click the button below to run AI damage analysis on your uploaded photos
              </p>
              <Button onClick={handleAnalyze} disabled={analyzing || photos.length === 0} size="lg">
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Analyzing...
                  </>
                ) : (
                  "Run Damage Builder"
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="mb-4 flex items-center gap-2">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <h3 className="text-lg font-semibold">Analysis Complete</h3>
              </div>

              <Card className="p-4">
                <h4 className="mb-2 font-medium">Summary</h4>
                <p className="mb-4 text-sm text-muted-foreground">
                  {assessment.assessment?.summary || "No summary available"}
                </p>
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Peril:</span>
                    <Badge className="ml-2">{assessment.assessment?.peril}</Badge>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Confidence:</span>
                    <span className="ml-2 font-medium">
                      {((assessment.assessment?.confidence || 0) * 100).toFixed(0)}%
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Findings:</span>
                    <span className="ml-2 font-medium">{assessment.findingsCount || 0}</span>
                  </div>
                </div>
              </Card>

              <p className="text-sm text-muted-foreground">
                Assessment saved successfully. Click &quot;Finish&quot; to return to claims list.
              </p>
            </div>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="mx-auto max-w-4xl py-6">
      <Wizard
        steps={steps}
        onFinishAction={() => {
          router.push(claimId ? `/claims/${claimId}` : "/claims");
        }}
      />
    </div>
  );
}
