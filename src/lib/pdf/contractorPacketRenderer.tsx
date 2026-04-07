/* eslint-disable jsx-a11y/alt-text -- react-pdf Image component doesn't support alt prop */
import { Document, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";
import React from "react";

// ============================================================================
// PDF STYLES
// ============================================================================

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 11,
    fontFamily: "Helvetica",
    backgroundColor: "#ffffff",
  },
  header: {
    marginBottom: 30,
    borderBottom: "2 solid #16a34a",
    paddingBottom: 15,
  },
  logo: {
    width: 120,
    height: 40,
    marginBottom: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 12,
    color: "#64748b",
    marginBottom: 4,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#15803d",
    marginBottom: 12,
    paddingBottom: 6,
    borderBottom: "1 solid #cbd5e1",
  },
  sectionContent: {
    fontSize: 11,
    color: "#334155",
    lineHeight: 1.6,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    fontSize: 9,
    color: "#94a3b8",
    textAlign: "center",
    borderTop: "1 solid #e2e8f0",
    paddingTop: 10,
  },
  coverPage: {
    display: "flex",
    flexDirection: "column",
    justifyContent: "center",
    alignItems: "center",
    minHeight: "100%",
  },
  coverTitle: {
    fontSize: 32,
    fontWeight: "bold",
    color: "#1e293b",
    marginBottom: 20,
    textAlign: "center",
  },
  coverSubtitle: {
    fontSize: 16,
    color: "#64748b",
    marginBottom: 40,
    textAlign: "center",
  },
  badge: {
    backgroundColor: "#dcfce7",
    color: "#15803d",
    padding: "4 12",
    borderRadius: 4,
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 20,
  },
});

// ============================================================================
// TYPES
// ============================================================================

export interface ContractorPacketPDFData {
  packetName: string;
  sections: string[];
  exportFormat: string;
  generatedAt: string;
  sectionContents: Array<{
    sectionKey: string;
    content: Record<string, unknown> | string | null;
  }>;
  orgName?: string;
  brandLogoUrl?: string;
}

// ============================================================================
// PDF DOCUMENT COMPONENT
// ============================================================================

export const ContractorPacketPDFDocument: React.FC<{
  data: ContractorPacketPDFData;
}> = ({ data }) => {
  const {
    packetName,
    sections,
    exportFormat,
    generatedAt,
    sectionContents,
    orgName,
    brandLogoUrl,
  } = data;

  const formatSectionTitle = (key: string): string => {
    return key
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const renderSectionContent = (content: Record<string, unknown> | string | null): string => {
    if (typeof content === "string") {
      return content;
    }
    if (typeof content === "object" && content !== null) {
      return JSON.stringify(content, null, 2);
    }
    return String(content);
  };

  return (
    <Document>
      {/* Cover Page */}
      <Page size="A4" style={styles.page}>
        <View style={styles.coverPage}>
          {brandLogoUrl && <Image src={brandLogoUrl} style={styles.logo} />}

          <Text style={styles.badge}>CONTRACTOR PACKET</Text>

          <Text style={styles.coverTitle}>{packetName}</Text>

          <Text style={styles.coverSubtitle}>
            Generated: {new Date(generatedAt).toLocaleDateString()}
          </Text>

          <Text style={styles.subtitle}>Format: {exportFormat.toUpperCase()}</Text>

          {orgName && <Text style={styles.subtitle}>{orgName}</Text>}
        </View>

        <Text style={styles.footer}>Contractor Packet • Powered by SkaiScraper</Text>
      </Page>

      {/* Table of Contents */}
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {brandLogoUrl && <Image src={brandLogoUrl} style={styles.logo} />}
          <Text style={styles.title}>Table of Contents</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Sections Included</Text>
          {sections.map((sectionKey, index) => (
            <Text key={index} style={styles.sectionContent}>
              {index + 1}. {formatSectionTitle(sectionKey)}
            </Text>
          ))}
        </View>

        <Text style={styles.footer}>Page 2 • Table of Contents</Text>
      </Page>

      {/* Content Sections */}
      {sectionContents.map((section, index) => (
        <Page key={index} size="A4" style={styles.page}>
          <View style={styles.header}>
            {brandLogoUrl && <Image src={brandLogoUrl} style={styles.logo} />}
            <Text style={styles.title}>{packetName}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{formatSectionTitle(section.sectionKey)}</Text>
            <Text style={styles.sectionContent}>{renderSectionContent(section.content)}</Text>
          </View>

          <Text style={styles.footer}>
            Page {index + 3} • {formatSectionTitle(section.sectionKey)}
          </Text>
        </Page>
      ))}
    </Document>
  );
};
