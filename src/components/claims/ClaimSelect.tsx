"use client";

import { useEffect, useState } from "react";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { logger } from "@/lib/logger";

interface Claim {
  id: string;
  claimNumber: string | null;
  insured_name: string | null;
  property_address: string | null;
  status: string;
}

type ClaimSelectProps =
  | {
      value: string;
      onValueChange: (value: string) => void;
      placeholder?: string;
      className?: string;
    }
  | {
      claims: Array<{
        id: string;
        claimNumber: string | null;
        propertyAddress: string | null;
        dateOfLoss: Date | null;
      }>;
      selectedClaimId: string;
      onClaimChange: (claimId: string) => void;
      placeholder?: string;
      className?: string;
    };

export function ClaimSelect({
  placeholder = "Select a claim",
  className,
  ...props
}: ClaimSelectProps) {
  const isExternalClaims = "claims" in props;
  const externalClaims = isExternalClaims ? props.claims : null;
  const value = isExternalClaims ? props.selectedClaimId : props.value;
  const onValueChange = isExternalClaims ? props.onClaimChange : props.onValueChange;

  const [claims, setClaims] = useState<Claim[]>([]);
  const [loading, setLoading] = useState(!isExternalClaims);

  useEffect(() => {
    if (isExternalClaims) {
      const mapped = (externalClaims || []).map((c) => ({
        id: c.id,
        claimNumber: c.claimNumber,
        insured_name: null,
        property_address: c.propertyAddress,
        status: "",
      }));
      setClaims(mapped);
      setLoading(false);
      return;
    }

    async function fetchClaims() {
      try {
        // Try /api/claims first, fallback to /api/claims/list-lite (better org resolution)
        let res = await fetch("/api/claims");
        if (!res.ok) {
          res = await fetch("/api/claims/list-lite");
        }
        if (res.ok) {
          const data = await res.json();
          const arr = data.claims || [];
          setClaims(
            arr.map((c: any) => ({
              id: c.id,
              claimNumber: c.claimNumber ?? c.claim_number ?? null,
              insured_name: c.insured_name ?? null,
              property_address: c.propertyAddress ?? c.property_address ?? null,
              status: c.status ?? "",
            }))
          );
        }
      } catch (error) {
        logger.error("Failed to fetch claims:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchClaims();
  }, [isExternalClaims, externalClaims]);

  const getClaimLabel = (claim: Claim) => {
    const number = claim.claimNumber || claim.id.slice(0, 8);
    const address = claim.property_address || claim.insured_name || "No address";
    return `${number} - ${address}`;
  };

  if (loading) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="Loading claims..." />
        </SelectTrigger>
      </Select>
    );
  }

  if (claims.length === 0) {
    return (
      <Select disabled>
        <SelectTrigger className={className}>
          <SelectValue placeholder="No claims found" />
        </SelectTrigger>
      </Select>
    );
  }

  // Ensure value is never empty string - Radix Select throws "pattern" error for empty strings
  const safeValue = value && value.trim().length > 0 ? value : undefined;

  return (
    <Select value={safeValue} onValueChange={onValueChange}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {claims
          .filter((claim) => typeof claim.id === "string" && claim.id.trim().length > 0)
          .map((claim) => (
            <SelectItem key={claim.id} value={claim.id}>
              {getClaimLabel(claim)}
            </SelectItem>
          ))}
      </SelectContent>
    </Select>
  );
}
