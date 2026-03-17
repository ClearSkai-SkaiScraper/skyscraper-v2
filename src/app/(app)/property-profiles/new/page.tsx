"use client";

import { useUser } from "@clerk/nextjs";
import { ArrowLeft, Loader2, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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

const US_STATES = [
  "AL",
  "AK",
  "AZ",
  "AR",
  "CA",
  "CO",
  "CT",
  "DE",
  "FL",
  "GA",
  "HI",
  "ID",
  "IL",
  "IN",
  "IA",
  "KS",
  "KY",
  "LA",
  "ME",
  "MD",
  "MA",
  "MI",
  "MN",
  "MS",
  "MO",
  "MT",
  "NE",
  "NV",
  "NH",
  "NJ",
  "NM",
  "NY",
  "NC",
  "ND",
  "OH",
  "OK",
  "OR",
  "PA",
  "RI",
  "SC",
  "SD",
  "TN",
  "TX",
  "UT",
  "VT",
  "VA",
  "WA",
  "WV",
  "WI",
  "WY",
];

const ROOF_TYPES = ["Asphalt Shingle", "Metal", "Tile", "Flat", "Wood Shake", "Slate", "Other"];
const PROPERTY_TYPES = ["Single Family", "Multi Family", "Condo", "Townhouse", "Commercial"];

export default function NewPropertyProfilePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    streetAddress: "",
    city: "",
    state: "",
    zipCode: "",
    county: "",
    squareFootage: "",
    yearBuilt: "",
    propertyType: "",
    roofType: "",
    roofAge: "",
    hvacAge: "",
    waterHeaterAge: "",
    notes: "",
  });

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await fetch("/api/v1/property-profiles", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          streetAddress: formData.streetAddress,
          city: formData.city,
          state: formData.state,
          zipCode: formData.zipCode,
          county: formData.county || undefined,
          squareFootage: formData.squareFootage ? parseInt(formData.squareFootage) : undefined,
          yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
          propertyType: formData.propertyType || undefined,
          roofType: formData.roofType || undefined,
          roofAge: formData.roofAge ? parseInt(formData.roofAge) : undefined,
          hvacAge: formData.hvacAge ? parseInt(formData.hvacAge) : undefined,
          waterHeaterAge: formData.waterHeaterAge ? parseInt(formData.waterHeaterAge) : undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create property profile");
      }

      toast.success("Property profile created successfully");

      router.push(`/property-profiles/${data.property.id}`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to create property");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="container mx-auto max-w-3xl p-6">
      <div className="mb-6">
        <Link href="/property-profiles">
          <Button variant="ghost" size="sm" className="mb-4 gap-2">
            <ArrowLeft className="h-4 w-4" />
            Back to Properties
          </Button>
        </Link>
        <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">Add Property Profile</h1>
        <p className="mt-1 text-muted-foreground">
          Create a comprehensive property intelligence profile
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-6">
          {/* Address Information */}
          <Card>
            <CardHeader>
              <CardTitle>Address Information</CardTitle>
              <CardDescription>Primary property location details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="streetAddress">Street Address *</Label>
                <Input
                  id="streetAddress"
                  placeholder="123 Main St"
                  value={formData.streetAddress}
                  onChange={(e) => handleChange("streetAddress", e.target.value)}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="city">City *</Label>
                  <Input
                    id="city"
                    placeholder="Phoenix"
                    value={formData.city}
                    onChange={(e) => handleChange("city", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="state">State *</Label>
                  <Select value={formData.state} onValueChange={(v) => handleChange("state", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select state" />
                    </SelectTrigger>
                    <SelectContent>
                      {US_STATES.map((state) => (
                        <SelectItem key={state} value={state}>
                          {state}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP Code *</Label>
                  <Input
                    id="zipCode"
                    placeholder="85001"
                    value={formData.zipCode}
                    onChange={(e) => handleChange("zipCode", e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="county">County</Label>
                  <Input
                    id="county"
                    placeholder="Maricopa"
                    value={formData.county}
                    onChange={(e) => handleChange("county", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Property Details */}
          <Card>
            <CardHeader>
              <CardTitle>Property Details</CardTitle>
              <CardDescription>Physical characteristics and specifications</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="squareFootage">Square Footage</Label>
                  <Input
                    id="squareFootage"
                    type="number"
                    placeholder="2500"
                    value={formData.squareFootage}
                    onChange={(e) => handleChange("squareFootage", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="yearBuilt">Year Built</Label>
                  <Input
                    id="yearBuilt"
                    type="number"
                    placeholder="2010"
                    value={formData.yearBuilt}
                    onChange={(e) => handleChange("yearBuilt", e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="propertyType">Property Type</Label>
                  <Select
                    value={formData.propertyType}
                    onValueChange={(v) => handleChange("propertyType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      {PROPERTY_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roofType">Roof Type</Label>
                  <Select
                    value={formData.roofType}
                    onValueChange={(v) => handleChange("roofType", v)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select roof type" />
                    </SelectTrigger>
                    <SelectContent>
                      {ROOF_TYPES.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* System Ages */}
          <Card>
            <CardHeader>
              <CardTitle>System Ages</CardTitle>
              <CardDescription>Age of major home systems (in years)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="roofAge">Roof Age</Label>
                  <Input
                    id="roofAge"
                    type="number"
                    placeholder="10"
                    value={formData.roofAge}
                    onChange={(e) => handleChange("roofAge", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="hvacAge">HVAC Age</Label>
                  <Input
                    id="hvacAge"
                    type="number"
                    placeholder="8"
                    value={formData.hvacAge}
                    onChange={(e) => handleChange("hvacAge", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="waterHeaterAge">Water Heater Age</Label>
                  <Input
                    id="waterHeaterAge"
                    type="number"
                    placeholder="5"
                    value={formData.waterHeaterAge}
                    onChange={(e) => handleChange("waterHeaterAge", e.target.value)}
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle>Additional Notes</CardTitle>
              <CardDescription>Any additional information about the property</CardDescription>
            </CardHeader>
            <CardContent>
              <Textarea
                placeholder="Enter any additional notes..."
                value={formData.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                rows={4}
              />
            </CardContent>
          </Card>

          {/* Submit */}
          <div className="flex justify-end gap-4">
            <Link href="/property-profiles">
              <Button type="button" variant="outline" disabled={loading}>
                Cancel
              </Button>
            </Link>
            <Button type="submit" disabled={loading} className="gap-2">
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Create Property
                </>
              )}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
