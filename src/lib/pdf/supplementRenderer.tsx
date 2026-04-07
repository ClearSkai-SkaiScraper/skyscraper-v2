/**
 * Supplement PDF Renderer
 *
 * React-PDF component for supplement documents.
 * Orange theme, includes variance table and pricing comparisons.
 *
 * MIGRATED: Now uses shared PDF components from pdfConfig.ts and components.tsx
 */

import { Document, Text, View } from "@react-pdf/renderer";

import { Variance } from "@/lib/delta/computeDelta";

import {
  CoverPage,
  DataTable,
  Paragraph,
  PDFPage,
  PhotoGrid,
  Section,
  SummaryBox,
} from "./components";
import { WeatherVerificationPage } from "./components/WeatherVerificationPage";
import { formatCurrency, formatDate, truncateText } from "./pdfConfig";

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

export type SupplementPDFData = {
  supplementName: string;
  propertyAddress: string;
  lossDate: string;
  lossType: string;
  generatedAt: Date;
  variances: Variance[];
  sections: Array<{ title: string; content: string }>;
  totalDelta: number;
  orgName: string;
  brandLogoUrl?: string;
  evidenceAssets?: EvidenceAssetForPDF[]; // Optional evidence photos with signed URLs
  weatherData?: WeatherDataForPDF; // Optional weather verification
};

export function SupplementPDFDocument({ data }: { data: SupplementPDFData }) {
  const {
    supplementName,
    propertyAddress,
    lossDate,
    lossType,
    generatedAt,
    variances,
    sections,
    totalDelta,
    orgName,
    brandLogoUrl,
    evidenceAssets,
    weatherData,
  } = data;

  return (
    <Document>
      {/* Cover Page */}
      <CoverPage
        companyLogo={brandLogoUrl}
        companyName={orgName}
        reportTitle={supplementName}
        reportSubtitle="Scope Variance Analysis"
        clientName={`Property: ${propertyAddress}`}
        propertyAddress={`Loss Date: ${lossDate}`}
        claimNumber={`Loss Type: ${lossType}`}
        dateOfLoss={`Generated: ${formatDate(generatedAt)}`}
        inspectorName={`Total Delta: ${formatCurrency(totalDelta)}`}
      />

      {/* Variance Table Page */}
      <PDFPage pageNumber={2} companyName={orgName} companyLogo={brandLogoUrl}>
        <Section title="Scope Variances" theme="supplement">
          <DataTable
            columns={[
              { header: "Description", key: "description", width: "30%" },
              { header: "Type", key: "kind", width: "15%" },
              { header: "Adjuster", key: "adjusterTotal", width: "20%" },
              { header: "Contractor", key: "contractorTotal", width: "20%" },
              { header: "Delta", key: "delta", width: "15%" },
            ]}
            data={variances.slice(0, 30).map((v) => ({
              description: truncateText(v.description, 40),
              kind: v.kind,
              adjusterTotal: v.adjuster ? formatCurrency(v.adjuster.total) : "N/A",
              contractorTotal: v.contractor ? formatCurrency(v.contractor.total) : "N/A",
              delta: formatCurrency(v.deltaTotal),
            }))}
          />

          <SummaryBox title="Variance Summary" theme="warning">
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>Total Variances:</Text>
              <Text style={{ fontWeight: "bold" }}>{variances.length}</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text>Total Delta:</Text>
              <Text style={{ fontWeight: "bold" }}>{formatCurrency(totalDelta)}</Text>
            </View>
          </SummaryBox>
        </Section>
      </PDFPage>

      {/* Section Pages */}
      {sections.map((section, sectionIdx) => (
        <PDFPage
          key={sectionIdx}
          pageNumber={sectionIdx + 3}
          companyName={orgName}
          companyLogo={brandLogoUrl}
        >
          <Section title={section.title} theme="supplement">
            <Paragraph>{section.content}</Paragraph>
          </Section>
        </PDFPage>
      ))}

      {/* Evidence Pages (if provided) */}
      {evidenceAssets && evidenceAssets.length > 0 && (
        <PDFPage pageNumber={sections.length + 3} companyName={orgName} companyLogo={brandLogoUrl}>
          <Section title="Evidence Photos" theme="supplement">
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
