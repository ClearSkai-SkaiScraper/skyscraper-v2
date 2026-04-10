"use client";

import React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ClaimPacketData, WARRANTY_OPTIONS } from "@/lib/claims/templates";

interface Step6Props {
  data: ClaimPacketData;
  updateData: (updates: Partial<ClaimPacketData>) => void;
  validationErrors?: string[];
}

/**
 * Step 6: Warranty Information
 *
 * All fields are OPTIONAL
 *
 * Fields:
 * - warrantyOption (select - 5yr-labor, 10yr-labor, manufacturer-system)
 * - serviceHotline (phone number for warranty service)
 * - warrantyEmail (email for warranty claims)
 */
export function Step6_Warranty({ data, updateData }: Step6Props) {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Warranty Information</h2>
        <p className="mt-2 text-sm text-gray-600">
          Provide warranty details to give homeowners peace of mind about their investment. All
          fields are optional.
        </p>
      </div>

      {/* Warranty Selection */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">Warranty Coverage</h3>

        <div className="space-y-2">
          <Label htmlFor="warrantyOption" className="text-sm font-medium">
            Warranty Type
          </Label>
          <Select
            value={data.warrantyOption || ""}
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onValueChange={(value) => updateData({ warrantyOption: value as any })}
          >
            <SelectTrigger id="warrantyOption" className="w-full">
              <SelectValue placeholder="Select warranty option" />
            </SelectTrigger>
            <SelectContent>
              {WARRANTY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-gray-500">Choose the warranty coverage you&apos;re offering</p>
        </div>
      </div>

      {/* Warranty Contact Information */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">
          Warranty Service Contacts
        </h3>

        {/* Service Hotline */}
        <div className="space-y-2">
          <Label htmlFor="serviceHotline" className="text-sm font-medium">
            Service Hotline
          </Label>
          <Input
            id="serviceHotline"
            type="tel"
            placeholder="1-800-555-ROOF"
            value={data.serviceHotline || ""}
            onChange={(e) => updateData({ serviceHotline: e.target.value })}
            className="w-full md:w-80"
          />
          <p className="text-xs text-gray-500">Phone number for warranty service requests</p>
        </div>

        {/* Warranty Email */}
        <div className="space-y-2">
          <Label htmlFor="warrantyEmail" className="text-sm font-medium">
            Warranty Email
          </Label>
          <Input
            id="warrantyEmail"
            type="email"
            placeholder="warranty@yourcompany.com"
            value={data.warrantyEmail || ""}
            onChange={(e) => updateData({ warrantyEmail: e.target.value })}
            className="w-full md:w-80"
          />
          <p className="text-xs text-gray-500">Email address for warranty claims and inquiries</p>
        </div>
      </div>

      {/* Warranty Summary (If Data Entered) */}
      {(data.warrantyOption || data.serviceHotline || data.warrantyEmail) && (
        <div className="rounded-lg border border-green-200 bg-green-50 p-4">
          <h4 className="mb-2 text-sm font-semibold text-green-800">Warranty Summary</h4>
          <div className="space-y-1 text-sm text-green-700">
            {data.warrantyOption && (
              <p>
                <strong>Coverage:</strong>{" "}
                {WARRANTY_OPTIONS.find((opt) => opt.value === data.warrantyOption)?.label}
              </p>
            )}
            {data.serviceHotline && (
              <p>
                <strong>Hotline:</strong> {data.serviceHotline}
              </p>
            )}
            {data.warrantyEmail && (
              <p>
                <strong>Email:</strong> {data.warrantyEmail}
              </p>
            )}
          </div>
        </div>
      )}

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
              <strong>Tip:</strong> Strong warranty coverage is a key differentiator. Make sure to
              highlight any manufacturer warranties AND your workmanship guarantee in the final
              packet.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
