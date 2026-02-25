"use client";

import { useUser } from "@clerk/nextjs";
import { AlertTriangle, Calendar, CheckCircle, FileCheck, Shield } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface Certification {
  id: string;
  type: string;
  holder: string;
  issueDate: string;
  expiryDate: string;
  status: "valid" | "expiring" | "expired";
  number: string;
}

export default function CompliancePage() {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useUser();

  const [certifications] = useState<Certification[]>([
    {
      id: "1",
      type: "General Contractor License",
      holder: "SkaiScraper LLC",
      issueDate: "2023-01-15",
      expiryDate: "2025-01-15",
      status: "valid",
      number: "GC-123456",
    },
    {
      id: "2",
      type: "General Liability Insurance",
      holder: "SkaiScraper LLC",
      issueDate: "2024-01-01",
      expiryDate: "2025-01-01",
      status: "expiring",
      number: "INS-789012",
    },
    {
      id: "3",
      type: "Workers Compensation",
      holder: "SkaiScraper LLC",
      issueDate: "2024-06-01",
      expiryDate: "2025-06-01",
      status: "valid",
      number: "WC-345678",
    },
  ]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push("/sign-in");
    }
  }, [isLoaded, isSignedIn, router]);

  if (!isLoaded || !isSignedIn) {
    return <div className="flex h-screen items-center justify-center">Loading...</div>;
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "valid":
        return <CheckCircle className="h-5 w-5" />;
      case "expiring":
        return <AlertTriangle className="h-5 w-5" />;
      case "expired":
        return <AlertTriangle className="h-5 w-5" />;
      default:
        return <Shield className="h-5 w-5" />;
    }
  };

  const getDaysUntilExpiry = (expiryDate: string) => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const diff = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-6 p-8">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="mb-2 text-3xl font-bold text-[color:var(--text)]">
            Compliance & Certifications
          </h1>
          <p className="text-gray-600">
            License tracking, insurance verification, and safety certifications
          </p>
        </div>
        <Button>Add Certification</Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-4 gap-4">
        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-slate-300">Active Certifications</span>
            <Shield className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold">12</div>
          <div className="mt-1 text-sm text-gray-600">All valid</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-slate-300">Expiring Soon</span>
            <AlertTriangle className="h-5 w-5 text-yellow-600" />
          </div>
          <div className="text-3xl font-bold">3</div>
          <div className="mt-1 text-sm text-gray-600">Within 60 days</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-slate-300">Expired</span>
            <AlertTriangle className="h-5 w-5 text-red-600" />
          </div>
          <div className="text-3xl font-bold">0</div>
          <div className="mt-1 text-sm text-gray-600">Requires action</div>
        </div>

        <div className="rounded-lg bg-white p-6 shadow dark:bg-slate-800">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-slate-300">Compliance Rate</span>
            <CheckCircle className="h-5 w-5 text-green-600" />
          </div>
          <div className="text-3xl font-bold">100%</div>
          <div className="mt-1 text-sm text-gray-600">Fully compliant</div>
        </div>
      </div>

      {/* Certifications Table */}
      <div className="overflow-hidden rounded-lg bg-white shadow dark:bg-slate-800">
        <div className="border-b p-6 dark:border-slate-700">
          <h2 className="text-xl font-bold">Certifications & Licenses</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Type</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Holder</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Number</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Issue Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">
                  Expiry Date
                </th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Days Left</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Status</th>
                <th className="px-6 py-3 text-left text-sm font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {certifications.map((cert) => {
                const daysLeft = getDaysUntilExpiry(cert.expiryDate);
                return (
                  <tr key={cert.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <FileCheck className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="font-medium">{cert.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">{cert.holder}</td>
                    <td className="px-6 py-4 font-mono text-sm">{cert.number}</td>
                    <td className="px-6 py-4">{new Date(cert.issueDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">{new Date(cert.expiryDate).toLocaleDateString()}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`font-medium ${
                          daysLeft < 30
                            ? "text-red-600"
                            : daysLeft < 60
                              ? "text-yellow-600"
                              : "text-green-600"
                        }`}
                      >
                        {daysLeft} days
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`flex w-fit items-center gap-1 rounded-full px-3 py-1 text-xs font-medium capitalize ${
                          cert.status === "valid"
                            ? "bg-green-100 text-green-700"
                            : cert.status === "expiring"
                              ? "bg-yellow-100 text-yellow-700"
                              : "bg-red-100 text-red-700"
                        }`}
                      >
                        {getStatusIcon(cert.status)}
                        {cert.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                        {cert.status === "expiring" && <Button size="sm">Renew</Button>}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Renewal Reminders */}
      <div className="rounded-lg bg-white p-6 shadow">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-bold">
          <Calendar className="h-6 w-6 text-blue-600" />
          Upcoming Renewals
        </h2>
        <div className="space-y-3">
          {certifications
            .filter((c) => c.status === "expiring")
            .map((cert) => (
              <div
                key={cert.id}
                className="flex items-center justify-between rounded-lg border border-yellow-200 bg-yellow-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600" />
                  <div>
                    <div className="font-medium">{cert.type}</div>
                    <div className="text-sm text-gray-600">
                      Expires {new Date(cert.expiryDate).toLocaleDateString()} (
                      {getDaysUntilExpiry(cert.expiryDate)} days)
                    </div>
                  </div>
                </div>
                <Button className="bg-yellow-600 hover:bg-yellow-700">Set Reminder</Button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
}
