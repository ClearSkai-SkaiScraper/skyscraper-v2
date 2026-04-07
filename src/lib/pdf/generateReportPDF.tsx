/**
 * UNIVERSAL CLAIMS REPORT PDF GENERATOR
 *
 * Generates PDF matching Adel Chahin format:
 * - 2-column photo layout
 * - Code citations under photos
 * - Bold blue headers (#147BFF)
 * - Company branding footer
 * - QR code to portal
 * - Page numbers bottom right
 *
 * MIGRATED: Now uses shared PDF components from pdfConfig.ts and components.tsx
 */

/* eslint-disable jsx-a11y/alt-text -- react-pdf Image component doesn't support alt prop */
// Import config for potential future use - keeping consistent style patterns
import "./pdfConfig";

import { Document, Font, Image } from "@react-pdf/renderer";
import QRCode from "qrcode";
import React from "react";

import { logger } from "@/lib/logger";

import {
  BulletList,
  CoverPage,
  DataTable,
  KeyValue,
  PDFPage,
  PhotoGrid,
  Section,
} from "./components";

// Register fonts
Font.register({
  family: "Inter",
  fonts: [
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2",
      fontWeight: 400,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2",
      fontWeight: 600,
    },
    {
      src: "https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2",
      fontWeight: 700,
    },
  ],
});

interface UniversalClaimsReport {
  coverPage: {
    contractorLogo?: string;
    contractorName: string;
    licenseNumber: string;
    phone: string;
    email: string;
    website: string;
    heroImage?: string;
    clientName: string;
    propertyAddress: string;
    claimNumber: string;
    dateOfLoss: string;
    inspectorName: string;
    inspectionDate: string;
  };
  executiveSummary: {
    stormEvent: string;
    roofCondition: string;
    conclusion: string;
  };
  damageSummary: {
    functionalDamage: string;
    manufacturerIssues: string;
    codeViolations: string;
    safetyHazards: string;
  };
  damagePhotos: Array<{
    url: string;
    caption: string;
    applicableCode: string;
  }>;
  weatherVerification: {
    dateOfLoss: string;
    hailSize: string;
    windSpeed: string;
    noaaReports: string[];
    radarLoopUrls: string[];
    proximityToAddress: string;
  };
  codeCompliance: Array<{
    code: string;
    requirement: string;
    observed: string;
    failed: boolean;
    correction: string;
  }>;
  systemFailure: {
    roofDeck: string;
    underlayment: string;
    flashing: string;
    shingles: string;
    ventilation: string;
    drainage: string;
    ancillary: string;
  };
  scopeOfWork: Array<{
    item: string;
    quantity: string;
    unit: string;
  }>;
  professionalOpinion: {
    stormCausation: string;
    functionalImpairment: string;
    codeViolation: string;
    safetyHazard: string;
    weatheringContribution: string;
    preexistingDamage: string;
    recommendation: string;
  };
  signatures: {
    inspectorName: string;
    inspectorTitle: string;
    inspectorSignature?: string;
    date: string;
  };
}

// Keeping interface for potential future component use
interface _PDFGeneratorProps {
  report: UniversalClaimsReport;
  portalUrl: string;
}

async function generateQRCode(url: string): Promise<string> {
  try {
    return await QRCode.toDataURL(url);
  } catch (error) {
    logger.error("QR generation error:", error);

    // Capture to Sentry (non-critical)
    if (typeof window === "undefined") {
      const Sentry = await import("@sentry/nextjs");
      Sentry.captureException(error, {
        tags: { subsystem: "pdf", operation: "qr_generation" },
        level: "warning",
      });
    }

    return "";
  }
}

