"use client";

import { AlertCircle, CheckCircle2, Circle, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

interface CompletionStatusPanelProps {
  claimId: string;
}

export function CompletionStatusPanel({ claimId }: CompletionStatusPanelProps) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [status, setStatus] = useState<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [documents, setDocuments] = useState<any[]>([]);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [photos, setPhotos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);

  useEffect(() => {
    void fetchData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [claimId]);

  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, docsRes, photosRes] = await Promise.all([
        fetch(`/api/completion/update?claimId=${claimId}`),
        fetch(`/api/completion/upload-doc?claimId=${claimId}`),
        fetch(`/api/completion/upload-photo?claimId=${claimId}`),
      ]);

      if (statusRes.ok) setStatus(await statusRes.json());
      if (docsRes.ok) setDocuments(await docsRes.json());
      if (photosRes.ok) setPhotos(await photosRes.json());
    } catch (error) {
      logger.error("Failed to fetch data:", error);
    } finally {
      setLoading(false);
    }
  };

  const startDepreciationWorkflow = async () => {
    try {
      setAnalyzing(true);
      toast.info("🔥 Starting AI Timeline Builder & Supplement Detection...");

      // This will trigger Phase 13.2 and 13.3 in future implementation
      // For now, we just show a placeholder
      await new Promise((resolve) => setTimeout(resolve, 2000));

      toast.success("✅ Depreciation workflow initiated! Check back soon for results.");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error: any) {
      toast.error(`Failed to start workflow: ${error.message}`);
    } finally {
      setAnalyzing(false);
    }
  };

  if (loading) {
    return (
      <div className="rounded-xl border bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
        </div>
      </div>
    );
  }

  const allComplete = status?.isComplete;

  return (
    <div className="rounded-xl border bg-white p-6 shadow-sm">
      <h3 className="mb-4 text-lg font-semibold">📊 Completion Status</h3>

      {/* Status Grid */}
      <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-lg bg-gray-50 p-4">
          <div className="mb-1 flex items-center gap-2">
            {status?.completionFormUploaded ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-sm font-medium">Completion Form</span>
          </div>
          <p className="text-xs text-gray-500">{documents.length} documents uploaded</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <div className="mb-1 flex items-center gap-2">
            {status?.completionPhotosUploaded ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-sm font-medium">Completion Photos</span>
          </div>
          <p className="text-xs text-gray-500">{photos.length} photos uploaded</p>
        </div>

        <div className="rounded-lg bg-gray-50 p-4">
          <div className="mb-1 flex items-center gap-2">
            {status?.walkthroughPassed ? (
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            ) : (
              <Circle className="h-5 w-5 text-gray-400" />
            )}
            <span className="text-sm font-medium">Final Walkthrough</span>
          </div>
          <p className="text-xs text-gray-500">
            {status?.walkthroughPassed ? "Passed" : "Not completed"}
          </p>
        </div>
      </div>

      {/* Action Section */}
      {allComplete ? (
        <div className="rounded-lg border border-green-200 bg-green-50 p-6">
          <div className="flex items-start gap-4">
            <CheckCircle2 className="mt-1 h-6 w-6 flex-shrink-0 text-green-600" />
            <div className="flex-1">
              <h4 className="mb-2 font-semibold text-green-900">
                🎉 BUILD COMPLETE - Ready for Depreciation Processing
              </h4>
              <p className="mb-4 text-sm text-green-800">
                All requirements met. You can now generate the AI-powered timeline, detect
                supplements, and build the final depreciation packet.
              </p>
              <Button
                onClick={startDepreciationWorkflow}
                disabled={analyzing}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {analyzing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  "🔥 Generate Build Timeline & Analyze Supplements"
                )}
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-6">
          <div className="flex items-start gap-4">
            <AlertCircle className="mt-1 h-6 w-6 flex-shrink-0 text-yellow-600" />
            <div>
              <h4 className="mb-2 font-semibold text-yellow-900">
                Completion Requirements Not Met
              </h4>
              <p className="text-sm text-yellow-800">
                Please complete all checklist items above to unlock depreciation processing.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Notes Section */}
      {status?.notes && (
        <div className="mt-4 rounded-lg border border-blue-200 bg-blue-50 p-4">
          <p className="mb-1 text-sm font-medium text-blue-900">Completion Notes:</p>
          <p className="text-sm text-blue-800">{status.notes}</p>
        </div>
      )}
    </div>
  );
}
