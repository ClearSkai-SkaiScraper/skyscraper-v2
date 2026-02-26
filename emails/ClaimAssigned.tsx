/**
 * Claim Assigned Email — Sprint 4
 * Sent when a claim is assigned to a team member.
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

interface ClaimAssignedProps {
  assigneeName: string;
  claimNumber: string;
  propertyAddress: string;
  carrier: string;
  assignedBy: string;
  claimUrl?: string;
}

export function ClaimAssigned({
  assigneeName = "Team Member",
  claimNumber = "CLM-001234",
  propertyAddress = "123 Main St, Phoenix, AZ",
  carrier = "State Farm",
  assignedBy = "Admin",
  claimUrl = "https://skaiscrape.com/claims",
}: ClaimAssignedProps) {
  return (
    <Html>
      <Head />
      <Preview>
        New claim assigned: {claimNumber} at {propertyAddress}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>📋 Claim Assigned to You</Heading>
          <Text style={text}>Hi {assigneeName},</Text>
          <Text style={text}>
            <strong>{assignedBy}</strong> has assigned you a new claim:
          </Text>
          <Section style={detailBox}>
            <Text style={detailRow}>
              <strong>Claim #:</strong> {claimNumber}
            </Text>
            <Text style={detailRow}>
              <strong>Property:</strong> {propertyAddress}
            </Text>
            <Text style={detailRow}>
              <strong>Carrier:</strong> {carrier}
            </Text>
          </Section>
          <Section style={btnContainer}>
            <Button style={button} href={claimUrl}>
              View Claim →
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>SkaiScraper — The Roofing CRM That Fights For You™</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default ClaimAssigned;

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
