/**
 * PDF Document Component
 * React-PDF base document structure
 */

/* eslint-disable jsx-a11y/alt-text -- react-pdf Image component doesn't support alt prop */
import { Document, Font, Image, Page, StyleSheet, Text, View } from "@react-pdf/renderer";

// Register fonts
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2",
      fontWeight: "bold",
    },
  ],
});

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: "Inter",
    fontSize: 11,
    lineHeight: 1.5,
  },
  header: {
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 14,
    color: "#64748b",
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 10,
    color: "#0f172a",
  },
  text: {
    marginBottom: 8,
  },
  footer: {
    position: "absolute",
    bottom: 30,
    left: 40,
    right: 40,
    textAlign: "center",
    color: "#94a3b8",
    fontSize: 9,
  },
  pageNumber: {
    position: "absolute",
    bottom: 30,
    right: 40,
    fontSize: 9,
    color: "#94a3b8",
  },
});

export interface PdfDocumentProps {
  title: string;
  sections: Array<{
    key: string;
    content: string | { paragraphs?: string[] } | Record<string, unknown>;
  }>;
  branding?: {
    logoUrl?: string;
    companyName?: string;
  };
  signatures?: Array<{
    signerName: string;
    signerEmail: string;
    role: string;
    signedAt: string;
    checksum: string;
  }>;
}

export function PdfDocument({ title, sections, branding }: PdfDocumentProps) {
  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {branding?.logoUrl && (
            <Image src={branding.logoUrl} style={{ height: 40, marginBottom: 10 }} />
          )}
          <Text style={styles.title}>{title}</Text>
          {branding?.companyName && <Text style={styles.subtitle}>{branding.companyName}</Text>}
        </View>

        {sections.map((section, _index) => (
          <View key={section.key} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.key.replace(/_/g, " ").toUpperCase()}</Text>
            {renderSectionContent(section.content)}
          </View>
        ))}

        <Text
          style={styles.pageNumber}
          render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`}
          fixed
        />
      </Page>
    </Document>
  );
}

type SectionContent = string | { paragraphs?: string[] } | Record<string, unknown>;

function renderSectionContent(content: SectionContent) {
  if (typeof content === "string") {
    return <Text style={styles.text}>{content}</Text>;
  }

  // Type guard for paragraphs
  const contentObj = content as { paragraphs?: string[] };
  if (Array.isArray(contentObj.paragraphs)) {
    return contentObj.paragraphs.map((p: string, i: number) => (
      <Text key={i} style={styles.text}>
        {p}
      </Text>
    ));
  }

  return <Text style={styles.text}>{JSON.stringify(content, null, 2)}</Text>;
}
