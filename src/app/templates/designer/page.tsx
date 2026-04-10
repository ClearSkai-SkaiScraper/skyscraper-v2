"use client";

import { collection, doc, getDoc, getDocs, setDoc } from "firebase/firestore";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

import { db } from "@/lib/firebase";
import { logger } from "@/lib/logger";

const ALL_SECTIONS = [
  {
    id: "coverPage",
    name: "Cover Page",
    description: "Company branding and contact info",
  },
  {
    id: "overviewPage",
    name: "Overview Page",
    description: "Client details and property info",
  },
  {
    id: "inspectionSummary",
    name: "Inspection Summary",
    description: "AI-generated inspection details",
  },
  {
    id: "damageReport",
    name: "Damage Report",
    description: "Detailed damage findings",
  },
  {
    id: "weatherReport",
    name: "Weather Report",
    description: "DOL verification and weather data",
  },
  {
    id: "codeCompliance",
    name: "Code Compliance",
    description: "Building code requirements",
  },
  {
    id: "recommendations",
    name: "Recommendations",
    description: "Professional recommendations",
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Project timeline and milestones",
  },
  {
    id: "mockupPage",
    name: "Mockup Page",
    description: "AI-generated property mockups",
  },
  {
    id: "agreement",
    name: "Agreement",
    description: "Service agreement and signatures",
  },
  {
    id: "materialSpecs",
    name: "Material Specs",
    description: "Detailed material specifications",
  },
  {
    id: "brochures",
    name: "Brochures",
    description: "Vendor product brochures",
  },
  {
    id: "estimate",
    name: "Estimate",
    description: "Detailed pricing breakdown",
  },
  {
    id: "financeAgreement",
    name: "Finance Agreement",
    description: "Payment and financing options",
  },
  {
    id: "photoGrid",
    name: "Photo Grid",
    description: "Evidence photos with annotations and captions",
  },
] as const;

