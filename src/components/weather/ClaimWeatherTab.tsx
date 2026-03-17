"use client";

import { Calendar, Cloud, FileText } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FullWeatherReport } from "@/components/weather/FullWeatherReport";
import { QuickDOLFinder } from "@/components/weather/QuickDOLFinder";
import { SavedReportsList } from "@/components/weather/SavedReportsList";
import { logger } from "@/lib/logger";

interface ClaimWeatherTabProps {
  claimId: string;
  propertyAddress?: string;
  currentDol?: string;
}

export function ClaimWeatherTab({ claimId, propertyAddress, currentDol }: ClaimWeatherTabProps) {
  const [selectedDol, setSelectedDol] = useState<string | null>(currentDol || null);
  const [activeTab, setActiveTab] = useState("quick-dol");
  const router = useRouter();

  const handleSelectDate = async (date: string, candidate: any) => {
    try {
      // Update the claim's DOL
      const response = await fetch(`/api/claims/${claimId}/dol`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateOfLoss: date,
          source: "weather_report",
          metadata: {
            candidate,
          },
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to update date of loss");
      }

      setSelectedDol(date);
      toast.success("Date of Loss Updated", {
        description: `Claim DOL set to ${new Date(date).toLocaleDateString()}`,
      });

      // Switch to full report tab
      setActiveTab("full-report");
      
      // Refresh the page to show updated DOL
      router.refresh();
    } catch (error) {
      logger.error("Error updating DOL:", error);
      toast.error("Error", {
        description: "Failed to update date of loss. Please try again.",
      });
    }
  };

  const handleReportGenerated = (reportId: string) => {
    toast.success("Report Generated", {
        description: "Weather analysis report has been saved",
      });
    
    // Switch to saved reports tab
    setActiveTab("saved-reports");
  };

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Cloud className="h-4 w-4" />
          <p>
            Use AI-powered weather analysis to identify the date of loss and generate comprehensive
            weather reports for adjusters and contractors.
          </p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="quick-dol" className="flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            Quick DOL
          </TabsTrigger>
          <TabsTrigger value="full-report" className="flex items-center gap-2">
            <Cloud className="h-4 w-4" />
            Full Report
          </TabsTrigger>
          <TabsTrigger value="saved-reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Saved Reports
          </TabsTrigger>
        </TabsList>

        <TabsContent value="quick-dol" className="space-y-4">
          <QuickDOLFinder
            claimId={claimId}
            initialAddress={propertyAddress}
            onSelectDate={handleSelectDate}
          />
        </TabsContent>

        <TabsContent value="full-report" className="space-y-4">
          <FullWeatherReport
            claimId={claimId}
            initialDol={selectedDol || currentDol}
            onReportGenerated={handleReportGenerated}
          />
        </TabsContent>

        <TabsContent value="saved-reports" className="space-y-4">
          <SavedReportsList claimId={claimId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
