"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { logger } from "@/lib/logger";

export default function EditLeadPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { isLoaded, isSignedIn } = useUser();

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(true);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    source: "",
    value: "",
    probability: "",
    stage: "",
    temperature: "",
  });

  // Fetch existing lead data
  useEffect(() => {
    const fetchLead = async () => {
      try {
        const response = await fetch(`/api/leads/${params.id}`);
        if (!response.ok) {
          toast.error("Failed to fetch lead");
          return;
        }

        const data = await response.json();
        const lead = data.lead;

        setFormData({
          title: lead.title || "",
          description: lead.description || "",
          source: lead.source || "",
          value: lead.value ? (lead.value / 100).toString() : "",
          probability: lead.probability ? lead.probability.toString() : "",
          stage: lead.stage || "",
          temperature: lead.temperature || "",
        });
      } catch (error) {
        logger.error("Error fetching lead:", error);
        toast.error("Failed to load lead data");
      } finally {
        setIsFetching(false);
      }
    };

    fetchLead();
  }, [params.id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      const payload = {
        title: formData.title,
        description: formData.description || null,
        source: formData.source || null,
        value: formData.value ? Math.round(parseFloat(formData.value) * 100) : null,
        probability: formData.probability ? parseInt(formData.probability) : null,
        stage: formData.stage || null,
        temperature: formData.temperature || null,
      };

      const response = await fetch(`/api/leads/${params.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const error = await response.json();
        toast.error(error.error || "Failed to update lead");
        setIsLoading(false);
        return;
      }

      toast.success("Lead updated successfully! 🎉");
      const returnTo = searchParams?.get("returnTo");
      if (returnTo === "retail") {
        router.push(`/jobs/retail/${params.id}`);
      } else {
        router.push(`/leads/${params.id}`);
      }
    } catch (error) {
      logger.error("Error updating lead:", error);
      toast.error(error instanceof Error ? error.message : "Failed to update lead");
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  if (isFetching) {
    return (
      <div className="container mx-auto py-6">
        <Card className="mx-auto max-w-2xl">
          <CardContent className="py-10 text-center">
            <p>Loading lead data...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6">
      <Card className="mx-auto max-w-2xl">
        <CardHeader>
          <CardTitle>Edit Lead</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Title */}
            <div>
              <Label htmlFor="title">Lead Title *</Label>
              <Input
                id="title"
                required
                value={formData.title}
                onChange={(e) => handleInputChange("title", e.target.value)}
                placeholder="E.g., Hail Damage Assessment - 4521 Oak Ridge Drive"
              />
            </div>

            {/* Description */}
            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange("description", e.target.value)}
                placeholder="Detailed notes about the lead..."
                rows={4}
              />
            </div>

            {/* Stage and Temperature */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="stage">Stage</Label>
                <Select
                  value={formData.stage}
                  onValueChange={(value) => handleInputChange("stage", value)}
                >
                  <SelectTrigger id="stage">
                    <SelectValue placeholder="Select stage" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="new">New</SelectItem>
                    <SelectItem value="contacted">Contacted</SelectItem>
                    <SelectItem value="qualified">Qualified</SelectItem>
                    <SelectItem value="inspection_scheduled">Inspection Scheduled</SelectItem>
                    <SelectItem value="proposal_sent">Proposal Sent</SelectItem>
                    <SelectItem value="negotiating">Negotiating</SelectItem>
                    <SelectItem value="won">Won</SelectItem>
                    <SelectItem value="lost">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="temperature">Temperature</Label>
                <Select
                  value={formData.temperature}
                  onValueChange={(value) => handleInputChange("temperature", value)}
                >
                  <SelectTrigger id="temperature">
                    <SelectValue placeholder="Select temperature" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cold">Cold</SelectItem>
                    <SelectItem value="warm">Warm</SelectItem>
                    <SelectItem value="hot">Hot</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Source and Value */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <Label htmlFor="source">Source</Label>
                <Input
                  id="source"
                  value={formData.source}
                  onChange={(e) => handleInputChange("source", e.target.value)}
                  placeholder="E.g., website, referral"
                />
              </div>

              <div>
                <Label htmlFor="value">Estimated Value ($)</Label>
                <Input
                  id="value"
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.value}
                  onChange={(e) => handleInputChange("value", e.target.value)}
                  placeholder="18500.00"
                />
              </div>
            </div>

            {/* Probability */}
            <div>
              <Label htmlFor="probability">Win Probability (%)</Label>
              <Input
                id="probability"
                type="number"
                min="0"
                max="100"
                value={formData.probability}
                onChange={(e) => handleInputChange("probability", e.target.value)}
                placeholder="75"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.back()}
                disabled={isLoading}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