export default function TemplateDesigner() {
  const uid = (typeof window !== "undefined" && localStorage.getItem("uid")) || "demo-user";
  const [layout, setLayout] = useState<string[]>(["coverPage", "overviewPage"]);
  const [selectedPreset, setSelectedPreset] = useState<string>("custom");
  const [presetLabel, setPresetLabel] = useState<string>("Custom Template");
  const [existingPresets, setExistingPresets] = useState<Array<{ id: string; label: string }>>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void loadExistingPresets();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadPreset(selectedPreset);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPreset]);

  async function loadExistingPresets() {
    try {
      const presetsSnap = await getDocs(collection(db, "users", uid, "layoutPresets"));
      const presets = presetsSnap.docs.map((doc) => ({
        id: doc.id,
        label: doc.data().label || doc.id,
      }));
      setExistingPresets(presets);
    } catch (error) {
      logger.error("Error loading presets:", error);
    }
  }

  async function loadPreset(presetId: string) {
    if (presetId === "custom") return;

    try {
      const snap = await getDoc(doc(db, "users", uid, "layoutPresets", presetId));
      if (snap.exists()) {
        const data = snap.data();
        setLayout(data.sequence || []);
        setPresetLabel(data.label || presetId);
      }
    } catch (error) {
      logger.error("Error loading preset:", error);
    }
  }

  function addSection(sectionId: string) {
    setLayout((prev) => [...prev, sectionId]);
  }

  function removeSection(index: number) {
    setLayout((prev) => prev.filter((_, idx) => idx !== index));
  }

  function moveSection(index: number, direction: -1 | 1) {
    setLayout((prev) => {
      const newLayout = [...prev];
      const newIndex = index + direction;
      if (newIndex < 0 || newIndex >= newLayout.length) return prev;

      const temp = newLayout[index];
      newLayout[index] = newLayout[newIndex];
      newLayout[newIndex] = temp;
      return newLayout;
    });
  }

  async function savePreset() {
    if (!selectedPreset || !presetLabel.trim()) {
      alert("Please enter a preset name");
      return;
    }

    setSaving(true);
    try {
      await setDoc(
        doc(db, "users", uid, "layoutPresets", selectedPreset),
        {
          label: presetLabel.trim(),
          sequence: layout,
          updatedAt: new Date().toISOString(),
        },
        { merge: true }
      );

      alert("Template saved successfully!");
      await loadExistingPresets(); // Refresh the list
    } catch (error) {
      logger.error("Error saving preset:", error);
      alert("Failed to save template");
    } finally {
      setSaving(false);
    }
  }

  function getSectionInfo(sectionId: string) {
    return (
      ALL_SECTIONS.find((s) => s.id === sectionId) || {
        id: sectionId,
        name: sectionId,
        description: "",
      }
    );
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
            <h1 className="mb-4 text-4xl font-bold text-[#081A2F]">Visual Template Designer</h1>
            <p className="mx-auto max-w-3xl text-xl text-neutral-600">
              Create custom PDF templates by dragging and arranging sections
            </p>
          </div>
        </motion.div>

        <div className="grid gap-8 lg:grid-cols-12">
          {/* Available Sections */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="lg:col-span-4"
          >
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Available Sections</h2>
              <div className="max-h-96 space-y-3 overflow-y-auto">
                {ALL_SECTIONS.map((section) => (
                  <motion.button
                    key={section.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => addSection(section.id)}
                    className="w-full rounded-lg border border-neutral-200 p-3 text-left transition-colors hover:border-[#147BFF] hover:bg-blue-50"
                  >
                    <div className="text-sm font-medium text-neutral-900">{section.name}</div>
                    <div className="mt-1 text-xs text-neutral-600">{section.description}</div>
                  </motion.button>
                ))}
              </div>
            </div>
          </motion.div>

          {/* Current Layout */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="lg:col-span-5"
          >
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Current Layout</h2>

              {layout.length === 0 ? (
                <div className="rounded-lg border-2 border-dashed border-neutral-200 py-12 text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-xl bg-neutral-100">
                    <svg
                      className="h-8 w-8 text-neutral-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                      />
                    </svg>
                  </div>
                  <p className="text-neutral-600">Add sections from the left panel</p>
                </div>
              ) : (
                <div className="max-h-96 space-y-3 overflow-y-auto">
                  {layout.map((sectionId, index) => {
                    const section = getSectionInfo(sectionId);
                    return (
                      <motion.div
                        key={`${sectionId}-${index}`}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="flex items-center gap-3 rounded-lg border border-neutral-200 bg-neutral-50 p-3"
                      >
                        <div className="flex-1">
                          <div className="text-sm font-medium text-neutral-900">{section.name}</div>
                          <div className="text-xs text-neutral-600">{section.description}</div>
                        </div>

                        <div className="flex gap-1">
                          <button
                            title="Move section up"
                            onClick={() => moveSection(index, -1)}
                            disabled={index === 0}
                            className="p-1 text-neutral-400 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5 15l7-7 7 7"
                              />
                            </svg>
                          </button>

                          <button
                            title="Move section down"
                            onClick={() => moveSection(index, 1)}
                            disabled={index === layout.length - 1}
                            className="p-1 text-neutral-400 hover:text-neutral-600 disabled:cursor-not-allowed disabled:opacity-30"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M19 9l-7 7-7-7"
                              />
                            </svg>
                          </button>

                          <button
                            title="Remove section"
                            onClick={() => removeSection(index)}
                            className="p-1 text-red-400 hover:text-red-600"
                          >
                            <svg
                              className="h-4 w-4"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                              />
                            </svg>
                          </button>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>
          </motion.div>

          {/* Preset Management */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="lg:col-span-3"
          >
            <div className="rounded-2xl bg-white p-6 shadow-lg">
              <h2 className="mb-4 text-lg font-semibold text-neutral-900">Template Settings</h2>

              <div className="space-y-4">
                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Load Existing Template
                  </label>
                  <select
                    title="Select template preset"
                    value={selectedPreset}
                    onChange={(e) => setSelectedPreset(e.target.value)}
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#147BFF]"
                  >
                    <option value="custom">Create New</option>
                    {existingPresets.map((preset) => (
                      <option key={preset.id} value={preset.id}>
                        {preset.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Template ID
                  </label>
                  <input
                    type="text"
                    value={selectedPreset}
                    onChange={(e) =>
                      setSelectedPreset(e.target.value.replace(/[^a-zA-Z0-9-_]/g, ""))
                    }
                    placeholder="template-id"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#147BFF]"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-neutral-700">
                    Template Name
                  </label>
                  <input
                    type="text"
                    value={presetLabel}
                    onChange={(e) => setPresetLabel(e.target.value)}
                    placeholder="My Custom Template"
                    className="w-full rounded-lg border border-neutral-200 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#147BFF]"
                  />
                </div>

                <button
                  onClick={savePreset}
                  disabled={saving || !selectedPreset || !presetLabel.trim()}
                  className="w-full rounded-lg bg-[#147BFF] px-4 py-3 font-medium text-white transition-colors hover:bg-[#1260D4] disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Save Template"}
                </button>

                <div className="border-t border-neutral-200 pt-4">
                  <p className="text-xs text-neutral-500">Sections: {layout.length}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    Template will be saved as:{" "}
                    <code className="rounded bg-neutral-100 px-1">{selectedPreset}</code>
                  </p>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
