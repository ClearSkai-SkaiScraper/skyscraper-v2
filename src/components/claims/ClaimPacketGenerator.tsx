"use client";

import { CheckCircle,Download, FileText, Loader2 } from "lucide-react";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription,CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  APPLICABLE_CODES,
  BLANK_PACKET,
  ClaimPacketData,
  DAMAGE_TYPES,
  EVENT_TYPES,
  MATERIAL_CHOICES,
  PacketVersion,
  REPAIR_ACTIONS,
  RETAIL_DAMAGE_TYPES,
  ROOF_TYPES,
  WARRANTY_OPTIONS,
} from "@/lib/claims/templates";

export default function ClaimPacketGenerator() {
  const [data, setData] = useState<ClaimPacketData>(BLANK_PACKET);
  const [version, setVersion] = useState<PacketVersion>("insurance");
  const [format, setFormat] = useState<"docx" | "pdf">("docx");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = async () => {
    setLoading(true);
    setSuccess(false);
    setError("");

    try {
      const res = await fetch("/api/claims/generate-packet", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          version,
          format,
          includeWeatherPage: version === "insurance" || data.weatherSource.length > 0,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to generate packet");
      }

      // Download file
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `SkaiScraper_${version === "insurance" ? "Claim_Report" : "Property_Packet"}.${format}`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setSuccess(true);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Version Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Select Packet Type</CardTitle>
          <CardDescription>
            Choose between insurance claims or retail property packets
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Button
              variant={version === "insurance" ? "default" : "outline"}
              onClick={() => setVersion("insurance")}
              className="flex-1"
            >
              <FileText className="mr-2 h-4 w-4" />
              Insurance Claims Report
            </Button>
            <Button
              variant={version === "retail" ? "default" : "outline"}
              onClick={() => setVersion("retail")}
              className="flex-1"
            >
              <FileText className="mr-2 h-4 w-4" />
              Retail Property Packet
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cover Sheet Data */}
      <Card>
        <CardHeader>
          <CardTitle>Cover Sheet Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="insured_name">Insured Name *</Label>
              <Input
                id="insured_name"
                value={data.insured_name}
                onChange={(e) => setData({ ...data, insured_name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="propertyAddress">Property Address *</Label>
              <Input
                id="propertyAddress"
                value={data.propertyAddress}
                onChange={(e) => setData({ ...data, propertyAddress: e.target.value })}
              />
            </div>

            {version === "insurance" && (
              <>
                <div>
                  <Label htmlFor="carrier">Carrier</Label>
                  <Input
                    id="carrier"
                    value={data.carrier || ""}
                    onChange={(e) => setData({ ...data, carrier: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="claimNumber">Claim Number</Label>
                  <Input
                    id="claimNumber"
                    value={data.claimNumber || ""}
                    onChange={(e) => setData({ ...data, claimNumber: e.target.value })}
                  />
                </div>
              </>
            )}

            <div>
              <Label htmlFor="dateOfLoss">Date of Loss *</Label>
              <Input
                id="dateOfLoss"
                type="date"
                value={data.dateOfLoss}
                onChange={(e) => setData({ ...data, dateOfLoss: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="inspectionDate">Inspection Date *</Label>
              <Input
                id="inspectionDate"
                type="date"
                value={data.inspectionDate}
                onChange={(e) => setData({ ...data, inspectionDate: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Event/Damage Data */}
      <Card>
        <CardHeader>
          <CardTitle>Event & Damage Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="eventType">Event Type</Label>
              <Select
                aria-label="Event type"
                value={data.eventType}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onValueChange={(value: any) => setData({ ...data, eventType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EVENT_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="roofType">Roof Type</Label>
              <Select
                aria-label="Weather event intensity"
                value={data.roofType}
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                onValueChange={(value: any) => setData({ ...data, roofType: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROOF_TYPES.map((type) => (
                    <SelectItem key={type.value} value={type.value}>
                      {type.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Observed Damage (select all that apply)</Label>
            <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
              {(version === "retail" ? RETAIL_DAMAGE_TYPES : DAMAGE_TYPES).map((damage) => (
                <div key={damage} className="flex items-center space-x-2">
                  <Checkbox
                    id={damage}
                    checked={data.observedDamage.includes(damage)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setData({ ...data, observedDamage: [...data.observedDamage, damage] });
                      } else {
                        setData({
                          ...data,
                          observedDamage: data.observedDamage.filter((d) => d !== damage),
                        });
                      }
                    }}
                  />
                  <label htmlFor={damage} className="cursor-pointer text-sm">
                    {damage}
                  </label>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Retail-Specific Fields */}
      {version === "retail" && (
        <>
          {/* Repair Options Card */}
          <Card>
            <CardHeader>
              <CardTitle>Recommended Repairs & Investment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="recommendedRepairAction">Recommended Action</Label>
                <Select
                  aria-label="Recommended action"
                  value={data.recommendedRepairAction || "full-replacement"}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onValueChange={(value: any) =>
                    setData({ ...data, recommendedRepairAction: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REPAIR_ACTIONS.map((action) => (
                      <SelectItem key={action.value} value={action.value}>
                        {action.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="estimateRangeLow">Estimate Range (Low)</Label>
                  <Input
                    id="estimateRangeLow"
                    type="number"
                    placeholder="0"
                    value={data.estimateRangeLow || ""}
                    onChange={(e) =>
                      setData({ ...data, estimateRangeLow: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="estimateRangeHigh">Estimate Range (High)</Label>
                  <Input
                    id="estimateRangeHigh"
                    type="number"
                    placeholder="0"
                    value={data.estimateRangeHigh || ""}
                    onChange={(e) =>
                      setData({ ...data, estimateRangeHigh: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="financingAvailable"
                    checked={data.financingAvailable || false}
                    onCheckedChange={(checked) =>
                      setData({ ...data, financingAvailable: !!checked })
                    }
                  />
                  <label htmlFor="financingAvailable" className="cursor-pointer text-sm">
                    Financing Available
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="warrantyOption">Warranty Option</Label>
                <Select
                  aria-label="Warranty coverage type"
                  value={data.warrantyOption || "5yr-labor"}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onValueChange={(value: any) => setData({ ...data, warrantyOption: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WARRANTY_OPTIONS.map((warranty) => (
                      <SelectItem key={warranty.value} value={warranty.value}>
                        {warranty.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Timeline Card */}
          <Card>
            <CardHeader>
              <CardTitle>Project Timeline</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <Label htmlFor="timelineInspection">1. Initial Inspection Completed</Label>
                  <Input
                    id="timelineInspection"
                    type="date"
                    value={data.timelineInspectionCompleted || ""}
                    onChange={(e) =>
                      setData({ ...data, timelineInspectionCompleted: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="timelineProposal">2. Proposal & Material Selection</Label>
                  <Input
                    id="timelineProposal"
                    type="date"
                    value={data.timelineProposalMaterialSelection || ""}
                    onChange={(e) =>
                      setData({ ...data, timelineProposalMaterialSelection: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="timelinePermit">3. Scheduling & Permit Pull</Label>
                  <Input
                    id="timelinePermit"
                    type="date"
                    value={data.timelineSchedulingPermit || ""}
                    onChange={(e) => setData({ ...data, timelineSchedulingPermit: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="timelineInstall">4. Tear-Off & Install</Label>
                  <Input
                    id="timelineInstall"
                    type="date"
                    value={data.timelineTearOffInstall || ""}
                    onChange={(e) => setData({ ...data, timelineTearOffInstall: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="timelineWalkthrough">
                    5. Final Walkthrough & Warranty Issued
                  </Label>
                  <Input
                    id="timelineWalkthrough"
                    type="date"
                    value={data.timelineFinalWalkthrough || ""}
                    onChange={(e) => setData({ ...data, timelineFinalWalkthrough: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="typicalDuration">Typical Duration (Days)</Label>
                  <Input
                    id="typicalDuration"
                    type="number"
                    placeholder="0"
                    value={data.typicalDurationDays || ""}
                    onChange={(e) =>
                      setData({ ...data, typicalDurationDays: parseInt(e.target.value) || 0 })
                    }
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Material Options Card */}
          <Card>
            <CardHeader>
              <CardTitle>Roof System & Material Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="materialChoice">Choose Roof Material</Label>
                <Select
                  aria-label="Primary material selection"
                  value={data.materialChoice || "architectural-shingle"}
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onValueChange={(value: any) => setData({ ...data, materialChoice: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MATERIAL_CHOICES.map((material) => (
                      <SelectItem key={material.value} value={material.value}>
                        {material.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Energy Efficiency Options</Label>
                <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-2">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="coolRoof"
                      checked={data.coolRoofRated || false}
                      onCheckedChange={(checked) => setData({ ...data, coolRoofRated: !!checked })}
                    />
                    <label htmlFor="coolRoof" className="cursor-pointer text-sm">
                      Cool Roof Rated System
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="heatReflective"
                      checked={data.heatReflectiveCoating || false}
                      onCheckedChange={(checked) =>
                        setData({ ...data, heatReflectiveCoating: !!checked })
                      }
                    />
                    <label htmlFor="heatReflective" className="cursor-pointer text-sm">
                      Heat Reflective Coating
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="atticVent"
                      checked={data.atticVentilationUpgrade || false}
                      onCheckedChange={(checked) =>
                        setData({ ...data, atticVentilationUpgrade: !!checked })
                      }
                    />
                    <label htmlFor="atticVent" className="cursor-pointer text-sm">
                      Attic Ventilation Upgrade
                    </label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="radiantBarrier"
                      checked={data.radiantBarrierAddOn || false}
                      onCheckedChange={(checked) =>
                        setData({ ...data, radiantBarrierAddOn: !!checked })
                      }
                    />
                    <label htmlFor="radiantBarrier" className="cursor-pointer text-sm">
                      Radiant Barrier Add-On
                    </label>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Warranty & Support Card */}
          <Card>
            <CardHeader>
              <CardTitle>Warranty & Support</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="serviceHotline">Service Hotline</Label>
                  <Input
                    id="serviceHotline"
                    placeholder="(555) 123-4567"
                    value={data.serviceHotline || ""}
                    onChange={(e) => setData({ ...data, serviceHotline: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="warrantyEmail">Warranty Email</Label>
                  <Input
                    id="warrantyEmail"
                    type="email"
                    placeholder="warranty@company.com"
                    value={data.warrantyEmail || ""}
                    onChange={(e) => setData({ ...data, warrantyEmail: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Signature Card */}
          <Card>
            <CardHeader>
              <CardTitle>Client Authorization</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="clientName">Client Name</Label>
                  <Input
                    id="clientName"
                    placeholder="Full Name"
                    value={data.clientName || ""}
                    onChange={(e) => setData({ ...data, clientName: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="clientSignatureDate">Signature Date</Label>
                  <Input
                    id="clientSignatureDate"
                    type="date"
                    value={data.clientSignatureDate || ""}
                    onChange={(e) => setData({ ...data, clientSignatureDate: e.target.value })}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {/* Generate Button */}
      <Card>
        <CardHeader>
          <CardTitle>Generate Packet</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <Label>Format</Label>
              <Select aria-label="Export format" value={format} onValueChange={(value: "docx" | "pdf") => setFormat(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="docx">DOCX (Editable)</SelectItem>
                  <SelectItem value="pdf">PDF (Locked)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button onClick={handleGenerate} disabled={loading} className="w-full" size="lg">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                Generating...
              </>
            ) : (
              <>
                <Download className="mr-2 h-5 w-5" />
                Generate & Download Packet
              </>
            )}
          </Button>

          {success && (
            <Alert className="border-green-500 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Packet generated successfully! Check your downloads folder.
              </AlertDescription>
            </Alert>
          )}

          {error && (
            <Alert variant="destructive">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
