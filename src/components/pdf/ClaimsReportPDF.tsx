/* eslint-disable react/jsx-no-comment-textnodes, @typescript-eslint/no-explicit-any */
// components/pdf/ClaimsReportPDF.tsx

import { Document, Page } from "@react-pdf/renderer";

import { ReportData, ReportSectionId } from "@/lib/reports/types";

import { PageFooter } from "./PageFooter";
import { PageHeader } from "./PageHeader";
import { AiDamageSection } from "./sections/AiDamageSection";
import { AiSummaryClaimSection } from "./sections/AiSummaryClaimSection";
import { ClaimSnapshotSection } from "./sections/ClaimSnapshotSection";
import { ClientSnapshotSection } from "./sections/ClientSnapshotSection";
import { CodeRequirementsSection } from "./sections/CodeRequirementsSection";
import { CoverPage } from "./sections/CoverPage";
import { DepreciationSection } from "./sections/DepreciationSection";
import { EstimateSection } from "./sections/EstimateSection";
import { MapsAndPhotosSection } from "./sections/MapsAndPhotosSection";
import { MaterialsSection } from "./sections/MaterialsSection";
import { OcrDocsSection } from "./sections/OcrDocsSection";
import { TimelineSection } from "./sections/TimelineSection";
import { WarrantySection } from "./sections/WarrantySection";
import { WeatherFullSection } from "./sections/WeatherFullSection";
import { WeatherQuickSection } from "./sections/WeatherQuickSection";
import { baseStyles } from "./SharedStyles";

interface Props {
  data: ReportData;
  sections: ReportSectionId[];
}

export function ClaimsReportPDF({ data, sections }: Props) {
  return (
    <Document>
      {/* COVER PAGE */}
      {sections.includes("COVER") && (
        <Page size="A4" style={baseStyles.page}>
          <CoverPage data={data} />
          <PageFooter data={data} />
        </Page>
      )}

      {/* CLAIM + CLIENT SNAPSHOT */}
      {(sections.includes("CLAIM_SNAPSHOT") || sections.includes("CLIENT_SNAPSHOT")) && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader data={data} titleOverride="Claim & Insured Overview" />
          {sections.includes("CLAIM_SNAPSHOT") && <ClaimSnapshotSection data={data} />}
          {sections.includes("CLIENT_SNAPSHOT") && <ClientSnapshotSection data={data} />}
          <PageFooter data={data} />
        </Page>
      )}

      {/* MAPS + PHOTOS */}
      {sections.includes("MAPS_AND_PHOTOS") && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader data={data} titleOverride="Maps & Property Photos" />
          <MapsAndPhotosSection data={data} />
          <PageFooter data={data} />
        </Page>
      )}

      {/* WEATHER */}
      {(sections.includes("WEATHER_QUICK_DOL") || sections.includes("WEATHER_FULL")) && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader data={data} titleOverride="Weather Verification" />
          {sections.includes("WEATHER_QUICK_DOL") && <WeatherQuickSection data={data} />}
          {sections.includes("WEATHER_FULL") && <WeatherFullSection data={data} />}
          <PageFooter data={data} />
        </Page>
      )}

      {/* AI DAMAGE */}
      {sections.includes("AI_DAMAGE") && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader data={data} titleOverride="AI Damage Documentation" />
          <AiDamageSection data={data} />
          <PageFooter data={data} />
        </Page>
      )}

      {/* ESTIMATE + DEPRECIATION */}
      {(sections.includes("ESTIMATE_INITIAL") ||
        sections.includes("ESTIMATE_SUPPLEMENT") ||
        sections.includes("DEPRECIATION")) && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader data={data} titleOverride="Estimate & Depreciation" />
          <EstimateSection data={data} sections={sections} />
          {sections.includes("DEPRECIATION") && <DepreciationSection data={data} />}
          <PageFooter data={data} />
        </Page>
      )}

      {/* MATERIALS + CODE */}
      {(sections.includes("MATERIALS") || sections.includes("CODE_REQUIREMENTS")) && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader data={data} titleOverride="Materials & Code Requirements" />
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          {sections.includes("MATERIALS") && <MaterialsSection data={data} />}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {sections.includes("CODE_REQUIREMENTS") && <CodeRequirementsSection data={data as any} />}
          <PageFooter data={data} />
        </Page>
      )}

      {/* WARRANTY + TIMELINE */}
      {(sections.includes("WARRANTY_DETAILS") || sections.includes("TIMELINE")) && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader data={data} titleOverride="Warranty & Project Timeline" />
          {sections.includes("WARRANTY_DETAILS") && <WarrantySection data={data} />}
          {sections.includes("TIMELINE") && <TimelineSection data={data} />}
          <PageFooter data={data} />
        </Page>
      )}

      {/* OCR DOCS */}
      {sections.includes("OCR_DOCS") && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader data={data} titleOverride="Supporting Documents" />
          <OcrDocsSection data={data} />
          <PageFooter data={data} />
        </Page>
      )}

      {/* AI CLAIM SUMMARY */}
      {sections.includes("AI_SUMMARY_CLAIM") && (
        <Page size="A4" style={baseStyles.page}>
          <PageHeader data={data} titleOverride="Executive Claim Summary" />
          <AiSummaryClaimSection data={data} />
          <PageFooter data={data} />
        </Page>
      )}
    </Document>
  );
}
