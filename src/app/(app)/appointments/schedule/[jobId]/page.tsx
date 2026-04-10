/**
 * SCHEDULED JOB DETAIL PAGE
 * View and manage individual scheduled jobs
 * Shows time, date, type, materials, delivery, contacts, and more
 */

import { AlertCircle, ArrowLeft } from "lucide-react";
import { Metadata } from "next";
import Link from "next/link";

import { PageContainer } from "@/components/layout/PageContainer";
import { Button } from "@/components/ui/button";
import { safeOrgContext } from "@/lib/safeOrgContext";

import { ScheduledJobClient } from "./_components/ScheduledJobClient";

export const metadata: Metadata = {
  title: "Job Details | SkaiScraper",
  description: "View scheduled job details, materials, and assignments",
};

export const dynamic = "force-dynamic";

// Demo job data - matches the IDs in JobScheduleClient
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const DEMO_JOBS: Record<string, any> = {
  "job-1": {
    id: "job-1",
    title: "Initial Roof Inspection - Smith Residence",
    jobType: "inspection",
    status: "confirmed",
    priority: "high",
    scheduledStart: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() + 4 * 60 * 60 * 1000).toISOString(),
    property: {
      address: "123 Memory Lane",
      city: "Phoenix",
      state: "AZ",
      zipCode: "85001",
    },
    claim: {
      id: "claim-demo-1",
      claimNumber: "CLM-2024-001",
      insurer: "State Farm",
      policyNumber: "POL-SF-12345",
    },
    customer: {
      name: "John Smith",
      phone: "555-123-4567",
      email: "johnsmith@gmail.com",
    },
    assignedTeam: [{ id: "user-1", name: "John Smith", role: "Lead Inspector" }],
    materials: [],
    delivery: null,
    notes:
      "Check for hail damage. Bring drone for aerial shots. Customer expects call 30 minutes before arrival.",
    checklist: [
      { id: "c1", task: "Document roof condition", completed: false },
      { id: "c2", task: "Take 50+ photos", completed: false },
      { id: "c3", task: "Measure square footage", completed: false },
      { id: "c4", task: "Note any pre-existing damage", completed: false },
      { id: "c5", task: "Create preliminary scope", completed: false },
    ],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
  "job-2": {
    id: "job-2",
    title: "Full Roof Replacement - Johnson Property",
    jobType: "install",
    status: "scheduled",
    priority: "medium",
    scheduledStart: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() + 32 * 60 * 60 * 1000).toISOString(),
    property: {
      address: "456 Oak Avenue",
      city: "Scottsdale",
      state: "AZ",
      zipCode: "85251",
    },
    claim: {
      id: "claim-demo-2",
      claimNumber: "CLM-2024-002",
      insurer: "Allstate",
      policyNumber: "POL-AS-67890",
    },
    customer: {
      name: "Jane Smith",
      phone: "555-234-5678",
      email: "janesmith@gmail.com",
    },
    assignedTeam: [
      { id: "user-2", name: "Mike Wilson", role: "Project Manager" },
      { id: "user-3", name: "David Lee", role: "Crew Lead" },
    ],
    assignedPros: [{ id: "pro-1", name: "ABC Roofing", specialty: "Residential Installation" }],
    materials: [
      {
        id: "m1",
        name: "Timberline HDZ Shingles - Charcoal",
        quantity: 45,
        unit: "bundle",
        status: "ordered",
      },
      { id: "m2", name: "Starter Strip Plus", quantity: 10, unit: "roll", status: "ordered" },
      { id: "m3", name: "Ice & Water Shield", quantity: 8, unit: "roll", status: "delivered" },
      { id: "m4", name: "Drip Edge", quantity: 200, unit: "linear ft", status: "delivered" },
    ],
    delivery: {
      vendor: "GAF Materials",
      scheduledDate: new Date(Date.now() + 20 * 60 * 60 * 1000).toISOString(),
      address: "456 Oak Avenue, Scottsdale, AZ 85251",
      instructions: "Drop in driveway. Forklift accessible.",
      status: "scheduled",
    },
    notes:
      "Full tear-off and re-roof. 30 square residential. Customer will not be home - access via lockbox (code: 1234).",
    checklist: [
      { id: "c1", task: "Setup safety equipment", completed: false },
      { id: "c2", task: "Remove old shingles", completed: false },
      { id: "c3", task: "Inspect decking", completed: false },
      { id: "c4", task: "Install underlayment", completed: false },
      { id: "c5", task: "Install new shingles", completed: false },
      { id: "c6", task: "Cleanup debris", completed: false },
      { id: "c7", task: "Final walkthrough", completed: false },
    ],
    createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
  "job-3": {
    id: "job-3",
    title: "Emergency Leak Repair",
    jobType: "repair",
    status: "in_progress",
    priority: "high",
    scheduledStart: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
    scheduledEnd: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString(),
    property: {
      address: "789 Pine Road",
      city: "Tempe",
      state: "AZ",
      zipCode: "85281",
    },
    retailJob: {
      id: "retail-1",
      name: "Retail Job #1045",
      type: "Emergency Repair",
    },
    customer: {
      name: "Bob Smith",
      phone: "555-345-6789",
      email: "bobsmith@gmail.com",
    },
    assignedTeam: [{ id: "user-4", name: "Tom Brown", role: "Service Tech" }],
    materials: [
      { id: "m1", name: "Emergency Patch Kit", quantity: 1, unit: "kit", status: "on-truck" },
      { id: "m2", name: "Roofing Cement", quantity: 2, unit: "gallon", status: "on-truck" },
    ],
    delivery: null,
    notes:
      "Active leak over master bedroom. Customer has tarps in place. Priority repair - prevent interior damage.",
    checklist: [
      { id: "c1", task: "Locate leak source", completed: true },
      { id: "c2", task: "Temporary patch", completed: true },
      { id: "c3", task: "Verify no active leak", completed: false },
      { id: "c4", task: "Document for follow-up", completed: false },
    ],
    createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
  },
};

interface PageProps {
  params: Promise<{ jobId: string }>;
}

export default async function ScheduledJobPage({ params }: PageProps) {
  const resolvedParams = await params;
  const ctx = await safeOrgContext();

  const orgId = ctx.ok ? (ctx.orgId ?? "") : "";
  const userId = ctx.ok ? (ctx.userId ?? "") : "";

  // Try to fetch from API first, fall back to demo data
  let job = null;

  // In production, fetch from database
  // For now, use demo data based on jobId
  job = DEMO_JOBS[resolvedParams.jobId] || null;

  if (!job) {
    return (
      <PageContainer maxWidth="6xl">
        <div className="py-20 text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="mb-2 text-2xl font-bold">Job Not Found</h1>
          <p className="mb-6 text-muted-foreground">
            The scheduled job you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
          <Link href="/appointments/schedule">
            <Button>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Schedule
            </Button>
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer maxWidth="7xl">
      <ScheduledJobClient job={job} orgId={orgId} userId={userId} />
    </PageContainer>
  );
}
