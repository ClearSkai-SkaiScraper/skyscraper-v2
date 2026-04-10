"use client";

import { useEffect, useMemo, useState } from "react";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { buildClaimLabel, buildJobLabel } from "@/lib/context/buildContextLabel";

type ClaimLite = {
  id: string;
  claimNumber: string | null;
  insuredName: string | null;
  propertyAddress: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  dateOfLoss: string | null;
};

type JobLite = {
  id: string;
  title: string;
  claimId: string | null;
  status: string | null;
};

export type ClaimJobSelection = {
  claimId?: string;
  jobId?: string;
  resolvedClaimId?: string;
};

export function ClaimJobSelect(props: {
  value: ClaimJobSelection;
  onValueChange: (next: ClaimJobSelection) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}) {
  const { value, onValueChange, placeholder = "Select claim or job", className, disabled } = props;

  const [claims, setClaims] = useState<ClaimLite[]>([]);
  const [jobs, setJobs] = useState<JobLite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      setLoading(true);
      try {
        const [claimsRes, jobsRes] = await Promise.all([
          fetch("/api/claims/list-lite", { cache: "no-store" }),
          fetch("/api/jobs", { cache: "no-store" }),
        ]);

        const claimsJson = claimsRes.ok ? await claimsRes.json() : null;
        const claimsArr = Array.isArray(claimsJson) ? claimsJson : claimsJson?.claims;

        const mappedClaims: ClaimLite[] = Array.isArray(claimsArr)
          ? claimsArr
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((c: any) => c && typeof c.id === "string")
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((c: any) => ({
                id: String(c.id),
                claimNumber: c.claimNumber ?? null,
                insuredName: c.insuredName ?? null,
                propertyAddress: c.propertyAddress ?? null,
                address: c.address ?? null,
                city: c.city ?? null,
                state: c.state ?? null,
                zip: c.zip ?? null,
                dateOfLoss: c.dateOfLoss ?? null,
              }))
          : [];

        const jobsJson = jobsRes.ok ? await jobsRes.json() : null;
        const jobsArr = Array.isArray(jobsJson) ? jobsJson : jobsJson?.jobs;

        const mappedJobs: JobLite[] = Array.isArray(jobsArr)
          ? jobsArr
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .filter((j: any) => j && typeof j.id === "string")
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              .map((j: any) => ({
                id: String(j.id),
                title: String(j.title || ""),
                claimId: j.claimId ? String(j.claimId) : null,
                status: j.status ? String(j.status) : null,
              }))
          : [];

        if (!cancelled) {
          setClaims(mappedClaims);
          setJobs(mappedJobs);
        }
      } catch {
        if (!cancelled) {
          setClaims([]);
          setJobs([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  const options = useMemo(() => {
    const claimOptions = claims.map((c) => ({
      value: `claim:${c.id}`,
      label: buildClaimLabel({
        id: c.id,
        claimNumber: c.claimNumber,
        insuredName: c.insuredName,
        address: c.propertyAddress,
        street: c.address,
        city: c.city,
        state: c.state,
        zip: c.zip,
      }),
    }));
    const jobOptions = jobs.map((j) => ({
      value: `job:${j.id}`,
      label: buildJobLabel(j),
    }));
    return { claimOptions, jobOptions };
  }, [claims, jobs]);

  const currentValue = value.claimId
    ? `claim:${value.claimId}`
    : value.jobId
      ? `job:${value.jobId}`
      : undefined;

  const isDisabled = disabled || loading;

  const placeholderText = useMemo(() => {
    if (loading) return "Loading...";
    if (claims.length === 0 && jobs.length === 0)
      return "No claims or jobs found — create one first";
    return placeholder;
  }, [loading, claims.length, jobs.length, placeholder]);

  const handleChange = (raw: string) => {
    if (!raw) {
      onValueChange({});
      return;
    }
    const [kind, id] = raw.split(":");
    if (!id) {
      onValueChange({});
      return;
    }

    if (kind === "claim") {
      onValueChange({ claimId: id, resolvedClaimId: id });
      return;
    }

    if (kind === "job") {
      const job = jobs.find((j) => j.id === id);
      onValueChange({ jobId: id, resolvedClaimId: job?.claimId || undefined });
      return;
    }

    onValueChange({});
  };

  return (
    <Select value={currentValue} onValueChange={handleChange} disabled={isDisabled}>
      <SelectTrigger className={className}>
        <SelectValue placeholder={placeholderText} />
      </SelectTrigger>
      <SelectContent>
        {options.claimOptions.length > 0 && (
          <SelectGroup>
            <SelectLabel>Claims</SelectLabel>
            {options.claimOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
        {options.jobOptions.length > 0 && (
          <SelectGroup>
            <SelectLabel>Jobs</SelectLabel>
            {options.jobOptions.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectGroup>
        )}
      </SelectContent>
    </Select>
  );
}
