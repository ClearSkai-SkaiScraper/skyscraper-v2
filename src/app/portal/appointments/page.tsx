"use client";

import { Calendar, FileText, Loader2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

import { AppointmentBooking } from "@/components/portal/AppointmentBooking";
import PortalPageHero from "@/components/portal/portal-page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface ClaimWithContractor {
  id: string;
  claimNumber: string;
  address: string;
  contractorName: string;
  contractorPhone?: string;
}

/**
 * 📅 Client Portal - Appointments Page
 *
 * Allows clients to book inspections and consultations
 * with their assigned contractors.
 */
export default function AppointmentsPage() {
  const [claims, setClaims] = useState<ClaimWithContractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClaimId, setSelectedClaimId] = useState<string | null>(null);

  useEffect(() => {
    async function fetchClaims() {
      try {
        const res = await fetch("/api/portal/claims");
        if (res.ok) {
          const data = await res.json();
          // Map claims to include contractor info (using org name as contractor)
          const mappedClaims: ClaimWithContractor[] = (data.claims || []).map(
            (claim: { id: string; claimNumber: string; address: string }) => ({
              id: claim.id,
              claimNumber: claim.claimNumber,
              address: claim.address,
              contractorName: "Your Assigned Contractor", // Would come from claim data
            })
          );
          setClaims(mappedClaims);
        }
      } catch {
        // Silently fail
      } finally {
        setLoading(false);
      }
    }
    fetchClaims();
  }, []);

  const selectedClaim = claims.find((c) => c.id === selectedClaimId);

  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <PortalPageHero
        title="Book Appointments"
        subtitle="Schedule inspections, consultations, and follow-up meetings with your contractor."
        icon={Calendar}
        badge="Scheduling"
        gradient="purple"
      />

      {/* Loading State */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
        </div>
      )}

      {/* No Claims State */}
      {!loading && claims.length === 0 && (
        <Card className="border-2 border-dashed">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <FileText className="mb-4 h-12 w-12 text-slate-400" />
            <h3 className="text-lg font-semibold">No Active Claims</h3>
            <p className="mb-4 text-sm text-slate-500">
              You need an active claim with an assigned contractor to book appointments.
            </p>
            <Link href="/portal/claims">
              <Button variant="outline">View Claims</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Claim Selection */}
      {!loading && claims.length > 0 && !selectedClaimId && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Select a Claim to Schedule</h3>
          <div className="grid gap-4 md:grid-cols-2">
            {claims.map((claim) => (
              <Card
                key={claim.id}
                className="cursor-pointer transition-shadow hover:shadow-md"
                onClick={() => setSelectedClaimId(claim.id)}
              >
                <CardHeader>
                  <CardTitle className="text-base">{claim.claimNumber}</CardTitle>
                  <CardDescription>{claim.address || "Address pending"}</CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-slate-600 dark:text-slate-400">
                    Contractor: {claim.contractorName}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Appointment Booking Component */}
      {!loading && selectedClaim && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold">Scheduling for {selectedClaim.claimNumber}</h3>
              <p className="text-sm text-slate-500">{selectedClaim.address}</p>
            </div>
            <Button variant="outline" onClick={() => setSelectedClaimId(null)}>
              Change Claim
            </Button>
          </div>
          <AppointmentBooking
            claimId={selectedClaim.id}
            contractorName={selectedClaim.contractorName}
            contractorPhone={selectedClaim.contractorPhone}
          />
        </div>
      )}
    </div>
  );
}
