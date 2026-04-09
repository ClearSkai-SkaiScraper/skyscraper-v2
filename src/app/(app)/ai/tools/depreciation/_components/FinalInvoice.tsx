/**
 * Final Invoice Component
 * Professional invoice template for depreciation recovery
 * Used in the Depreciation Builder workspace
 */

"use client";

import { Building2, Download, FileText, Mail, Phone, Printer } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fetchClientBranding } from "@/lib/pdf/clientBrandedHeader";
import { type ClientCoverPageData,drawClientCoverPage } from "@/lib/pdf/clientCoverPage";

interface LineItem {
  id: string;
  description: string;
  coverage?: "A" | "B" | "C";
  rcv: number;
  depreciation: number;
  acv: number;
  completed: boolean;
  recoverable: boolean;
}

interface FinalInvoiceProps {
  invoiceNumber?: string;
  invoiceDate?: string;
  claimNumber: string;
  policyNumber?: string;
  carrier?: string;
  // Property Owner Info
  propertyOwner: string;
  propertyAddress: string;
  propertyCity?: string;
  propertyState?: string;
  propertyZip?: string;
  ownerEmail?: string;
  ownerPhone?: string;
  // Contractor Info
  contractorName?: string;
  contractorAddress?: string;
  contractorPhone?: string;
  contractorEmail?: string;
  contractorLicense?: string;
  // Financial
  lineItems: LineItem[];
  deductible?: number;
  acvPaid?: number;
  supplements?: { description: string; amount: number }[];
  // Meta
  notes?: string;
}

