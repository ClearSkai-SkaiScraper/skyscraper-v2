"use client";

import {
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Calendar,
  CheckCircle,
  DollarSign,
  FileText,
  Hammer,
  MapPin,
  Scale,
  Search,
  TrendingDown,
  User,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import { card, glow } from "@/lib/theme";

export type SortField =
  | "claimNumber"
  | "title"
  | "status"
  | "createdAt"
  | "updatedAt"
  | "estimatedValue";

export type SortDirection = "asc" | "desc";

export interface ClaimRow {
  id: string;
  claimNumber: string | null;
  title: string | null;
  status: string | null;
  estimatedValue: number | null;
  createdAt: string | null;
  updatedAt: string | null;
  properties?: {
    street?: string | null;
    city?: string | null;
    state?: string | null;
  } | null;
  activities?: Array<{
    createdAt: string | null;
  }>;
}

interface ClaimsTableProps {
  claims: ClaimRow[];
  sortField?: SortField;
  sortDirection?: SortDirection;
}

const stageColors: Record<string, string> = {
  FILED: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
  ADJUSTER_REVIEW: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  APPROVED: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
  DENIED: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  APPEAL: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  BUILD: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
  COMPLETED: "bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200",
  DEPRECIATION: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
  NEW: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
};

function SortableHeader({
  field,
  label,
  currentSort,
  currentDirection,
  onSort,
  align = "left",
}: {
  field: SortField;
  label: string;
  currentSort?: SortField;
  currentDirection?: SortDirection;
  onSort: (field: SortField) => void;
  align?: "left" | "right";
}) {
  const isActive = currentSort === field;
  const Icon = isActive ? (currentDirection === "asc" ? ArrowUp : ArrowDown) : ArrowUpDown;

  return (
    <th
      className={`text- p-3${align} group cursor-pointer select-none text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)] transition-colors hover:text-[color:var(--primary)]`}
      onClick={() => onSort(field)}
    >
      <div className={`flex items-center gap-1 ${align === "right" ? "justify-end" : ""}`}>
        <span>{label}</span>
        <Icon
          className={`h-3.5 w-3.5 transition-colors ${
            isActive
              ? "text-[color:var(--primary)]"
              : "text-[color:var(--muted)] opacity-0 group-hover:opacity-100"
          }`}
        />
      </div>
    </th>
  );
}

function StatusIcon({ status }: { status: string }) {
  const upperStatus = status.toUpperCase();

  switch (upperStatus) {
    case "APPROVED":
    case "COMPLETED":
      return <CheckCircle className="h-3.5 w-3.5" />;
    case "DENIED":
      return <XCircle className="h-3.5 w-3.5" />;
    case "NEW":
    case "FILED":
      return <FileText className="h-3.5 w-3.5" />;
    case "ADJUSTER_REVIEW":
      return <Search className="h-3.5 w-3.5" />;
    case "APPEAL":
      return <Scale className="h-3.5 w-3.5" />;
    case "BUILD":
      return <Hammer className="h-3.5 w-3.5" />;
    case "DEPRECIATION":
      return <TrendingDown className="h-3.5 w-3.5" />;
    default:
      return <FileText className="h-3.5 w-3.5" />;
  }
}

export function ClaimsTable({ claims, sortField, sortDirection }: ClaimsTableProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const createQueryString = useCallback(
    (params: Record<string, string | null>) => {
      const newParams = new URLSearchParams(searchParams?.toString() ?? "");

      Object.entries(params).forEach(([key, value]) => {
        if (value === null) {
          newParams.delete(key);
        } else {
          newParams.set(key, value);
        }
      });

      return newParams.toString();
    },
    [searchParams]
  );

  const handleSort = useCallback(
    (field: SortField) => {
      let newDirection: SortDirection = "asc";

      // If clicking the same field, toggle direction
      if (sortField === field) {
        newDirection = sortDirection === "asc" ? "desc" : "asc";
      } else {
        // Default directions for different fields
        if (field === "createdAt" || field === "updatedAt" || field === "estimatedValue") {
          newDirection = "desc"; // Newest/highest first
        }
      }

      const queryString = createQueryString({
        sort: field,
        dir: newDirection,
        page: "1", // Reset to first page on sort change
      });

      router.push(`${pathname}?${queryString}`);
    },
    [sortField, sortDirection, createQueryString, router, pathname]
  );

  // Sort claims in the client if needed
  const sortedClaims = [...claims].sort((a, b) => {
    if (!sortField) return 0;

    let aVal: string | number | null = null;
    let bVal: string | number | null = null;

    switch (sortField) {
      case "claimNumber":
        aVal = a.claimNumber || "";
        bVal = b.claimNumber || "";
        break;
      case "title":
        aVal = a.title || "";
        bVal = b.title || "";
        break;
      case "status":
        aVal = a.status || "";
        bVal = b.status || "";
        break;
      case "createdAt":
        aVal = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        bVal = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        break;
      case "updatedAt":
        aVal = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
        bVal = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
        break;
      case "estimatedValue":
        aVal = a.estimatedValue || 0;
        bVal = b.estimatedValue || 0;
        break;
      default:
        return 0;
    }

    if (typeof aVal === "string" && typeof bVal === "string") {
      const comparison = aVal.localeCompare(bVal, undefined, { sensitivity: "base" });
      return sortDirection === "asc" ? comparison : -comparison;
    }

    if (typeof aVal === "number" && typeof bVal === "number") {
      return sortDirection === "asc" ? aVal - bVal : bVal - aVal;
    }

    return 0;
  });

  return (
    <div className={`${card} ${glow}`}>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[color:var(--border)]">
              <SortableHeader
                field="claimNumber"
                label="Claim #"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="title"
                label="Insured"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <th className="p-3 text-left text-xs font-semibold uppercase tracking-wide text-[color:var(--muted)]">
                Property
              </th>
              <SortableHeader
                field="status"
                label="Stage"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
              <SortableHeader
                field="estimatedValue"
                label="Exposure"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
                align="right"
              />
              <SortableHeader
                field="updatedAt"
                label="Last Updated"
                currentSort={sortField}
                currentDirection={sortDirection}
                onSort={handleSort}
              />
            </tr>
          </thead>
          <tbody>
            {sortedClaims.map((claim) => (
              <tr
                key={claim.id}
                className="border-b border-[color:var(--border)] transition-colors hover:bg-[var(--surface-2)]"
              >
                <td className="p-3">
                  <Link
                    href={`/claims/${claim.id}/overview`}
                    className="font-mono text-sm text-[color:var(--primary)] hover:underline"
                  >
                    {claim.claimNumber || "—"}
                  </Link>
                </td>
                <td className="p-3 text-sm text-[color:var(--text)]">
                  <div className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>{claim.title || "—"}</span>
                  </div>
                </td>
                <td className="p-3 text-sm text-[color:var(--muted)]">
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4" />
                    <span>{claim.properties?.street || "—"}</span>
                  </div>
                </td>
                <td className="p-3">
                  {claim.status && (
                    <span
                      className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold ${
                        stageColors[claim.status.toUpperCase()] || stageColors.FILED
                      }`}
                    >
                      <StatusIcon status={claim.status} />
                      <span>{claim.status.toUpperCase()}</span>
                    </span>
                  )}
                </td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-2">
                    <DollarSign className="h-4 w-4" />
                    <span className="text-sm font-semibold text-[color:var(--text)]">
                      {claim.estimatedValue
                        ? `$${(claim.estimatedValue / 100).toLocaleString("en-US", {
                            minimumFractionDigits: 0,
                            maximumFractionDigits: 0,
                          })}`
                        : "—"}
                    </span>
                  </div>
                </td>
                <td className="p-3 text-xs text-[color:var(--muted)]">
                  <div className="flex items-center gap-2">
                    <Calendar className="h-4 w-4" />
                    <span>
                      {claim.updatedAt
                        ? new Date(claim.updatedAt).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })
                        : claim.activities?.[0]?.createdAt
                          ? new Date(claim.activities[0].createdAt).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                    </span>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Sort indicator bar */}
      {sortField && (
        <div className="border-t border-[color:var(--border)] px-4 py-2 text-xs text-[color:var(--muted)]">
          Sorted by{" "}
          <span className="font-medium text-[color:var(--text)]">{getSortLabel(sortField)}</span> (
          {sortDirection === "asc" ? "ascending" : "descending"})
        </div>
      )}
    </div>
  );
}

function getSortLabel(field: SortField): string {
  const labels: Record<SortField, string> = {
    claimNumber: "Claim #",
    title: "Insured Name",
    status: "Stage",
    createdAt: "Created Date",
    updatedAt: "Last Updated",
    estimatedValue: "Exposure",
  };
  return labels[field];
}

export default ClaimsTable;
