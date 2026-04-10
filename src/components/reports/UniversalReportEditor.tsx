/**
 * UNIVERSAL CLAIMS REPORT EDITOR
 * Browser-based WYSIWYG interface for editing all 10 sections before PDF generation
 */

"use client";

import { AlertTriangle, Cloud, Download,FileCheck, FileText, Hammer, Image } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { UniversalClaimsReport } from "@/types/universal-claims-report";

interface ReportEditorProps {
  report: UniversalClaimsReport;
  onSave: (report: UniversalClaimsReport) => Promise<void>;
  onGeneratePDF: () => Promise<void>;
}

export function UniversalReportEditor({
  report: initialReport,
  onSave,
  onGeneratePDF,
}: ReportEditorProps) {
  const [report, setReport] = useState<UniversalClaimsReport>(initialReport);
  const [activeSection, setActiveSection] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [isGeneratingPDF, setIsGeneratingPDF] = useState(false);

  const sections = [
    { id: 1, name: "Cover Page", icon: FileText },
    { id: 2, name: "Executive Summary", icon: FileText },
    { id: 3, name: "Damage Summary", icon: AlertTriangle },
    { id: 4, name: "Photo Documentation", icon: Image },
    { id: 5, name: "Weather Verification", icon: Cloud },
    { id: 6, name: "Code Compliance", icon: FileCheck },
    { id: 7, name: "System Failure Analysis", icon: AlertTriangle },
    { id: 8, name: "Scope of Work", icon: Hammer },
    { id: 9, name: "Professional Opinion", icon: FileText },
    { id: 10, name: "Signatures & Contact", icon: FileCheck },
  ];

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(report);
    } finally {
      setIsSaving(false);
    }
  };

  const handleGeneratePDF = async () => {
    setIsGeneratingPDF(true);
    try {
      await onGeneratePDF();
    } finally {
      setIsGeneratingPDF(false);
    }
  };

  return (
    <div className="flex h-screen bg-neutral-50">
      {/* Sidebar Navigation */}
      <div className="w-64 border-r border-neutral-200 bg-white p-4">
        <h2 className="mb-6 text-lg font-bold">Report Sections</h2>
        <nav className="space-y-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition ${
                  activeSection === section.id
                    ? "bg-blue-50 font-medium text-blue-700"
                    : "text-neutral-700 hover:bg-neutral-50"
                }`}
              >
                <Icon className="h-4 w-4" />
                {section.name}
              </button>
            );
          })}
        </nav>

        <div className="mt-8 space-y-3">
          <Button onClick={handleSave} disabled={isSaving} className="w-full" variant="outline">
            {isSaving ? "Saving..." : "Save Progress"}
          </Button>
          <Button onClick={handleGeneratePDF} disabled={isGeneratingPDF} className="w-full">
            <Download className="mr-2 h-4 w-4" />
            {isGeneratingPDF ? "Generating..." : "Generate PDF"}
          </Button>
        </div>
      </div>

      {/* Main Editor Area */}
      <div className="flex-1 overflow-auto p-8">
        <div className="mx-auto max-w-4xl">
          {activeSection === 1 && <CoverPageEditor report={report} setReport={setReport} />}
          {activeSection === 2 && <ExecutiveSummaryEditor report={report} setReport={setReport} />}
          {activeSection === 3 && <DamageSummaryEditor report={report} setReport={setReport} />}
          {activeSection === 4 && <PhotosEditor report={report} setReport={setReport} />}
          {activeSection === 5 && (
            <WeatherVerificationEditor report={report} setReport={setReport} />
          )}
          {activeSection === 6 && <CodeComplianceEditor report={report} setReport={setReport} />}
          {activeSection === 7 && <SystemFailureEditor report={report} setReport={setReport} />}
          {activeSection === 8 && <ScopeOfWorkEditor report={report} setReport={setReport} />}
          {activeSection === 9 && (
            <ProfessionalOpinionEditor report={report} setReport={setReport} />
          )}
          {activeSection === 10 && <SignaturesEditor report={report} setReport={setReport} />}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SECTION EDITORS
// ============================================================================

function CoverPageEditor({
  report,
  setReport,
}: {
  report: UniversalClaimsReport;
  setReport: (r: UniversalClaimsReport) => void;
}) {
  const { coverPage } = report;

  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Cover Page</h2>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-medium">Client Name</label>
          <Input
            value={coverPage.clientName}
            onChange={(e) =>
              setReport({
                ...report,
                coverPage: { ...coverPage, clientName: e.target.value },
              })
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Property Address</label>
          <Input
            value={coverPage.propertyAddress}
            onChange={(e) =>
              setReport({
                ...report,
                coverPage: { ...coverPage, propertyAddress: e.target.value },
              })
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Claim Number</label>
          <Input
            value={coverPage.claimNumber}
            onChange={(e) =>
              setReport({
                ...report,
                coverPage: { ...coverPage, claimNumber: e.target.value },
              })
            }
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium">Prepared By</label>
          <Input
            value={coverPage.preparedBy}
            onChange={(e) =>
              setReport({
                ...report,
                coverPage: { ...coverPage, preparedBy: e.target.value },
              })
            }
          />
        </div>
      </div>
    </Card>
  );
}

function ExecutiveSummaryEditor({
  report,
  setReport,
}: {
  report: UniversalClaimsReport;
  setReport: (r: UniversalClaimsReport) => void;
}) {
  const { executiveSummary } = report;

  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Executive Summary</h2>
      <div className="space-y-6">
        <div>
          <h3 className="mb-3 text-lg font-semibold">Storm Event</h3>
          <div className="space-y-3">
            <div>
              <label className="mb-2 block text-sm font-medium">Hail Size</label>
              <Input
                value={executiveSummary.stormEvent.hailSize}
                onChange={(e) =>
                  setReport({
                    ...report,
                    executiveSummary: {
                      ...executiveSummary,
                      stormEvent: {
                        ...executiveSummary.stormEvent,
                        hailSize: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
            <div>
              <label className="mb-2 block text-sm font-medium">Wind Speed</label>
              <Input
                value={executiveSummary.stormEvent.windSpeed}
                onChange={(e) =>
                  setReport({
                    ...report,
                    executiveSummary: {
                      ...executiveSummary,
                      stormEvent: {
                        ...executiveSummary.stormEvent,
                        windSpeed: e.target.value,
                      },
                    },
                  })
                }
              />
            </div>
          </div>
        </div>

        <div>
          <h3 className="mb-3 text-lg font-semibold">Conclusion</h3>
          <Textarea
            value={executiveSummary.conclusion}
            onChange={(e) =>
              setReport({
                ...report,
                executiveSummary: {
                  ...executiveSummary,
                  conclusion: e.target.value,
                },
              })
            }
            rows={6}
            className="font-mono text-sm"
          />
        </div>
      </div>
    </Card>
  );
}

// Placeholder editors for other sections (implement similarly)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DamageSummaryEditor({ report }: { report: UniversalClaimsReport; setReport: any }) {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Damage Summary</h2>
      <p className="text-neutral-600">Editor for damage summary section...</p>
    </Card>
  );
}

function PhotosEditor({ report }: { report: UniversalClaimsReport; setReport: any }) {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Photo Documentation</h2>
      <div className="grid grid-cols-3 gap-4">
        {report.damagePhotos.map((photo) => (
          <div key={photo.photoNumber} className="rounded-lg border p-2">
            <img
              src={photo.thumbnailUrl || photo.imageUrl}
              alt={`Photo ${photo.photoNumber}`}
              className="mb-2 h-32 w-full rounded object-cover"
            />
            <p className="text-xs text-neutral-600">Photo {photo.photoNumber}</p>
          </div>
        ))}
      </div>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function WeatherVerificationEditor({ report }: { report: UniversalClaimsReport; setReport: any }) {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Weather Verification</h2>
      <p className="text-neutral-600">Editor for weather verification section...</p>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function CodeComplianceEditor({ report }: { report: UniversalClaimsReport; setReport: any }) {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Code Compliance</h2>
      <p className="text-neutral-600">Editor for code compliance section...</p>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SystemFailureEditor({ report }: { report: UniversalClaimsReport; setReport: any }) {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold">System Failure Analysis</h2>
      <p className="text-neutral-600">Editor for system failure analysis...</p>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ScopeOfWorkEditor({ report }: { report: UniversalClaimsReport; setReport: any }) {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Scope of Work</h2>
      <p className="text-neutral-600">Editor for scope of work section...</p>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function ProfessionalOpinionEditor({ report }: { report: UniversalClaimsReport; setReport: any }) {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Professional Opinion</h2>
      <p className="text-neutral-600">Editor for professional opinion section...</p>
    </Card>
  );
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function SignaturesEditor({ report }: { report: UniversalClaimsReport; setReport: any }) {
  return (
    <Card className="p-6">
      <h2 className="mb-6 text-2xl font-bold">Signatures & Contact</h2>
      <p className="text-neutral-600">Editor for signatures section...</p>
    </Card>
  );
}
