// =====================================================
// EMAIL: REPORT READY TEMPLATE (relocated to src/email-templates/)
// =====================================================
// Beautiful React Email for sending reports to clients
// =====================================================

import {
  Body,
  Button,
  Container,
  Html as EmailHtml,
  Head,
  Hr,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import * as React from "react";

type Props = {
  shareUrl: string; // public review/accept page
  pdfUrl: string; // signed direct download (expires)
  company?: string; // e.g., SkaiScraper
  recipientName?: string;
};

export default function ReportReadyEmail({
  shareUrl,
  pdfUrl,
  company = "SkaiScraper",
  recipientName,
}: Props) {
  const preview = "Your report is ready to review and accept.";

  return (
    <EmailHtml>
      <Head />
      <Preview>{preview}</Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          <Section style={{ marginBottom: 16 }}>
            <Text style={styles.h1}>{company}</Text>
            <Text style={styles.subtle}>Report Ready</Text>
          </Section>

          <Section style={{ marginBottom: 24 }}>
            <Text style={styles.p}>{recipientName ? `Hi ${recipientName},` : "Hi,"}</Text>
            <Text style={styles.p}>
              Your damage assessment report is ready. Please review the details and accept to
              proceed.
            </Text>
          </Section>

          <Section style={{ marginBottom: 18 }}>
            <Button href={shareUrl} style={styles.primaryBtn}>
              Review & Accept Report
            </Button>
          </Section>

          <Section style={{ marginBottom: 24 }}>
            <Text style={styles.p}>
              Prefer a PDF? This link expires automatically in 7 days:
              <br />
              <Link href={pdfUrl} style={styles.link}>
                Download PDF
              </Link>
            </Text>
          </Section>

          <Hr style={styles.hr} />

          <Section>
            <Text style={styles.muted}>
              If you have questions, reply to this email. You can also copy/paste the links:
              <br />
              Review: {shareUrl}
              <br />
              PDF: {pdfUrl}
            </Text>
          </Section>
        </Container>
      </Body>
    </EmailHtml>
  );
}

const styles: Record<string, React.CSSProperties> = {
  body: {
    background: "#0A0F1C",
    padding: "24px",
    fontFamily: "Inter, Arial, sans-serif",
  },
  container: {
    background: "#0F172A",
    borderRadius: 12,
    padding: 24,
    color: "#E2E8F0",
    maxWidth: 560,
  },
  h1: {
    fontSize: 20,
    fontWeight: 700,
    margin: 0,
    color: "#E2E8F0",
  },
  subtle: {
    fontSize: 12,
    color: "#94A3B8",
    marginTop: 4,
  },
  p: {
    fontSize: 14,
    lineHeight: "20px",
    margin: "0 0 12px",
  },
  primaryBtn: {
    display: "inline-block",
    background: "#117CFF",
    borderRadius: 10,
    padding: "12px 18px",
    color: "#fff",
    textDecoration: "none",
    fontWeight: 600,
  },
  link: {
    color: "#93C5FD",
    textDecoration: "underline",
  },
  hr: {
    borderColor: "#1F2937",
    margin: "18px 0",
  },
  muted: {
    fontSize: 12,
    color: "#94A3B8",
  },
};
