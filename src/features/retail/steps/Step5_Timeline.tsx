"use client";

import React from "react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ClaimPacketData } from "@/lib/claims/templates";
import { cn } from "@/lib/utils";

interface Step5Props {
  data: ClaimPacketData;
  updateData: (updates: Partial<ClaimPacketData>) => void;
  validationErrors?: string[];
}

/**
 * Step 5: Project Timeline
 *
 * Fields:
 * - typicalDurationDays (number - estimated project duration)
 * - timeline notes (optional description)
 *
 * Note: inspectionDate is already captured in Step 1
 */
export function Step5_Timeline({ data, updateData, validationErrors }: Step5Props) {
  const hasError = (field: string) => {
    return validationErrors?.some((err) => err.toLowerCase().includes(field.toLowerCase()));
  };

  // Calculate estimated completion date if duration is set
  const getEstimatedCompletionDate = () => {
    if (data.inspectionDate && data.typicalDurationDays) {
      const inspectionDate = new Date(data.inspectionDate);
      const completionDate = new Date(inspectionDate);
      completionDate.setDate(completionDate.getDate() + data.typicalDurationDays);
      return completionDate.toLocaleDateString("en-US", {
        weekday: "long",
        year: "numeric",
        month: "long",
        day: "numeric",
      });
    }
    return null;
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Project Timeline</h2>
        <p className="mt-2 text-sm text-gray-600">
          Provide estimated project duration to set homeowner expectations. This helps build trust
          and demonstrates professionalism.
        </p>
      </div>

      {/* Inspection Date Summary */}
      {data.inspectionDate && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path
                  fillRule="evenodd"
                  d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <div className="ml-3 flex-1">
              <p className="text-sm text-blue-700">
                <strong>Inspection Date:</strong>{" "}
                {new Date(data.inspectionDate).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Project Duration */}
      <div className="space-y-6">
        <h3 className="border-b pb-2 text-lg font-semibold text-gray-800">Estimated Duration</h3>

        <div className="space-y-2">
          <Label htmlFor="typicalDurationDays" className="text-sm font-medium">
            Project Duration (Days)
          </Label>
          <Input
            id="typicalDurationDays"
            type="number"
            min="1"
            max="365"
            placeholder="7"
            value={data.typicalDurationDays || ""}
            onChange={(e) =>
              updateData({ typicalDurationDays: parseInt(e.target.value) || undefined })
            }
            className={cn(
              "w-full md:w-64",
              hasError("typicalDurationDays") && "border-red-500 focus-visible:ring-red-500"
            )}
          />
          {hasError("typicalDurationDays") && (
            <p className="text-sm text-red-600">Project duration is required</p>
          )}
          <p className="text-xs text-gray-500">Estimated number of days from start to completion</p>
        </div>

        {/* Show estimated completion if we have both dates */}
        {getEstimatedCompletionDate() && (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    clipRule="evenodd"
                  />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <p className="text-sm text-green-700">
                  <strong>Estimated Completion:</strong> {getEstimatedCompletionDate()}
                </p>
                <p className="mt-1 text-xs text-green-600">
                  Based on {data.typicalDurationDays} day{data.typicalDurationDays !== 1 ? "s" : ""}{" "}
                  from inspection date
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Example Timeline Reference */}
      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
        <h4 className="mb-2 text-sm font-semibold text-gray-700">Typical Project Timelines</h4>
        <ul className="space-y-1 text-xs text-gray-600">
          <li>
            • <strong>Small Residential (1,500-2,000 sq ft):</strong> 1-2 days
          </li>
          <li>
            • <strong>Medium Residential (2,000-3,000 sq ft):</strong> 2-4 days
          </li>
          <li>
            • <strong>Large Residential (3,000+ sq ft):</strong> 4-7 days
          </li>
          <li>
            • <strong>Complex Projects (tile, metal, steep pitch):</strong> 7-14 days
          </li>
        </ul>
        <p className="mt-2 text-xs italic text-gray-500">
          Note: Weather delays and material availability may extend timelines
        </p>
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
              <strong>Tip:</strong> Accurate timeline estimates build homeowner confidence. If
              weather-dependent, consider adding a note about potential delays in the timeline
              details section.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
