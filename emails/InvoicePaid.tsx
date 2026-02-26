/**
 * Invoice Paid Email — Sprint 4
 * Sent when an invoice is marked as paid / payment confirmed.
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

interface InvoicePaidProps {
  recipientName: string;
  invoiceNumber: string;
  amount: string;
  projectTitle: string;
  paidDate: string;
  invoiceUrl?: string;
}

export function InvoicePaid({
  recipientName = "Contractor",
  invoiceNumber = "INV-001234",
  amount = "$12,500.00",
  projectTitle = "Roof Replacement — 123 Main St",
  paidDate = "January 15, 2025",
  invoiceUrl = "https://skaiscrape.com/invoices",
}: InvoicePaidProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Payment received: {invoiceNumber} — {amount}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>💰 Payment Received!</Heading>
          <Text style={text}>Hi {recipientName},</Text>
          <Text style={text}>Great news! Payment has been confirmed for your invoice.</Text>
          <Section style={detailBox}>
            <Text style={detailRow}>
              <strong>Invoice #:</strong> {invoiceNumber}
            </Text>
            <Text style={detailRow}>
              <strong>Amount:</strong> {amount}
            </Text>
            <Text style={detailRow}>
              <strong>Project:</strong> {projectTitle}
            </Text>
            <Text style={detailRow}>
              <strong>Paid on:</strong> {paidDate}
            </Text>
          </Section>
          <Section style={btnContainer}>
            <Button style={button} href={invoiceUrl}>
              View Invoice →
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>SkaiScraper — The Roofing CRM That Fights For You™</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default InvoicePaid;

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
  backgroundColor: "#f0fdf4",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "16px 0",
  border: "1px solid #bbf7d0",
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
