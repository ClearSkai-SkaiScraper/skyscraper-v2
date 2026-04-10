/**
 * PDF Document Generator for Artifacts
 * Generates React-PDF documents with proper JSX handling
 */

import { Document, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// These types were removed from @prisma/client — defined locally
type ArtifactStatus = "draft" | "generating" | "ready" | "error";
type ArtifactType = "report" | "proposal" | "invoice" | "letter";
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type UniversalTemplate = { id: string; name: string; sections: any[] };

interface PdfDocumentOptions {
  title: string;
  type: ArtifactType;
  version: number;
  status: ArtifactStatus;
  createdAt: Date;
  contentText?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  contentJson?: any;
  sourceTemplate?: UniversalTemplate | null;
  artifactId: string;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyLicense?: string;
  employeeName?: string;
}

// Helper functions
function formatArtifactType(type: string): string {
  return type
    .split("_")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

// PDF Styles
const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Helvetica",
    fontSize: 11,
    lineHeight: 1.6,
  },
  header: {
    marginBottom: 30,
    borderBottomWidth: 2,
    borderBottomColor: "#2563eb",
    paddingBottom: 15,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#117CFF",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 4,
  },
  date: {
    fontSize: 10,
    color: "#9ca3af",
  },
  statusBadge: {
    backgroundColor: "#dbeafe",
    padding: 8,
    borderRadius: 4,
    marginBottom: 20,
    alignSelf: "flex-start",
  },
  statusText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#117CFF",
  },
  content: {
    marginBottom: 40,
    flex: 1,
  },
  body: {
    fontSize: 11,
    lineHeight: 1.8,
    color: "#374151",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
    paddingTop: 15,
    marginTop: "auto",
  },
  footerText: {
    fontSize: 9,
    color: "#9ca3af",
    marginBottom: 4,
  },
  disclaimer: {
    fontSize: 8,
    color: "#dc2626",
    marginTop: 8,
    fontStyle: "italic",
  },
});

/**
 * Generate React-PDF Document for artifact export
 */
export function generatePdfDocument(options: PdfDocumentOptions) {
  const {
    title,
    type,
    version,
    status,
    createdAt,
    contentText,
    contentJson,
    sourceTemplate,
    artifactId,
    companyName,
    companyPhone,
    companyEmail,
    companyLicense,
    employeeName,
  } = options;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header with company branding */}
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {companyName && (
            <Text style={styles.subtitle}>
              {companyName}
              {companyLicense ? ` • Lic #${companyLicense}` : ""}
            </Text>
          )}
          {(companyPhone || companyEmail) && (
            <Text style={styles.date}>
              {[companyPhone, companyEmail].filter(Boolean).join(" • ")}
            </Text>
          )}
          <Text style={styles.subtitle}>
            {formatArtifactType(type)} • Version {version}
            {employeeName ? ` • Prepared by ${employeeName}` : ""}
          </Text>
          <Text style={styles.date}>
            Generated:{" "}
            {new Date(createdAt).toLocaleDateString("en-US", {
              month: "long",
              day: "numeric",
              year: "numeric",
            })}
          </Text>
        </View>

        {/* Status Badge */}
        <View style={styles.statusBadge}>
          <Text style={styles.statusText}>Status: {status}</Text>
        </View>

        {/* Content */}
        <View style={styles.content}>
          {contentText && <Text style={styles.body}>{contentText}</Text>}

          {!contentText && contentJson && (
            <Text style={styles.body}>{JSON.stringify(contentJson, null, 2)}</Text>
          )}

          {!contentText && !contentJson && (
            <Text style={styles.body}>No content available for this artifact.</Text>
          )}
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>Artifact ID: {artifactId}</Text>
          {sourceTemplate && <Text style={styles.footerText}>Template: {sourceTemplate.name}</Text>}
          <Text style={styles.footerText}>Exported: {new Date().toLocaleString()}</Text>
          <Text style={styles.disclaimer}>
            ⚠ AI can make mistakes — please read through the final report carefully before
            submission.
          </Text>
        </View>
      </Page>
    </Document>
  );
}
