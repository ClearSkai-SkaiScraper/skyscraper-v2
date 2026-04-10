"use client";

import { Plus, X } from "lucide-react";
import React from "react";

import { Button } from "@/components/ui/button";
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
import { ClaimPacketData } from "@/lib/claims/templates";
import { cn } from "@/lib/utils";

interface Step4Props {
  data: ClaimPacketData;
  updateData: (updates: Partial<ClaimPacketData>) => void;
  validationErrors?: string[];
}

/**
 * Step 4: Why Choose Us (NEW)
 *
 * All fields are OPTIONAL
 *
 * Fields:
 * - companyBio (textarea - company description)
 * - yearEstablished (number)
 * - licenseNumbers (array of license strings)
 * - certifications (array of certification strings)
 * - bbbRating (select - A+, A, B, etc.)
 * - testimonials (array of {text, author})
 * - awards (array of award strings)
 */
export function Step4_WhyUs({ data, updateData }: Step4Props) {
  // Add license
  const addLicense = () => {
    const currentLicenses = data.licenseNumbers || [];
    updateData({ licenseNumbers: [...currentLicenses, ""] });
  };

  // Update license at index
  const updateLicense = (index: number, value: string) => {
    const currentLicenses = [...(data.licenseNumbers || [])];
    currentLicenses[index] = value;
    updateData({ licenseNumbers: currentLicenses });
  };

  // Remove license at index
  const removeLicense = (index: number) => {
    const currentLicenses = [...(data.licenseNumbers || [])];
    currentLicenses.splice(index, 1);
    updateData({ licenseNumbers: currentLicenses });
  };

  // Add certification
  const addCertification = () => {
    const currentCerts = data.certifications || [];
    updateData({ certifications: [...currentCerts, ""] });
  };

  // Update certification at index
  const updateCertification = (index: number, value: string) => {
    const currentCerts = [...(data.certifications || [])];
    currentCerts[index] = value;
    updateData({ certifications: currentCerts });
  };

  // Remove certification at index
  const removeCertification = (index: number) => {
    const currentCerts = [...(data.certifications || [])];
    currentCerts.splice(index, 1);
    updateData({ certifications: currentCerts });
  };

  // Add testimonial
  const addTestimonial = () => {
    const currentTestimonials = data.customerTestimonials || [];
    updateData({
      customerTestimonials: [
        ...currentTestimonials,
        { name: "", location: "", quote: "", rating: 5 },
      ],
    });
  };

  // Update testimonial at index
  const updateTestimonial = (
    index: number,
    field: "name" | "location" | "quote" | "rating",
    value: string | number
  ) => {
    const currentTestimonials = [...(data.customerTestimonials || [])];
    currentTestimonials[index] = {
      ...currentTestimonials[index],
      [field]: value,
    };
    updateData({ customerTestimonials: currentTestimonials });
  };

  // Remove testimonial at index
  const removeTestimonial = (index: number) => {
    const currentTestimonials = [...(data.customerTestimonials || [])];
    currentTestimonials.splice(index, 1);
    updateData({ customerTestimonials: currentTestimonials });
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Why Choose Us?</h2>
        <p className="mt-2 text-sm text-gray-600">
          Showcase your company&apos;s strengths, credentials, and customer satisfaction. This section
          builds trust and differentiates you from competitors.
        </p>
      </div>

      {/* Company Overview */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">Company Overview</h3>

        {/* Company Bio */}
        <div className="space-y-2">
          <Label htmlFor="companyBio" className="text-sm font-medium">
            Company Bio
          </Label>
          <Textarea
            id="companyBio"
            placeholder="Tell homeowners about your company's history, mission, and what sets you apart..."
            value={data.companyBio || ""}
            onChange={(e) => updateData({ companyBio: e.target.value })}
            className="min-h-[120px] w-full"
          />
          <p className="text-xs text-gray-500">
            A brief description of your company (2-4 paragraphs recommended)
          </p>
        </div>

        {/* Year Established */}
        <div className="space-y-2">
          <Label htmlFor="yearEstablished" className="text-sm font-medium">
            Year Established
          </Label>
          <Input
            id="yearEstablished"
            type="number"
            min="1900"
            max={new Date().getFullYear()}
            placeholder="2010"
            value={data.yearEstablished || ""}
            onChange={(e) => updateData({ yearEstablished: parseInt(e.target.value) || undefined })}
            className="w-full md:w-64"
          />
          <p className="text-xs text-gray-500">The year your company was founded</p>
        </div>
      </div>

      {/* Licenses & Certifications */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">
          Licenses & Certifications
        </h3>

        {/* License Numbers */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">License Numbers</Label>
            <Button type="button" variant="outline" size="sm" onClick={addLicense}>
              <Plus className="mr-1 h-4 w-4" />
              Add License
            </Button>
          </div>

          {data.licenseNumbers && data.licenseNumbers.length > 0 ? (
            <div className="space-y-2">
              {data.licenseNumbers.map((license, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="License #12345"
                    value={license}
                    onChange={(e) => updateLicense(index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeLicense(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-gray-500">No licenses added yet</p>
          )}
        </div>

        {/* Certifications */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Certifications</Label>
            <Button type="button" variant="outline" size="sm" onClick={addCertification}>
              <Plus className="mr-1 h-4 w-4" />
              Add Certification
            </Button>
          </div>

          {data.certifications && data.certifications.length > 0 ? (
            <div className="space-y-2">
              {data.certifications.map((cert, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    placeholder="GAF Master Elite Contractor"
                    value={cert}
                    onChange={(e) => updateCertification(index, e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeCertification(index)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-gray-500">No certifications added yet</p>
          )}
        </div>
      </div>

      {/* BBB Rating */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">
          Better Business Bureau
        </h3>

        <div className="space-y-2">
          <Label htmlFor="bbbRating" className="text-sm font-medium">
            BBB Rating
          </Label>
          <Select
            value={data.bbbRating || ""}
            onValueChange={(value) => updateData({ bbbRating: value as any })}
          >
            <SelectTrigger id="bbbRating" className="w-full md:w-64">
              <SelectValue placeholder="Select BBB rating" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A+">A+ (Excellent)</SelectItem>
              <SelectItem value="A">A (Very Good)</SelectItem>
              <SelectItem value="B">B (Good)</SelectItem>
              <SelectItem value="C">C (Fair)</SelectItem>
              <SelectItem value="Not Rated">Not Rated</SelectItem>
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">
            Your Better Business Bureau rating (if applicable)
          </p>
        </div>
      </div>

      {/* Customer Testimonials */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">Customer Testimonials</h3>

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Testimonials</Label>
            <Button type="button" variant="outline" size="sm" onClick={addTestimonial}>
              <Plus className="mr-1 h-4 w-4" />
              Add Testimonial
            </Button>
          </div>

          {data.customerTestimonials && data.customerTestimonials.length > 0 ? (
            <div className="space-y-4">
              {data.customerTestimonials.map((testimonial, index) => (
                <div key={index} className="space-y-3 rounded-lg border bg-gray-50 p-4">
                  <div className="flex items-start justify-between">
                    <Label className="text-xs font-medium text-gray-600">
                      Testimonial #{index + 1}
                    </Label>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => removeTestimonial(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                  <Textarea
                    placeholder="Customer's feedback..."
                    value={testimonial.quote}
                    onChange={(e) => updateTestimonial(index, "quote", e.target.value)}
                    className="min-h-[80px]"
                  />
                  <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Input
                      placeholder="Customer Name"
                      value={testimonial.name}
                      onChange={(e) => updateTestimonial(index, "name", e.target.value)}
                    />
                    <Input
                      placeholder="Location (City, State)"
                      value={testimonial.location}
                      onChange={(e) => updateTestimonial(index, "location", e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-medium text-gray-600">Rating (1-5 stars)</Label>
                    <Select
                      value={testimonial.rating.toString()}
                      onValueChange={(value) => updateTestimonial(index, "rating", parseInt(value))}
                    >
                      <SelectTrigger className="w-full">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">★★★★★ (5 stars)</SelectItem>
                        <SelectItem value="4">★★★★☆ (4 stars)</SelectItem>
                        <SelectItem value="3">★★★☆☆ (3 stars)</SelectItem>
                        <SelectItem value="2">★★☆☆☆ (2 stars)</SelectItem>
                        <SelectItem value="1">★☆☆☆☆ (1 star)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm italic text-gray-500">No testimonials added yet</p>
          )}
        </div>
      </div>

      {/* Help Text */}
      <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="ml-3 flex-1">
            <p className="text-sm text-blue-700">
              <strong>Tip:</strong> This &quot;Why Choose Us&quot; page helps homeowners understand your
              credibility and experience. Include 2-3 strong testimonials and highlight any industry
              certifications or awards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
