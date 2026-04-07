/**
 * Enhanced PDF Page Components
 *
 * Reusable components with proper pagination, typography, and spacing.
 * Use these instead of raw React-PDF components for consistency.
 */

/* eslint-disable jsx-a11y/alt-text -- react-pdf Image component doesn't support alt prop */
import { Image, Page, Text, View } from "@react-pdf/renderer";
import { ReactNode } from "react";

import {
  baseStyles,
  colors,
  coverStyles,
  formatPageNumber,
  pageConfig,
  photoGridStyles,
  spacing,
  tableStyles,
  typography,
} from "./pdfConfig";

// ============================================================
// PAGE WRAPPER
// ============================================================

interface PDFPageProps {
  children: ReactNode;
  showFooter?: boolean;
  showPageNumber?: boolean;
  pageNumber?: number;
  totalPages?: number;
  companyName?: string;
  companyLogo?: string;
}

/**
 * Standard page with consistent margins and optional footer/page numbers
 */
export function PDFPage({
  children,
  showFooter = true,
  showPageNumber = true,
  pageNumber,
  totalPages,
  companyName,
  companyLogo,
}: PDFPageProps) {
  return (
    <Page size={pageConfig.size} style={baseStyles.page}>
      {/* Main content */}
      <View>{children}</View>

      {/* Footer (company info) */}
      {showFooter && (
        <View style={baseStyles.footer}>
          {companyLogo ? (
            <Image src={companyLogo} style={{ width: 80, height: 30 }} />
          ) : (
            <Text style={{ fontSize: typography.caption.fontSize, color: colors.gray600 }}>
              {companyName || ""}
            </Text>
          )}
          <Text style={{ fontSize: typography.caption.fontSize, color: colors.gray600 }}>
            Generated on {new Date().toLocaleDateString()}
          </Text>
        </View>
      )}

      {/* Page number */}
      {showPageNumber && pageNumber && (
        <View style={baseStyles.pageNumber}>
          <Text>{formatPageNumber(pageNumber, totalPages)}</Text>
        </View>
      )}
    </Page>
  );
}

// ============================================================
// COVER PAGE
// ============================================================

interface CoverPageProps {
  companyLogo?: string;
  companyName: string;
  companyInfo?: {
    license?: string;
    phone?: string;
    email?: string;
    website?: string;
  };
  reportTitle: string;
  reportSubtitle?: string;
  clientName: string;
  propertyAddress: string;
  claimNumber?: string;
  dateOfLoss?: string;
  inspectorName?: string;
  inspectionDate?: string;
  qrCodeUrl?: string;
  heroImage?: string;
}

/**
 * Professional cover page with branding and QR code
 */