export async function generateReportPDF(
  report: UniversalClaimsReport,
  portalUrl: string
): Promise<React.ReactElement> {
  const qrCodeDataUrl = await generateQRCode(portalUrl);

  return (
    <Document>
      {/* COVER PAGE */}
      <CoverPage
        companyLogo={report.coverPage.contractorLogo}
        companyName={report.coverPage.contractorName}
        companyInfo={{
          license: report.coverPage.licenseNumber,
          phone: report.coverPage.phone,
          email: report.coverPage.email,
          website: report.coverPage.website,
        }}
        reportTitle="UNIVERSAL CLAIMS REPORT"
        clientName={report.coverPage.clientName}
        propertyAddress={report.coverPage.propertyAddress}
        claimNumber={report.coverPage.claimNumber}
        dateOfLoss={report.coverPage.dateOfLoss}
        inspectorName={report.coverPage.inspectorName}
        inspectionDate={report.coverPage.inspectionDate}
        qrCodeUrl={qrCodeDataUrl}
        heroImage={report.coverPage.heroImage}
      />

      {/* SECTION 1: EXECUTIVE SUMMARY */}
      <PDFPage
        pageNumber={2}
        companyName={report.coverPage.contractorName}
        companyLogo={report.coverPage.contractorLogo}
      >
        <Section title="EXECUTIVE SUMMARY" numbered sectionNumber={1} theme="proposal">
          <KeyValue label="Storm Event" value={report.executiveSummary.stormEvent} />
          <KeyValue label="Roof Condition" value={report.executiveSummary.roofCondition} />
          <KeyValue label="Conclusion" value={report.executiveSummary.conclusion} />
        </Section>
      </PDFPage>

      {/* SECTION 2: DAMAGE SUMMARY */}
      <PDFPage
        pageNumber={3}
        companyName={report.coverPage.contractorName}
        companyLogo={report.coverPage.contractorLogo}
      >
        <Section title="DAMAGE SUMMARY" numbered sectionNumber={2} theme="proposal">
          <KeyValue label="Functional Damage" value={report.damageSummary.functionalDamage} />
          <KeyValue label="Manufacturer Issues" value={report.damageSummary.manufacturerIssues} />
          <KeyValue label="Code Violations" value={report.damageSummary.codeViolations} />
          <KeyValue label="Safety Hazards" value={report.damageSummary.safetyHazards} />
        </Section>
      </PDFPage>

      {/* SECTION 3: DAMAGE PHOTO DOCUMENTATION */}
      {renderPhotoPages(report)}

      {/* SECTION 5: WEATHER VERIFICATION */}
      <PDFPage
        pageNumber={4 + Math.ceil(report.damagePhotos.length / 4)}
        companyName={report.coverPage.contractorName}
        companyLogo={report.coverPage.contractorLogo}
      >
        <Section title="WEATHER VERIFICATION" numbered sectionNumber={5} theme="proposal">
          <DataTable
            columns={[
              { header: "Date of Loss", key: "dateOfLoss", width: "33%" },
              { header: "Hail Size", key: "hailSize", width: "33%" },
              { header: "Wind Speed", key: "windSpeed", width: "34%" },
            ]}
            data={[
              {
                dateOfLoss: report.weatherVerification.dateOfLoss,
                hailSize: report.weatherVerification.hailSize,
                windSpeed: report.weatherVerification.windSpeed,
              },
            ]}
          />

          {report.weatherVerification.noaaReports.length > 0 && (
            <>
              <KeyValue label="NOAA Storm Reports" value="" />
              <BulletList items={report.weatherVerification.noaaReports} />
            </>
          )}

          <KeyValue
            label="Proximity Analysis"
            value={report.weatherVerification.proximityToAddress}
          />

          {report.weatherVerification.radarLoopUrls.length > 0 && (
            <>
              <KeyValue label="Radar Imagery" value="" />
              <BulletList items={report.weatherVerification.radarLoopUrls} />
            </>
          )}
        </Section>
      </PDFPage>

      {/* SECTION 6: CODE COMPLIANCE */}
      <PDFPage
        pageNumber={5 + Math.ceil(report.damagePhotos.length / 4)}
        companyName={report.coverPage.contractorName}
        companyLogo={report.coverPage.contractorLogo}
      >
        <Section title="CODE COMPLIANCE ANALYSIS" numbered sectionNumber={6} theme="proposal">
          {report.codeCompliance.map((item, i) => (
            <React.Fragment key={i}>
              <KeyValue label={item.code} value="" />
              <KeyValue label="Requirement" value={item.requirement} />
              <KeyValue label="Observed" value={item.observed} />
              {item.failed && <KeyValue label="Status" value={`FAILED - ${item.correction}`} />}
            </React.Fragment>
          ))}
        </Section>
      </PDFPage>

      {/* SECTION 7: SYSTEM FAILURE ANALYSIS */}
      <PDFPage
        pageNumber={6 + Math.ceil(report.damagePhotos.length / 4)}
        companyName={report.coverPage.contractorName}
        companyLogo={report.coverPage.contractorLogo}
      >
        <Section title="SYSTEM FAILURE ANALYSIS" numbered sectionNumber={7} theme="proposal">
          <KeyValue label="Roof Deck" value={report.systemFailure.roofDeck} />
          <KeyValue label="Underlayment" value={report.systemFailure.underlayment} />
          <KeyValue label="Flashing" value={report.systemFailure.flashing} />
          <KeyValue label="Shingles/Surface Material" value={report.systemFailure.shingles} />
          <KeyValue label="Ventilation" value={report.systemFailure.ventilation} />
          <KeyValue label="Drainage" value={report.systemFailure.drainage} />
          <KeyValue label="Ancillary Components" value={report.systemFailure.ancillary} />
        </Section>
      </PDFPage>

      {/* SECTION 8: SCOPE OF WORK */}
      <PDFPage
        pageNumber={7 + Math.ceil(report.damagePhotos.length / 4)}
        companyName={report.coverPage.contractorName}
        companyLogo={report.coverPage.contractorLogo}
      >
        <Section title="SCOPE OF WORK" numbered sectionNumber={8} theme="proposal">
          <DataTable
            columns={[
              { header: "Item", key: "item", width: "60%" },
              { header: "Quantity", key: "quantity", width: "20%" },
              { header: "Unit", key: "unit", width: "20%" },
            ]}
            data={report.scopeOfWork}
          />
        </Section>
      </PDFPage>

      {/* SECTION 9: PROFESSIONAL OPINION */}
      <PDFPage
        pageNumber={8 + Math.ceil(report.damagePhotos.length / 4)}
        companyName={report.coverPage.contractorName}
        companyLogo={report.coverPage.contractorLogo}
      >
        <Section title="PROFESSIONAL OPINION" numbered sectionNumber={9} theme="proposal">
          <KeyValue label="Storm Causation" value={report.professionalOpinion.stormCausation} />
          <KeyValue
            label="Functional Impairment"
            value={report.professionalOpinion.functionalImpairment}
          />
          <KeyValue
            label="Code Violation Impact"
            value={report.professionalOpinion.codeViolation}
          />
          <KeyValue
            label="Safety Hazard Assessment"
            value={report.professionalOpinion.safetyHazard}
          />
          <KeyValue
            label="Weathering Contribution"
            value={report.professionalOpinion.weatheringContribution}
          />
          <KeyValue
            label="Pre-existing Damage"
            value={report.professionalOpinion.preexistingDamage}
          />
          <KeyValue label="Recommendation" value={report.professionalOpinion.recommendation} />
        </Section>
      </PDFPage>

      {/* SECTION 10: SIGNATURES */}
      <PDFPage
        pageNumber={9 + Math.ceil(report.damagePhotos.length / 4)}
        companyName={report.coverPage.contractorName}
        companyLogo={report.coverPage.contractorLogo}
      >
        <Section title="SIGNATURES & CERTIFICATIONS" numbered sectionNumber={10} theme="proposal">
          {report.signatures.inspectorSignature && (
            <Image
              src={report.signatures.inspectorSignature}
              style={{ width: 200, height: 80, marginBottom: 10 }}
            />
          )}
          <KeyValue label="Inspector" value={report.signatures.inspectorName} />
          <KeyValue label="Title" value={report.signatures.inspectorTitle} />
          <KeyValue label="Date" value={report.signatures.date} />

          <KeyValue
            label="Disclaimer"
            value="This report represents the professional opinion of the inspector based on visual observation and available data at the time of inspection. All findings are subject to verification by licensed professionals in relevant disciplines."
          />
        </Section>
      </PDFPage>
    </Document>
  );
}

// Render photo pages in 2-column layout using PhotoGrid component
function renderPhotoPages(report: UniversalClaimsReport): React.ReactElement[] {
  const pages: React.ReactElement[] = [];
  const photos = report.damagePhotos;
  let pageNumber = 4;

  // Group photos into sets of 4 (2 rows x 2 columns per page)
  for (let i = 0; i < photos.length; i += 4) {
    const pagePhotos = photos.slice(i, i + 4).map((photo) => ({
      imageUrl: photo.url,
      caption: photo.caption,
      code: photo.applicableCode,
    }));

    pages.push(
      <PDFPage
        key={`photos-${i}`}
        pageNumber={pageNumber++}
        companyName={report.coverPage.contractorName}
        companyLogo={report.coverPage.contractorLogo}
      >
        <Section title="DAMAGE PHOTO DOCUMENTATION" numbered sectionNumber={3} theme="proposal">
          <PhotoGrid photos={pagePhotos} />
        </Section>
      </PDFPage>
    );
  }

  return pages;
}
