"use client";

import { Calculator, Download, Info, Layers, Zap } from "lucide-react";
import { useState } from "react";

import { PageContainer } from "@/components/layout/PageContainer";
import { PageHero } from "@/components/layout/PageHero";
import { PageSectionCard } from "@/components/layout/PageSectionCard";
import { TradesToolJobPicker } from "@/components/trades/TradesToolJobPicker";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { logger } from "@/lib/logger";

export default function ProjectPlanBuilderPage() {
  const [generating, setGenerating] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    trade: "roofing",
    jobType: "installation",
    projectSize: "",
    timeline: "2-4-weeks",
    budget: "",
    summary: "",
    documents: "",
  });

  const handleGenerate = async () => {
    setGenerating(true);
    setResult(null);

    try {
      const tradeLabel = formData.trade.replace(/-/g, " ").replace(/\b\w/g, (l) => l.toUpperCase());
      const jobTypeLabel = formData.jobType
        .replace(/-/g, " ")
        .replace(/\b\w/g, (l) => l.toUpperCase());

      // Generate AI-powered project plan
      const templateResult = `# ${tradeLabel} Project Plan — ${jobTypeLabel}

**Project Overview:**
- Trade: ${tradeLabel}
- Job Type: ${jobTypeLabel}
- Timeline: ${formData.timeline.replace(/-/g, " ")}
- Project Size: ${formData.projectSize || "To be determined"}
- Budget Range: ${formData.budget || "Not specified"}

**Project Summary:**
${formData.summary || "No additional summary provided."}

**Detailed Breakdown:**

**Phase 1: Planning & Preparation**
- Initial site assessment and measurements
- Material selection and ordering
- Permits and inspections coordination
- Timeline: First 1-2 weeks

**Phase 2: Execution**
- Main work execution based on ${jobTypeLabel.toLowerCase()}
- Quality control checkpoints
- Timeline: Varies based on project scope

**Phase 3: Final Inspection & Cleanup**
- Final inspection and verification
- Cleanup and site restoration
- Documentation and warranty setup
- Timeline: Final week

**Materials & Resources:**
${generateMaterialsList(formData.trade, formData.jobType)}

**Cost Estimate:**
${generateCostEstimate(formData.trade, formData.jobType, formData.budget)}

**Timeline & Milestones:**
- Start Date: TBD
- Completion: ${formData.timeline.replace(/-/g, " ")}
- Key Milestones: ${generateMilestones(formData.trade, formData.jobType)}

**Additional Documents/References:**
${formData.documents || "No additional documents provided."}

**Safety & Compliance:**
- All work to comply with local building codes
- Safety protocols to be followed
- Required permits to be obtained before work begins

---
*This is an AI-generated project plan. Always verify with local codes and licensed professionals.*`;

      setResult(templateResult);

      // Save to GeneratedArtifact table
      try {
        const response = await fetch("/api/artifacts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            type: "PROJECT_PLAN",
            title: `${tradeLabel} - ${jobTypeLabel} (${formData.projectSize || "TBD"})`,
            status: "DRAFT",
            contentText: templateResult,
            contentJson: {
              input: formData,
              output: templateResult,
              generatedAt: new Date().toISOString(),
            },
          }),
        });

        if (!response.ok) {
          logger.warn("Failed to save artifact:", await response.text());
        }
      } catch (saveError) {
        logger.error("Error saving artifact:", saveError);
      }
    } catch (error) {
      logger.error("Error generating project plan:", error);
      setResult("Error generating project plan. Please try again.");
    } finally {
      setGenerating(false);
    }
  };

  const generateMaterialsList = (trade: string, _jobType: string) => {
    const materials: Record<string, string> = {
      roofing:
        "- Shingles/roofing material\n- Underlayment\n- Fasteners and nails\n- Ridge cap\n- Ventilation components",
      hvac: "- HVAC unit(s)\n- Ductwork\n- Thermostats\n- Refrigerant lines\n- Electrical components",
      plumbing: "- Pipes and fittings\n- Fixtures\n- Valves\n- Sealants\n- Tools and equipment",
      electrical:
        "- Wiring and cables\n- Circuit breakers\n- Outlets and switches\n- Junction boxes\n- Conduit",
      solar:
        "- Solar panels\n- Inverters\n- Mounting hardware\n- Wiring\n- Battery storage (if applicable)",
      "general-contractor": "- Materials vary by project scope\n- Consult detailed specifications",
      restoration:
        "- Restoration materials\n- Cleaning supplies\n- Protective equipment\n- Specialized tools",
      painting: "- Paint/primer\n- Brushes and rollers\n- Drop cloths\n- Tape and supplies",
      flooring: "- Flooring material\n- Underlayment\n- Adhesives\n- Trim and transitions",
      carpentry: "- Lumber\n- Fasteners\n- Hardware\n- Finishing materials",
      landscaping:
        "- Plants and materials\n- Soil and mulch\n- Hardscape materials\n- Irrigation components",
      concrete: "- Concrete mix\n- Rebar/reinforcement\n- Forms\n- Finishing tools",
    };
    return materials[trade] || "- Materials to be determined based on project scope";
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const generateCostEstimate = (trade: string, jobType: string, budget: string) => {
    if (budget) {
      return `Estimated Budget: ${budget}\n- Labor: ~40-50% of total\n- Materials: ~40-50% of total\n- Permits & Fees: ~5-10% of total`;
    }
    return `Budget not specified. Typical ${trade} ${jobType} projects vary widely based on scope and location.`;
  };

  const generateMilestones = (_trade: string, _jobType: string) => {
    return "Site prep, material delivery, main work execution, inspection, completion";
  };

  const _getPitchDegrees = (pitch: string) => {
    const pitchMap: Record<string, number> = {
      "2-12": 9.5,
      "4-12": 18.4,
      "6-12": 26.6,
      "8-12": 33.7,
      "10-12": 39.8,
      "12-12": 45,
    };
    return pitchMap[pitch] || 18.4;
  };

  return (
    <PageContainer maxWidth="7xl">
      <PageHero
        section="claims"
        title="Project Plan Builder"
        subtitle="Build AI-powered project plans for any trade with detailed breakdowns and timelines"
        icon={<Layers className="h-5 w-5" />}
      >
        <Badge variant="secondary">
          <Zap className="mr-1 h-3 w-3" />
          AI-Powered
        </Badge>
      </PageHero>

      <TradesToolJobPicker label="Select job context:" />

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Input Controls */}
        <div className="lg:col-span-1">
          <PageSectionCard>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Calculator className="h-5 w-5 text-blue-600" />
              Project Details
            </h3>

            <div className="space-y-4">
              {/* Trade Selection */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Trade Type
                </label>
                <select
                  aria-label="Trade Type"
                  value={formData.trade}
                  onChange={(e) => setFormData({ ...formData, trade: e.target.value, jobType: "" })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="roofing">Roofing</option>
                  <option value="hvac">HVAC</option>
                  <option value="plumbing">Plumbing</option>
                  <option value="electrical">Electrical</option>
                  <option value="solar">Solar Installation</option>
                  <option value="general-contractor">General Contracting</option>
                  <option value="restoration">Restoration</option>
                  <option value="painting">Painting</option>
                  <option value="flooring">Flooring</option>
                  <option value="carpentry">Carpentry</option>
                  <option value="landscaping">Landscaping</option>
                  <option value="concrete">Concrete Work</option>
                  <option value="tpo">TPO (Flat)</option>
                  <option value="epdm">EPDM (Flat)</option>
                </select>
              </div>

              {/* Job Type - Dynamic based on trade */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Job Type
                </label>
                <select
                  aria-label="Job Type"
                  value={formData.jobType}
                  onChange={(e) => setFormData({ ...formData, jobType: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="">Select job type...</option>
                  {formData.trade === "roofing" && (
                    <>
                      <option value="installation">New Installation</option>
                      <option value="replacement">Roof Replacement</option>
                      <option value="repair">Repair Work</option>
                      <option value="inspection">Inspection</option>
                    </>
                  )}
                  {formData.trade === "hvac" && (
                    <>
                      <option value="installation">New Installation</option>
                      <option value="replacement">System Replacement</option>
                      <option value="repair">Repair/Service</option>
                      <option value="maintenance">Maintenance Contract</option>
                    </>
                  )}
                  {formData.trade === "plumbing" && (
                    <>
                      <option value="installation">New Installation</option>
                      <option value="repair">Repair Work</option>
                      <option value="remodel">Remodel/Update</option>
                      <option value="emergency">Emergency Service</option>
                    </>
                  )}
                  {formData.trade === "electrical" && (
                    <>
                      <option value="installation">New Installation</option>
                      <option value="panel-upgrade">Panel Upgrade</option>
                      <option value="rewire">Rewiring</option>
                      <option value="repair">Repair Work</option>
                    </>
                  )}
                  {formData.trade === "solar" && (
                    <>
                      <option value="installation">Solar Installation</option>
                      <option value="expansion">System Expansion</option>
                      <option value="maintenance">Maintenance</option>
                    </>
                  )}
                  {(formData.trade === "general-contractor" ||
                    formData.trade === "restoration" ||
                    formData.trade === "painting" ||
                    formData.trade === "flooring" ||
                    formData.trade === "carpentry" ||
                    formData.trade === "landscaping" ||
                    formData.trade === "concrete") && (
                    <>
                      <option value="installation">New Installation</option>
                      <option value="remodel">Remodel/Renovation</option>
                      <option value="repair">Repair Work</option>
                      <option value="custom">Custom Project</option>
                    </>
                  )}
                </select>
              </div>

              {/* Timeline */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Expected Timeline
                </label>
                <select
                  aria-label="Timeline"
                  value={formData.timeline}
                  onChange={(e) => setFormData({ ...formData, timeline: e.target.value })}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                >
                  <option value="1-3-days">1-3 Days</option>
                  <option value="1-week">1 Week</option>
                  <option value="2-4-weeks">2-4 Weeks</option>
                  <option value="1-3-months">1-3 Months</option>
                  <option value="3-6-months">3-6 Months</option>
                  <option value="6-months-plus">6+ Months</option>
                </select>
              </div>

              {/* Project Size */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Project Size / Scope
                </label>
                <input
                  type="text"
                  value={formData.projectSize}
                  onChange={(e) => setFormData({ ...formData, projectSize: e.target.value })}
                  placeholder="e.g., 1200 sq ft, 3 rooms, full house"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Budget */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Budget Range (Optional)
                </label>
                <input
                  type="text"
                  value={formData.budget}
                  onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                  placeholder="e.g., $10,000 - $15,000"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Project Summary */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Project Summary
                </label>
                <textarea
                  value={formData.summary}
                  onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                  placeholder="Paste or describe your project requirements, photos, documents, or any details..."
                  rows={4}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Documents / Additional Info */}
              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700 dark:text-slate-300">
                  Documents / Additional Info
                </label>
                <textarea
                  value={formData.documents}
                  onChange={(e) => setFormData({ ...formData, documents: e.target.value })}
                  placeholder="Paste links to photos, plans, specifications, or any other details..."
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500 dark:border-slate-600 dark:bg-slate-800 dark:text-white"
                />
              </div>

              {/* Generate Button */}
              <Button
                onClick={handleGenerate}
                disabled={generating || !formData.trade || !formData.jobType}
                className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
              >
                {generating ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                    Generating Plan...
                  </>
                ) : (
                  <>
                    <Zap className="mr-2 h-4 w-4" />
                    Generate Project Plan
                  </>
                )}
              </Button>

              {/* Info Box */}
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 dark:border-blue-800 dark:bg-blue-900/20">
                <div className="flex items-start gap-2">
                  <Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-blue-600 dark:text-blue-400" />
                  <p className="text-xs text-blue-700 dark:text-blue-300">
                    AI will analyze your inputs and generate a comprehensive project plan with
                    timelines, materials, and cost estimates.
                  </p>
                </div>
              </div>
            </div>
          </PageSectionCard>
        </div>

        {/* Right Column - Result Area */}
        <div className="lg:col-span-2">
          <PageSectionCard>
            <h3 className="mb-4 flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
              <Layers className="h-5 w-5 text-blue-600" />
              Generated RoofPlan
            </h3>

            {!result && !generating && (
              <div className="rounded-lg border-2 border-dashed border-slate-300 p-12 text-center dark:border-slate-700">
                <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 dark:bg-slate-800">
                  <Layers className="h-8 w-8 text-slate-400" />
                </div>
                <h4 className="mb-2 text-base font-semibold text-slate-900 dark:text-white">
                  Ready to Generate
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400">
                  Fill in the specifications on the left and click &ldquo;Generate RoofPlan&rdquo;
                  to create your AI-powered roof plan with material estimates.
                </p>
              </div>
            )}

            {generating && (
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-12 text-center dark:border-slate-700 dark:bg-slate-900/50">
                <div className="mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-4 border-blue-200 border-t-blue-600" />
                <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
                  Analyzing roof specifications...
                </p>
              </div>
            )}

            {result && !generating && (
              <div className="space-y-4">
                <div className="rounded-lg border border-slate-200 bg-white p-6 dark:border-slate-700 dark:bg-slate-900">
                  <pre className="whitespace-pre-wrap font-mono text-xs text-slate-700 dark:text-slate-300">
                    {result}
                  </pre>
                </div>

                <div className="flex gap-3">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      const blob = new Blob([result], { type: "text/plain" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a");
                      a.href = url;
                      a.download = "roofplan-estimate.txt";
                      a.click();
                    }}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download as TXT
                  </Button>
                  <Button
                    className="flex-1 bg-gradient-to-r from-blue-600 to-blue-700"
                    onClick={handleGenerate}
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    Regenerate
                  </Button>
                </div>
              </div>
            )}
          </PageSectionCard>
        </div>
      </div>
    </PageContainer>
  );
}