export function CoverPage({
  companyLogo,
  companyName,
  companyInfo,
  reportTitle,
  reportSubtitle,
  clientName,
  propertyAddress,
  claimNumber,
  dateOfLoss,
  inspectorName,
  inspectionDate,
  qrCodeUrl,
  heroImage,
}: CoverPageProps) {
  return (
    <Page size={pageConfig.size} style={coverStyles.coverPage}>
      {/* Company branding */}
      {companyLogo && <Image src={companyLogo} style={coverStyles.companyLogo} />}
      <Text style={coverStyles.companyName}>{companyName}</Text>

      {companyInfo && (
        <View style={{ alignItems: "center" }}>
          {companyInfo.license && (
            <Text style={coverStyles.companyInfo}>License: {companyInfo.license}</Text>
          )}
          {companyInfo.phone && <Text style={coverStyles.companyInfo}>{companyInfo.phone}</Text>}
          {companyInfo.email && <Text style={coverStyles.companyInfo}>{companyInfo.email}</Text>}
          {companyInfo.website && (
            <Text style={coverStyles.companyInfo}>{companyInfo.website}</Text>
          )}
        </View>
      )}

      {/* Hero image */}
      {heroImage && (
        <Image
          src={heroImage}
          style={{
            width: 450,
            height: 280,
            marginTop: spacing.xl,
            marginBottom: spacing.lg,
            borderRadius: 8,
          }}
        />
      )}

      {/* Report title */}
      <Text style={coverStyles.reportTitle}>{reportTitle}</Text>
      {reportSubtitle && (
        <Text style={[coverStyles.companyInfo, { fontSize: 14, marginBottom: spacing.md }]}>
          {reportSubtitle}
        </Text>
      )}

      {/* Client/property information */}
      <View style={{ marginTop: spacing.lg }}>
        <Text style={coverStyles.clientInfo}>Client: {clientName}</Text>
        <Text style={coverStyles.clientInfo}>Property: {propertyAddress}</Text>
        {claimNumber && <Text style={coverStyles.clientInfo}>Claim #: {claimNumber}</Text>}
        {dateOfLoss && <Text style={coverStyles.clientInfo}>Date of Loss: {dateOfLoss}</Text>}
        {inspectorName && <Text style={coverStyles.clientInfo}>Inspector: {inspectorName}</Text>}
        {inspectionDate && (
          <Text style={coverStyles.clientInfo}>Inspection Date: {inspectionDate}</Text>
        )}
      </View>

      {/* QR code */}
      {qrCodeUrl && (
        <View style={coverStyles.qrCodeContainer}>
          <Image src={qrCodeUrl} style={coverStyles.qrCode} />
          <Text style={coverStyles.qrCodeLabel}>Scan for Live Portal</Text>
        </View>
      )}
    </Page>
  );
}

// ============================================================
// SECTION COMPONENTS
// ============================================================

interface SectionProps {
  title: string;
  children: ReactNode;
  numbered?: boolean;
  sectionNumber?: number;
  theme?: "standard" | "supplement" | "rebuttal" | "proposal";
}

/**
 * Section with proper heading and spacing
 */
export function Section({
  title,
  children,
  numbered,
  sectionNumber,
  theme = "standard",
}: SectionProps) {
  const themeColors = {
    standard: colors.primary,
    supplement: colors.supplement.primary,
    rebuttal: colors.rebuttal.primary,
    proposal: colors.proposal.primary,
  };

  const headerText = numbered && sectionNumber ? `${sectionNumber}. ${title}` : title;

  return (
    <View style={baseStyles.section}>
      <Text style={[baseStyles.sectionHeader, { color: themeColors[theme] }]}>{headerText}</Text>
      {children}
    </View>
  );
}

/**
 * Subsection (h3 level)
 */
export function Subsection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={{ marginTop: spacing.md, marginBottom: spacing.md }}>
      <Text style={baseStyles.subsectionHeader}>{title}</Text>
      {children}
    </View>
  );
}

/**
 * Paragraph with proper spacing
 */
export function Paragraph({ children, bold }: { children: ReactNode; bold?: boolean }) {
  return (
    <Text style={[baseStyles.paragraph, ...(bold ? [{ fontWeight: 600 }] : [])]}>{children}</Text>
  );
}

/**
 * Key-value pair (bold label + value)
 */
export function KeyValue({ label, value }: { label: string; value: string }) {
  return (
    <Text style={baseStyles.paragraph}>
      <Text style={baseStyles.label}>{label}: </Text>
      <Text>{value}</Text>
    </Text>
  );
}

/**
 * Divider line
 */
export function Divider() {
  return <View style={baseStyles.divider} />;
}

// ============================================================
// PHOTO GRID COMPONENTS
// ============================================================

interface PhotoWithCaptionProps {
  imageUrl: string;
  caption: string;
  code?: string;
}

/**
 * Single photo with caption and optional code citation
 * Automatically handles page breaks to keep photo + caption together
 */
export function PhotoWithCaption({ imageUrl, caption, code }: PhotoWithCaptionProps) {
  return (
    <View style={photoGridStyles.photoColumn}>
      <Image src={imageUrl} style={photoGridStyles.photoImage} />
      <Text style={photoGridStyles.photoCaption}>{caption}</Text>
      {code && <Text style={photoGridStyles.photoCode}>{code}</Text>}
    </View>
  );
}

/**
 * Two-column photo layout (2 photos side-by-side)
 * Keeps both photos together on same page
 */
export function PhotoRow({ photos }: { photos: [PhotoWithCaptionProps, PhotoWithCaptionProps] }) {
  return (
    <View style={photoGridStyles.photoRow}>
      <PhotoWithCaption {...photos[0]} />
      <PhotoWithCaption {...photos[1]} />
    </View>
  );
}

/**
 * Render photos in pairs (2 per row)
 * Automatically handles odd number of photos
 */
