// =====================================================
// ACCEPTANCE RECEIPT PDF GENERATOR
// =====================================================
// Creates timestamped, legally-valid PDF receipts
// Uses @react-pdf/renderer for production-quality output
// =====================================================

import { Document, Page, pdf, StyleSheet,Text, View } from "@react-pdf/renderer";
import * as Sentry from "@sentry/nextjs";
import React from "react";

import { logger } from "@/lib/logger";

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontSize: 12,
    fontFamily: "Helvetica",
  },
  h1: {
    fontSize: 18,
    marginBottom: 12,
    fontWeight: "bold",
  },
  h2: {
    fontSize: 14,
    marginBottom: 8,
    marginTop: 16,
    fontWeight: "bold",
  },
  row: {
    marginBottom: 6,
    flexDirection: "row",
  },
  label: {
    width: 120,
    color: "#666",
  },
  value: {
    flex: 1,
    color: "#000",
  },
  mono: {
    fontFamily: "Courier",
    fontSize: 10,
  },
  box: {
    marginTop: 16,
    padding: 12,
    border: 1,
    borderColor: "#999",
    borderRadius: 4,
  },
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTop: 1,
    borderColor: "#ddd",
    fontSize: 10,
    color: "#666",
  },
  watermark: {
    position: "absolute",
    top: 20,
    right: 20,
    fontSize: 8,
    color: "#ccc",
    transform: "rotate(45deg)",
  },
});

export interface AcceptanceReceiptInput {
  orgName: string;
  reportId: string;
  clientName?: string;
  clientEmail?: string;
  acceptedAt: Date;
  address?: string;
  ip?: string;
  userAgent?: string;
  claimNumber?: string;
  estimatedValue?: string;
}

/**
 * Generate acceptance receipt PDF as Buffer
 * @param input - Receipt data
 * @returns PDF Buffer for Supabase Storage upload
 */
export async function buildAcceptanceReceiptPDF(input: AcceptanceReceiptInput): Promise<Buffer> {
  const {
    orgName,
    reportId,
    clientName,
    clientEmail,
    acceptedAt,
    address,
    ip,
    userAgent,
    claimNumber,
    estimatedValue,
  } = input;

  const formattedDate = acceptedAt.toLocaleString("en-US", {
    dateStyle: "full",
    timeStyle: "long",
  });

  const receiptDoc = (
    <Document>
      <Page size="A4" style={styles.page}>
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        {/* Watermark */}
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        <Text style={styles.watermark as any}>OFFICIAL RECEIPT</Text>

        {/* Header */}
        <Text style={styles.h1}>Report Acceptance Receipt</Text>

        {/* Organization Info */}
        <View style={styles.row}>
          <Text style={styles.label}>Organization:</Text>
          <Text style={styles.value}>{orgName}</Text>
        </View>

        {/* Report Details */}
        <Text style={styles.h2}>Report Information</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Report ID:</Text>
          <Text style={styles.value}>{reportId}</Text>
        </View>
        {claimNumber && (
          <View style={styles.row}>
            <Text style={styles.label}>Claim Number:</Text>
            <Text style={styles.value}>{claimNumber}</Text>
          </View>
        )}
        {address && (
          <View style={styles.row}>
            <Text style={styles.label}>Property:</Text>
            <Text style={styles.value}>{address}</Text>
          </View>
        )}
        {estimatedValue && (
          <View style={styles.row}>
            <Text style={styles.label}>Estimated Value:</Text>
            <Text style={styles.value}>{estimatedValue}</Text>
          </View>
        )}

        {/* Client Details */}
        <Text style={styles.h2}>Client Acceptance</Text>
        <View style={styles.row}>
          <Text style={styles.label}>Client Name:</Text>
          <Text style={styles.value}>{clientName || "Not provided"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Client Email:</Text>
          <Text style={styles.value}>{clientEmail || "Not provided"}</Text>
        </View>
        <View style={styles.row}>
          <Text style={styles.label}>Accepted At:</Text>
          <Text style={styles.value}>{formattedDate}</Text>
        </View>

        {/* Security Footprint */}
        <View style={styles.box}>
          <Text style={{ fontSize: 12, marginBottom: 6, fontWeight: "bold" }}>
            Security Verification
          </Text>
          <View style={styles.row}>
            <Text style={styles.label}>IP Address:</Text>
            <Text style={styles.value}>{ip || "Not recorded"}</Text>
          </View>
          <View style={styles.row}>
            // eslint-disable-next-line react/jsx-no-comment-textnodes
            <Text style={styles.label}>User Agent:</Text>
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            <Text style={{ ...styles.value, ...styles.mono } as any}>
              {userAgent ? userAgent.substring(0, 80) : "Not recorded"}
            </Text>
          </View>
        </View>

        {/* Legal Footer */}
        <View style={styles.footer}>
          <Text>
            This PDF certifies that the client accepted the report as of the timestamp above.
          </Text>
          <Text style={{ marginTop: 4 }}>Generated: {new Date().toISOString()}</Text>
          <Text style={{ marginTop: 4 }}>
            Document ID: {reportId}-receipt-{Date.now()}
          </Text>
        </View>
      </Page>
    </Document>
  );

  try {
    // Render to Buffer
    const stream = await pdf(receiptDoc).toBlob();
    const arrayBuffer = await stream.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    return buffer;
  } catch (error) {
    logger.error("PDF generation error:", error);
    Sentry.captureException(error, {
      tags: { component: "pdf-generation" },
      extra: { reportId, orgName },
    });
    throw error;
  }
}

/**
 * Generate receipt filename
 */
export function getReceiptFilename(reportId: string): string {
  const timestamp = new Date().toISOString().split("T")[0];
  return `acceptance-receipt-${reportId}-${timestamp}.pdf`;
}