export function FinalInvoice({
  invoiceNumber,
  invoiceDate,
  claimNumber,
  policyNumber,
  carrier,
  propertyOwner,
  propertyAddress,
  propertyCity,
  propertyState,
  propertyZip,
  ownerEmail,
  ownerPhone,
  contractorName = "Licensed Contractor",
  contractorAddress,
  contractorPhone,
  contractorEmail,
  contractorLicense,
  lineItems,
  deductible = 0,
  acvPaid = 0,
  supplements = [],
  notes,
}: FinalInvoiceProps) {
  const today =
    invoiceDate ||
    new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

  const invoiceNum = invoiceNumber || `INV-${claimNumber}-${Date.now().toString().slice(-6)}`;

  // Calculate totals
  const completedItems = lineItems.filter((item) => item.completed);
  const recoverableItems = lineItems.filter((item) => item.recoverable && item.completed);

  const totalRCV = completedItems.reduce((sum, item) => sum + item.rcv, 0);
  const totalDepreciation = recoverableItems.reduce((sum, item) => sum + item.depreciation, 0);
  const totalACV = completedItems.reduce((sum, item) => sum + item.acv, 0);
  const totalSupplements = supplements.reduce((sum, s) => sum + s.amount, 0);

  const depreciationRecovery = totalDepreciation;
  const totalDue = depreciationRecovery + totalSupplements;

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadPDF = async () => {
    try {
      const { default: html2canvas } = await import("html2canvas");
      const { default: jsPDF } = await import("jspdf");

      const invoiceEl = document.getElementById("final-invoice-content");
      if (!invoiceEl) return;

      const canvas = await html2canvas(invoiceEl, { scale: 2, useCORS: true });
      const imgData = canvas.toDataURL("image/png");
      const pdf = new jsPDF("p", "mm", "a4");
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const imgWidth = pageWidth - 20; // 10mm margins
      const imgHeight = (canvas.height * imgWidth) / canvas.width;

      // ── COVER PAGE ──
      try {
        const branding = await fetchClientBranding();
        const fullAddr = [
          propertyAddress,
          [propertyCity, propertyState, propertyZip].filter(Boolean).join(", "),
        ]
          .filter(Boolean)
          .join(", ");

        const coverData: ClientCoverPageData = {
          reportTitle: "Depreciation Recovery Invoice",
          reportSubtitle: `Invoice #${invoiceNum}`,
          reportCategory: carrier ? "insurance" : "retail",
          companyName: branding.companyName || contractorName,
          companyLicense: branding.companyLicense || contractorLicense,
          companyPhone: branding.companyPhone || contractorPhone,
          companyEmail: branding.companyEmail || contractorEmail,
          companyWebsite: branding.companyWebsite,
          logoUrl: branding.logoUrl,
          headshotUrl: branding.headshotUrl,
          employeeName: branding.employeeName,
          employeeTitle: branding.employeeTitle,
          employeePhone: branding.employeePhone || branding.companyPhone,
          brandColor: branding.brandColor,
          accentColor: branding.accentColor,
          propertyAddress: fullAddr || undefined,
          insuredName: propertyOwner,
          carrierName: carrier,
          claimNumber,
          policyNumber,
          reportDate: new Date(),
        };

        await drawClientCoverPage(pdf, coverData);
        pdf.addPage(); // content pages follow
      } catch (coverErr) {
        console.warn("[FinalInvoice] Cover page failed:", coverErr);
      }

      let yOffset = 10;
      let remainingHeight = imgHeight;

      // Handle multi-page if content is long
      while (remainingHeight > 0) {
        pdf.addImage(imgData, "PNG", 10, yOffset, imgWidth, imgHeight);
        remainingHeight -= pageHeight - 20;
        if (remainingHeight > 0) {
          pdf.addPage();
          yOffset = -pageHeight + 20 + yOffset;
        }
      }

      pdf.save(`Invoice-${claimNumber}-${invoiceNum}.pdf`);
    } catch (error) {
      console.error("Failed to generate PDF:", error);
    }
  };

  const fullAddress = [
    propertyAddress,
    [propertyCity, propertyState, propertyZip].filter(Boolean).join(", "),
  ]
    .filter(Boolean)
    .join(", ");

  return (
    <Card id="final-invoice-content" className="overflow-hidden print:border-0 print:shadow-none">
      <CardHeader className="bg-gradient-to-r from-slate-800 to-slate-900 text-white print:bg-white print:text-black">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="rounded-lg bg-white/10 p-3 print:bg-gray-100">
              <FileText className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">FINAL INVOICE</h2>
              <p className="text-white/80 print:text-gray-600">Depreciation Recovery Request</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-sm text-white/60 print:text-gray-500">Invoice #</p>
            <p className="font-mono text-lg font-bold">{invoiceNum}</p>
            <p className="text-sm text-white/80 print:text-gray-600">{today}</p>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-6 p-6">
        {/* Claim & Policy Info */}
        <div className="grid gap-4 rounded-lg border bg-blue-50 p-4 md:grid-cols-3 print:bg-gray-50">
          <div>
            <p className="text-xs font-medium text-gray-500">CLAIM NUMBER</p>
            <p className="font-mono font-bold text-blue-700">{claimNumber}</p>
          </div>
          {policyNumber && (
            <div>
              <p className="text-xs font-medium text-gray-500">POLICY NUMBER</p>
              <p className="font-mono">{policyNumber}</p>
            </div>
          )}
          {carrier && (
            <div>
              <p className="text-xs font-medium text-gray-500">INSURANCE CARRIER</p>
              <p className="font-semibold">{carrier}</p>
            </div>
          )}
        </div>

        {/* Bill To / From Section */}
        <div className="grid gap-6 md:grid-cols-2">
          {/* Bill To */}
          <div className="rounded-lg border p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
              <Building2 className="h-4 w-4" />
              BILL TO (Property Owner)
            </h3>
            <p className="font-semibold text-gray-900">{propertyOwner}</p>
            <p className="text-sm text-gray-600">{fullAddress}</p>
            {ownerEmail && (
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3 w-3" />
                {ownerEmail}
              </p>
            )}
            {ownerPhone && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-3 w-3" />
                {ownerPhone}
              </p>
            )}
          </div>

          {/* From Contractor */}
          <div className="rounded-lg border bg-gray-50 p-4">
            <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-gray-500">
              <Building2 className="h-4 w-4" />
              FROM (Contractor)
            </h3>
            <p className="font-semibold text-gray-900">{contractorName}</p>
            {contractorAddress && <p className="text-sm text-gray-600">{contractorAddress}</p>}
            {contractorLicense && (
              <Badge variant="outline" className="mt-2">
                License #{contractorLicense}
              </Badge>
            )}
            {contractorEmail && (
              <p className="mt-2 flex items-center gap-2 text-sm text-gray-600">
                <Mail className="h-3 w-3" />
                {contractorEmail}
              </p>
            )}
            {contractorPhone && (
              <p className="flex items-center gap-2 text-sm text-gray-600">
                <Phone className="h-3 w-3" />
                {contractorPhone}
              </p>
            )}
          </div>
        </div>

        <Separator />

        {/* Line Items Table */}
        <div>
          <h3 className="mb-3 font-semibold">Work Completed - Depreciation Recovery Items</h3>
          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow className="bg-gray-50">
                  <TableHead className="w-[50%]">Description</TableHead>
                  <TableHead className="text-right">RCV</TableHead>
                  <TableHead className="text-right">Depreciation</TableHead>
                  <TableHead className="text-right">ACV</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {completedItems.map((item, idx) => (
                  <TableRow key={item.id || idx}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{item.description}</p>
                        {item.coverage && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Coverage {item.coverage}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.rcv)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-amber-700">
                      {formatCurrency(item.depreciation)}
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(item.acv)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Supplements */}
        {supplements.length > 0 && (
          <div>
            <h3 className="mb-3 font-semibold">Approved Supplements</h3>
            <div className="rounded-lg border">
              <Table>
                <TableBody>
                  {supplements.map((s, idx) => (
                    <TableRow key={idx}>
                      <TableCell>{s.description}</TableCell>
                      <TableCell className="text-right font-mono">
                        {formatCurrency(s.amount)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        <Separator />

        {/* Totals */}
        <div className="ml-auto max-w-sm space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total RCV</span>
            <span className="font-mono">{formatCurrency(totalRCV)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total ACV (Paid by Carrier)</span>
            <span className="font-mono">{formatCurrency(acvPaid || totalACV)}</span>
          </div>
          <div className="flex justify-between text-sm text-amber-700">
            <span>Recoverable Depreciation</span>
            <span className="font-mono font-semibold">{formatCurrency(depreciationRecovery)}</span>
          </div>
          {totalSupplements > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Approved Supplements</span>
              <span className="font-mono">{formatCurrency(totalSupplements)}</span>
            </div>
          )}
          {deductible > 0 && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Less: Deductible (if not yet paid)</span>
              <span className="font-mono">({formatCurrency(deductible)})</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between rounded-lg bg-green-100 p-3 text-lg font-bold text-green-800">
            <span>TOTAL DUE</span>
            <span className="font-mono">{formatCurrency(totalDue)}</span>
          </div>
        </div>

        {/* Notes */}
        {notes && (
          <div className="rounded-lg border bg-amber-50 p-4">
            <h4 className="mb-2 font-semibold text-amber-900">Notes</h4>
            <p className="text-sm text-gray-700">{notes}</p>
          </div>
        )}

        {/* Payment Instructions */}
        <div className="rounded-lg border bg-blue-50 p-4">
          <h4 className="mb-2 font-semibold text-blue-900">Payment Instructions</h4>
          <p className="text-sm text-gray-700">
            Please make check payable to: <strong>{contractorName}</strong>
          </p>
          <p className="mt-1 text-sm text-gray-700">
            Reference claim number <strong>{claimNumber}</strong> on all correspondence.
          </p>
        </div>

        <Separator />

        {/* Print/Download Actions */}
        <div className="flex justify-end gap-2 print:hidden">
          <Button variant="outline" onClick={handlePrint} className="gap-2">
            <Printer className="h-4 w-4" />
            Print Invoice
          </Button>
          <Button variant="outline" onClick={handleDownloadPDF} className="gap-2">
            <Download className="h-4 w-4" />
            Download PDF
          </Button>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-gray-500">
          <p>
            This invoice is generated for insurance claim #{claimNumber} and represents the final
            depreciation recovery request.
          </p>
          <p className="mt-1">Thank you for your business.</p>
        </div>
      </CardContent>
    </Card>
  );
}