export function PhotoGrid({ photos }: { photos: PhotoWithCaptionProps[] }) {
  const rows: JSX.Element[] = [];

  for (let i = 0; i < photos.length; i += 2) {
    if (i + 1 < photos.length) {
      // Two photos (pair)
      rows.push(<PhotoRow key={i} photos={[photos[i], photos[i + 1]]} />);
    } else {
      // Single photo (odd one out)
      rows.push(
        <View key={i} style={photoGridStyles.photoRow}>
          <PhotoWithCaption {...photos[i]} />
          <View style={photoGridStyles.photoColumn} /> {/* Empty spacer */}
        </View>
      );
    }
  }

  return <>{rows}</>;
}

// ============================================================
// TABLE COMPONENTS
// ============================================================

interface TableColumn {
  header: string;
  key: string;
  width?: number | string;
  align?: "left" | "center" | "right";
}

interface TableProps {
  columns: TableColumn[];
  data: Record<string, string | number | null | undefined>[];
  striped?: boolean;
}

/**
 * Data table with headers and rows
 * Supports striped rows and custom column widths
 */
export function DataTable({ columns, data, striped = true }: TableProps) {
  return (
    <View style={tableStyles.table}>
      {/* Header row */}
      <View style={tableStyles.tableHeader}>
        {columns.map((col) => (
          <Text
            key={col.key}
            style={[
              tableStyles.tableHeaderCell,
              { width: col.width || "auto", textAlign: col.align || "left" },
            ]}
          >
            {col.header}
          </Text>
        ))}
      </View>

      {/* Data rows */}
      {data.map((row, index) => (
        <View
          key={index}
          style={[
            tableStyles.tableRow,
            ...(striped && index % 2 === 1 ? [tableStyles.tableRowAlt] : []),
          ]}
        >
          {columns.map((col) => (
            <Text
              key={col.key}
              style={[
                tableStyles.tableCell,
                { width: col.width || "auto", textAlign: col.align || "left" },
              ]}
            >
              {row[col.key] ?? "-"}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
}

/**
 * Simple key-value table (2 columns)
 */
export function KeyValueTable({ data }: { data: Array<{ label: string; value: string }> }) {
  return (
    <DataTable
      columns={[
        { header: "Field", key: "label", width: "40%" },
        { header: "Value", key: "value", width: "60%" },
      ]}
      data={data}
      striped
    />
  );
}

// ============================================================
// SUMMARY BOX COMPONENTS
// ============================================================

interface SummaryBoxProps {
  title?: string;
  children: ReactNode;
  theme?: "info" | "success" | "warning" | "error";
}

/**
 * Highlighted summary box (colored background + border)
 */
export function SummaryBox({ title, children, theme = "info" }: SummaryBoxProps) {
  const themeColors = {
    info: { bg: colors.proposal.light, border: colors.primary },
    success: { bg: "#f0fdf4", border: colors.success },
    warning: { bg: "#fffbeb", border: colors.warning },
    error: { bg: "#fef2f2", border: colors.error },
  };

  const { bg, border } = themeColors[theme];

  return (
    <View
      style={{
        backgroundColor: bg,
        padding: spacing.md,
        borderLeftWidth: 4,
        borderLeftColor: border,
        borderRadius: 4,
        marginVertical: spacing.md,
      }}
    >
      {title && (
        <Text
          style={{
            ...typography.h4,
            color: colors.gray900,
            marginBottom: spacing.sm,
          }}
        >
          {title}
        </Text>
      )}
      {children}
    </View>
  );
}

// ============================================================
// BULLET LIST COMPONENT
// ============================================================

/**
 * Bulleted list with proper indentation
 */
export function BulletList({ items }: { items: string[] }) {
  return (
    <View style={{ marginLeft: spacing.md }}>
      {items.map((item, index) => (
        <View key={index} style={{ flexDirection: "row", marginBottom: spacing.xs }}>
          <Text style={[baseStyles.paragraph, { marginRight: spacing.sm }]}>•</Text>
          <Text style={baseStyles.paragraph}>{item}</Text>
        </View>
      ))}
    </View>
  );
}

/**
 * Numbered list
 */
export function NumberedList({ items }: { items: string[] }) {
  return (
    <View style={{ marginLeft: spacing.md }}>
      {items.map((item, index) => (
        <View key={index} style={{ flexDirection: "row", marginBottom: spacing.xs }}>
          <Text style={[baseStyles.paragraph, { marginRight: spacing.sm, fontWeight: 600 }]}>
            {index + 1}.
          </Text>
          <Text style={baseStyles.paragraph}>{item}</Text>
        </View>
      ))}
    </View>
  );
}
