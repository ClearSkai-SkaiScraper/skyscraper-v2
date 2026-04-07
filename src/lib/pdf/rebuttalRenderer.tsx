/**
 * Rebuttal PDF Renderer
 *
 * React-PDF component for rebuttal letter documents.
 * Red theme, letter format with professional business styling.
 *
 * MIGRATED: Now uses shared PDF components from pdfConfig.ts and components.tsx
 */

/* eslint-disable jsx-a11y/alt-text -- react-pdf Image component doesn't support alt prop */
import { Document, Image, Text, View } from "@react-pdf/renderer";

import {
  BulletList,
  CoverPage,
  Paragraph,
  PDFPage,
  PhotoGrid,
  Section,
  SummaryBox,
} from "./components";
import { WeatherVerificationPage } from "./components/WeatherVerificationPage";
import { colors, formatDate, spacing, typography } from "./pdfConfig";

export type EvidenceAssetForPDF = {
  id: string;
  signedUrl: string;
  title?: string;
  originalName: string;
};

export type WeatherDataForPDF = {
  maxWindGustMph?: number | null;
  maxSustainedWindMph?: number | null;
  maxHailInches?: number | null;
  precipitationIn?: number | null;
  snowfallIn?: number | null;
  sourceLabel: string;
  fetchedAt: Date;
  provider: string;
  eventStart: Date;
  eventEnd: Date;
};

export type RebuttalPDFData = {
  rebuttalName: string;
  propertyAddress: string;
  lossDate: string;
  lossType: string;
  policyNumber?: string;
  carrier: string;
  adjusterName?: string;
  generatedAt: Date;
  sections: Array<{ title: string; content: string }>;
  attachments?: string[];
  orgName: string;
  brandLogoUrl?: string;
  orgContactInfo?: {
    address?: string;
    phone?: string;
    email?: string;
  };
  evidenceAssets?: EvidenceAssetForPDF[]; // Optional evidence photos with signed URLs
  weatherData?: WeatherDataForPDF; // Optional weather verification
};

