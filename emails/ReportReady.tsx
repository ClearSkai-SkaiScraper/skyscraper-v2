/**
 * Report Ready Email — Sprint 4
 * Sent when a PDF report has been generated and is ready to download.
 */

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface ReportReadyProps {
  userName: string;
  reportTitle: string;
  claimNumber: string;
  propertyAddress: string;
  reportUrl?: string;
}

export function ReportReady({
  userName = "User",
  reportTitle = "Claims Report",
  claimNumber = "CLM-001234",
  propertyAddress = "123 Main St, Phoenix, AZ",
  reportUrl = "https://skaiscrape.com/reports/history",
}: ReportReadyProps) {
  return (
    <Html>
      <Head />
      <Preview>Your report is ready: {reportTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>📄 Report Ready!</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            Your report has been generated and is ready to view and download.
          </Text>
          <Section style={detailBox}>
            <Text style={detailRow}>
              <strong>Report:</strong> {reportTitle}
            </Text>
            <Text style={detailRow}>
              <strong>Claim #:</strong> {claimNumber}
            </Text>
            <Text style={detailRow}>
              <strong>Property:</strong> {propertyAddress}
            </Text>
          </Section>
          <Section style={btnContainer}>
            <Button style={button} href={reportUrl}>
              View Report →
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>SkaiScraper — The Roofing CRM That Fights For You™</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ReportReady;

const main = {
  backgroundColor: "#f6f9fc",
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", sans-serif',
};
const container = {
  backgroundColor: "#ffffff",
  margin: "0 auto",
  padding: "40px 20px",
  maxWidth: "560px",
  borderRadius: "8px",
};
const heading = {
  color: "#0A1A2F",
  fontSize: "24px",
  fontWeight: "700" as const,
  margin: "0 0 20px",
};
const text = { color: "#484848", fontSize: "16px", lineHeight: "26px", margin: "0 0 16px" };
const detailBox = {
  backgroundColor: "#f8fafc",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "16px 0",
  border: "1px solid #e2e8f0",
};
const detailRow = { color: "#484848", fontSize: "14px", lineHeight: "24px", margin: "4px 0" };
const btnContainer = { textAlign: "center" as const, margin: "24px 0" };
const button = {
  backgroundColor: "#117CFF",
  borderRadius: "6px",
  color: "#fff",
  fontSize: "16px",
  fontWeight: "600" as const,
  textDecoration: "none",
  padding: "12px 24px",
  display: "inline-block",
};
const hr = { borderColor: "#e6ebf1", margin: "30px 0 20px" };
const footer = { color: "#8898aa", fontSize: "12px", lineHeight: "16px" };
