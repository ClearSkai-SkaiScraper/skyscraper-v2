"use client";

import { httpsCallable } from "firebase/functions";
import { motion } from "framer-motion";
import { useState } from "react";

import { generateDamageCounts, saveEvidencePair } from "@/lib/evidence";
import { functions } from "@/lib/firebase";
import { logger } from "@/lib/logger";

interface DamageDetection {
  type: string;
  confidence: number;
  coordinates: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  description: string;
  severity: "low" | "medium" | "high";
}

interface AnnotationData {
  image_url: string;
  detections: DamageDetection[];
  summary: {
    total_damage_count: number;
    severity_breakdown: Record<string, number>;
    most_common_damage: string;
    estimated_repair_cost: string;
  };
  annotated_image_url: string;
  timestamp: string;
}

export default function AnnotationViewer() {
  const uid = (typeof window !== "undefined" && localStorage.getItem("uid")) || "demo-user";
  const projectId =
    (typeof window !== "undefined" && localStorage.getItem("projectId")) || "default-project";
  const [imageUrl, setImageUrl] = useState("");
  const [analyzing, setAnalyzing] = useState(false);
  const [annotationData, setAnnotationData] = useState<AnnotationData | null>(null);
  const [selectedDetection, setSelectedDetection] = useState<DamageDetection | null>(null);
  const [showOriginal, setShowOriginal] = useState(false);
  const [useOpenAI, setUseOpenAI] = useState(true);

  async function analyzeImage() {
    if (!imageUrl.trim()) {
      alert("Please enter an image URL");
      return;
    }

    setAnalyzing(true);
    try {
      // Use OpenAI detection by default, fall back to original function
      const functionName = useOpenAI ? "annotateWithOpenAI" : "annotateDamage";
      const detectFunction = httpsCallable(functions, functionName);
      const result = await detectFunction({
        userId: uid,
        imageUrl: imageUrl.trim(),
        useOpenAI: useOpenAI,
      });

      if (result.data) {
        const data = result.data as AnnotationData;
        setAnnotationData(data);

        // Save evidence pair to project
        try {
          const counts = generateDamageCounts(data.detections);
          await saveEvidencePair(
            uid,
            projectId,
            data.image_url,
            data.annotated_image_url,
            counts,
            (data as any).detection_method || "ai_detection"
          );
          logger.info("Evidence saved to project");
        } catch (saveError) {
          logger.warn("Failed to save evidence:", saveError);
          // Don't block the UI for save errors
        }
      }
    } catch (error) {
      logger.error("Error analyzing image:", error);
      alert("Failed to analyze image. Please try again.");
    } finally {
      setAnalyzing(false);
    }
  }

  function handleDetectionClick(detection: DamageDetection) {
    setSelectedDetection(detection);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-neutral-50 to-neutral-100 px-6 py-12">
      <div className="mx-auto max-w-7xl">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="mb-8"
        >
          <div className="mb-8 text-center">
            <h1 className="mb-4 text-4xl font-bold text-[#081A2F]">AI Damage Annotation</h1>
            <p className="mx-auto max-w-3xl text-xl text-neutral-600">
              Upload property images to automatically detect and annotate damage
            </p>
          </div>
        </motion.div>

        {/* Image Input */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8 rounded-2xl bg-white p-6 shadow-lg"
        >
          <h2 className="mb-4 text-lg font-semibold text-neutral-900">Image Analysis</h2>

          {/* Detection Method Toggle */}
          <div className="mb-4">
            <label className="inline-flex items-center gap-3">
              <input
                type="checkbox"
                checked={useOpenAI}
                onChange={(e) => setUseOpenAI(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-[#147BFF] focus:ring-[#147BFF]"
              />
              <div>
                <span className="text-sm font-medium text-neutral-900">
                  Use OpenAI Vision Detection
                </span>
                <p className="text-xs text-neutral-600">
                  Advanced AI detection using OpenAI&apos;s vision model for more accurate results
                </p>
              </div>
            </label>
          </div>

          <div className="flex gap-4">
            <input
              type="url"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              placeholder="Enter image URL (e.g., https://example.com/roof-image.jpg)"
              className="flex-1 rounded-lg border border-neutral-200 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-[#147BFF]"
            />
            <button
              onClick={analyzeImage}
              disabled={analyzing || !imageUrl.trim()}
              className="rounded-lg bg-[#147BFF] px-6 py-3 font-medium text-white transition-colors hover:bg-[#1260D4] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {analyzing ? "Analyzing..." : "Analyze Damage"}
            </button>
          </div>
        </motion.div>

        {annotationData && (
          <div className="grid gap-8 lg:grid-cols-12">
            {/* Image Viewer */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-8"
            >
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-neutral-900">
                    {showOriginal ? "Original Image" : "Annotated Image"}
                  </h2>
                  <button
                    onClick={() => setShowOriginal(!showOriginal)}
                    className="rounded-lg border border-neutral-200 px-4 py-2 text-sm transition-colors hover:bg-neutral-50"
                  >
                    {showOriginal ? "Show Annotations" : "Show Original"}
                  </button>
                </div>

                <div className="relative">
                  <img
                    src={
                      showOriginal ? annotationData.image_url : annotationData.annotated_image_url
                    }
                    alt={
                      showOriginal
                        ? "Original property image"
                        : "Annotated property image with damage detection"
                    }
                    className="h-auto w-full rounded-lg shadow-md"
                  />

                  {/* Interactive Detection Overlays (only on annotated view) */}
                  {!showOriginal && (
                    <div className="absolute inset-0">
                      {annotationData.detections.map((detection, index) => {
                        // Use transform approach to avoid inline styles
                        const leftClass = `left-[${detection.coordinates.x}%]`;
                        const topClass = `top-[${detection.coordinates.y}%]`;
                        const widthClass = `w-[${detection.coordinates.width}%]`;
                        const heightClass = `h-[${detection.coordinates.height}%]`;

                        return (
                          <button
                            key={index}
                            onClick={() => handleDetectionClick(detection)}
                            className={`absolute border-2 border-red-500 bg-red-500/20 transition-colors hover:bg-red-500/30 ${leftClass} ${topClass} ${widthClass} ${heightClass}`}
                            title={`${detection.type} (${Math.round(
                              detection.confidence * 100
                            )}% confidence)`}
                          >
                            <span className="sr-only">
                              {detection.type} damage detected with{" "}
                              {Math.round(detection.confidence * 100)}% confidence
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </motion.div>

            {/* Analysis Results */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.4 }}
              className="space-y-6 lg:col-span-4"
            >
              {/* Summary Card */}
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">Damage Summary</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Total Damage Items:</span>
                    <span className="font-semibold text-neutral-900">
                      {annotationData.summary.total_damage_count}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Most Common:</span>
                    <span className="font-semibold text-neutral-900">
                      {annotationData.summary.most_common_damage}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-neutral-600">Estimated Cost:</span>
                    <span className="font-semibold text-green-600">
                      {annotationData.summary.estimated_repair_cost}
                    </span>
                  </div>
                </div>

                {/* Severity Breakdown */}
                <div className="mt-6">
                  <h4 className="mb-3 text-sm font-medium text-neutral-700">Severity Breakdown</h4>
                  <div className="space-y-2">
                    {Object.entries(annotationData.summary.severity_breakdown).map(
                      ([severity, count]) => (
                        <div key={severity} className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div
                              className={`h-3 w-3 rounded-full ${
                                severity === "high"
                                  ? "bg-red-500"
                                  : severity === "medium"
                                    ? "bg-yellow-500"
                                    : "bg-green-500"
                              }`}
                            ></div>
                            <span className="text-sm capitalize text-neutral-600">{severity}</span>
                          </div>
                          <span className="text-sm font-medium text-neutral-900">{count}</span>
                        </div>
                      )
                    )}
                  </div>
                </div>
              </div>

              {/* Detections List */}
              <div className="rounded-2xl bg-white p-6 shadow-lg">
                <h3 className="mb-4 text-lg font-semibold text-neutral-900">
                  Detected Issues ({annotationData.detections.length})
                </h3>
                <div className="max-h-96 space-y-3 overflow-y-auto">
                  {annotationData.detections.map((detection, index) => (
                    <motion.button
                      key={index}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleDetectionClick(detection)}
                      className={`w-full rounded-lg border p-3 text-left transition-colors ${
                        selectedDetection === detection
                          ? "border-[#147BFF] bg-blue-50"
                          : "border-neutral-200 hover:border-neutral-300"
                      }`}
                    >
                      <div className="mb-2 flex items-start justify-between">
                        <span className="text-sm font-medium capitalize text-neutral-900">
                          {detection.type.replace("_", " ")}
                        </span>
                        <div className="flex items-center gap-2">
                          <div
                            className={`h-2 w-2 rounded-full ${
                              detection.severity === "high"
                                ? "bg-red-500"
                                : detection.severity === "medium"
                                  ? "bg-yellow-500"
                                  : "bg-green-500"
                            }`}
                          ></div>
                          <span className="text-xs text-neutral-500">
                            {Math.round(detection.confidence * 100)}%
                          </span>
                        </div>
                      </div>
                      <p className="mb-2 text-xs text-neutral-600">{detection.description}</p>
                      <div className="text-xs text-neutral-500">
                        Position: {Math.round(detection.coordinates.x)}%,{" "}
                        {Math.round(detection.coordinates.y)}%
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Selected Detection Details */}
              {selectedDetection && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="rounded-2xl bg-white p-6 shadow-lg"
                >
                  <h3 className="mb-4 text-lg font-semibold text-neutral-900">Detection Details</h3>
                  <div className="space-y-3">
                    <div>
                      <span className="text-sm font-medium text-neutral-700">Type:</span>
                      <p className="capitalize text-neutral-900">
                        {selectedDetection.type.replace("_", " ")}
                      </p>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-neutral-700">Description:</span>
                      <p className="text-neutral-900">{selectedDetection.description}</p>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-neutral-700">Confidence:</span>
                      <p className="text-neutral-900">
                        {Math.round(selectedDetection.confidence * 100)}%
                      </p>
                    </div>

                    <div>
                      <span className="text-sm font-medium text-neutral-700">Severity:</span>
                      <div className="mt-1 flex items-center gap-2">
                        <div
                          className={`h-3 w-3 rounded-full ${
                            selectedDetection.severity === "high"
                              ? "bg-red-500"
                              : selectedDetection.severity === "medium"
                                ? "bg-yellow-500"
                                : "bg-green-500"
                          }`}
                        ></div>
                        <span className="capitalize text-neutral-900">
                          {selectedDetection.severity}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}
            </motion.div>
          </div>
        )}

        {/* Getting Started */}
        {!annotationData && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl bg-white p-8 text-center shadow-lg"
          >
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-2xl bg-blue-100">
              <svg
                className="h-10 w-10 text-[#147BFF]"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <h3 className="mb-3 text-xl font-semibold text-neutral-900">
              AI-Powered Damage Detection
            </h3>
            <p className="mx-auto mb-6 max-w-md text-neutral-600">
              Our advanced AI analyzes property images to automatically detect and classify damage,
              providing detailed annotations and cost estimates.
            </p>
            <div className="mx-auto grid max-w-2xl gap-4 text-sm md:grid-cols-3">
              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-green-100">
                  <svg
                    className="h-6 w-6 text-green-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                    />
                  </svg>
                </div>
                <p className="font-medium text-neutral-900">Detect Damage</p>
                <p className="text-neutral-600">Automatically identify damage types</p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-blue-100">
                  <svg
                    className="h-6 w-6 text-blue-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                    />
                  </svg>
                </div>
                <p className="font-medium text-neutral-900">Annotate Images</p>
                <p className="text-neutral-600">Mark damage locations with details</p>
              </div>

              <div className="text-center">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-purple-100">
                  <svg
                    className="h-6 w-6 text-purple-600"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                    />
                  </svg>
                </div>
                <p className="font-medium text-neutral-900">Generate Reports</p>
                <p className="text-neutral-600">Create detailed damage reports</p>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
}