export function RebuttalPDFDocument({ data }: { data: RebuttalPDFData }) {
  const {
    rebuttalName,
    propertyAddress,
    lossDate,
    lossType,
    policyNumber,
    carrier,
    adjusterName,
    generatedAt,
    sections,
    attachments,
    orgName,
    brandLogoUrl,
    orgContactInfo,
    evidenceAssets,
    weatherData,
  } = data;

  // Split content into bullet points if it contains line breaks
  const renderContent = (content: string) => {
    const lines = content.split("\n").filter((line) => line.trim());

    if (lines.length > 3 && lines.some((line) => line.trim().startsWith("-"))) {
      return <BulletList items={lines.map((line) => line.replace(/^-\s*/, ""))} />;
    }

    return <Paragraph>{content}</Paragraph>;
  };

  return (
    <Document>
      {/* Cover Page */}
      <CoverPage
        companyLogo={brandLogoUrl}
        companyName={orgName}
        reportTitle={rebuttalName}
        reportSubtitle="Claim Denial Response"
        clientName={`Property: ${propertyAddress}`}
        propertyAddress={`Loss Date: ${lossDate}`}
        claimNumber={policyNumber ? `Policy: ${policyNumber}` : `Carrier: ${carrier}`}
        dateOfLoss={`Loss Type: ${lossType}`}
        inspectorName={`Generated: ${formatDate(generatedAt)}`}
      />

      {/* Letter Pages */}
      <PDFPage pageNumber={2} companyName={orgName} companyLogo={brandLogoUrl}>
        {/* Letterhead */}
        <View
          style={{
            marginBottom: spacing.xl,
            paddingBottom: spacing.md,
            borderBottomWidth: 2,
            borderBottomColor: colors.rebuttal.primary,
          }}
        >
          {brandLogoUrl && (
            <Image src={brandLogoUrl} style={{ width: 50, height: 50, marginBottom: spacing.sm }} />
          )}
          <Text style={{ ...typography.h3, color: colors.gray900 }}>{orgName}</Text>
          {orgContactInfo && (
            <>
              {orgContactInfo.address && (
                <Text style={{ ...typography.caption, color: colors.gray600 }}>
                  {orgContactInfo.address}
                </Text>
              )}
              {orgContactInfo.phone && (
                <Text style={{ ...typography.caption, color: colors.gray600 }}>
                  Phone: {orgContactInfo.phone}
                </Text>
              )}
              {orgContactInfo.email && (
                <Text style={{ ...typography.caption, color: colors.gray600 }}>
                  Email: {orgContactInfo.email}
                </Text>
              )}
            </>
          )}
        </View>

        {/* Date */}
        <Paragraph>{formatDate(generatedAt)}</Paragraph>

        {/* Recipient */}
        <View style={{ marginBottom: spacing.lg }}>
          <Text style={{ ...typography.body, marginBottom: spacing.xs }}>{carrier}</Text>
          {adjusterName && (
            <Text style={{ ...typography.body, marginBottom: spacing.xs }}>
              Attn: {adjusterName}
            </Text>
          )}
          <Text style={{ ...typography.body }}>Claims Department</Text>
        </View>

        {/* Subject Line */}
        <SummaryBox theme="error">
          <Text
            style={{ ...typography.label, color: colors.rebuttal.dark, marginBottom: spacing.xs }}
          >
            RE:
          </Text>
          <Text style={{ ...typography.body }}>
            Rebuttal - {lossType} Loss at {propertyAddress}
          </Text>
          {policyNumber && (
            <Text style={{ ...typography.body }}>Policy Number: {policyNumber}</Text>
          )}
        </SummaryBox>

        {/* First sections (up to 2 on first page) */}
        {sections.slice(0, 2).map((section, idx) => (
          <Section key={idx} title={section.title} theme="rebuttal">
            {renderContent(section.content)}
          </Section>
        ))}
      </PDFPage>

      {/* Continuation Pages */}
      {sections.slice(2).map((section, sectionIdx) => (
        <PDFPage
          key={sectionIdx}
          pageNumber={sectionIdx + 3}
          companyName={orgName}
          companyLogo={brandLogoUrl}
        >
          <Section title={section.title} theme="rebuttal">
            {renderContent(section.content)}
          </Section>

          {/* Signature on last section */}
          {sectionIdx === sections.slice(2).length - 1 && (
            <View style={{ marginTop: spacing.xl }}>
              <Paragraph>Respectfully submitted,</Paragraph>
              <Paragraph bold>{orgName}</Paragraph>
              <Paragraph>Claims Advocacy Team</Paragraph>
            </View>
          )}
        </PDFPage>
      ))}

      {/* Attachments Page (if any) */}
      {attachments && attachments.length > 0 && (
        <PDFPage pageNumber={sections.length + 2} companyName={orgName} companyLogo={brandLogoUrl}>
          <SummaryBox title="Attachments" theme="error">
            <BulletList items={attachments} />
          </SummaryBox>
        </PDFPage>
      )}

      {/* Evidence Pages (if provided) */}
      {evidenceAssets && evidenceAssets.length > 0 && (
        <PDFPage
          pageNumber={sections.length + (attachments && attachments.length > 0 ? 3 : 2)}
          companyName={orgName}
          companyLogo={brandLogoUrl}
        >
          <Section title="Evidence Photos" theme="rebuttal">
            <Paragraph>
              {evidenceAssets.length} photo{evidenceAssets.length !== 1 ? "s" : ""} attached
            </Paragraph>
            <PhotoGrid
              photos={evidenceAssets.map((asset) => ({
                imageUrl: asset.signedUrl,
                caption: asset.title || asset.originalName,
              }))}
            />
          </Section>
        </PDFPage>
      )}

      {/* Weather Verification Page */}
      {weatherData && (
        <WeatherVerificationPage weatherData={weatherData} propertyAddress={propertyAddress} />
      )}
    </Document>
  );
}
