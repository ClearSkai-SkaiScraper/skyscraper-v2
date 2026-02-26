/**
 * Payment Failed Email — Sprint 4 (Dunning)
 * Sent when a Stripe payment fails / subscription becomes past_due.
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

interface PaymentFailedProps {
  userName: string;
  orgName: string;
  amount: string;
  failureReason: string;
  graceHoursRemaining: number;
  billingUrl?: string;
}

export function PaymentFailed({
  userName = "Admin",
  orgName = "Your Company",
  amount = "$80.00",
  failureReason = "Card declined",
  graceHoursRemaining = 72,
  billingUrl = "https://skaiscrape.com/billing",
}: PaymentFailedProps) {
  return (
    <Html>
      <Head />
      <Preview>
        ⚠️ Payment failed for {orgName} — action required within {graceHoursRemaining}h
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>⚠️ Payment Failed</Heading>
          <Text style={text}>Hi {userName},</Text>
          <Text style={text}>
            We were unable to process the payment of <strong>{amount}</strong> for your{" "}
            <strong>{orgName}</strong> SkaiScraper subscription.
          </Text>
          <Section style={warningBox}>
            <Text style={warningText}>
              <strong>Reason:</strong> {failureReason}
            </Text>
            <Text style={warningText}>
              You have <strong>{graceHoursRemaining} hours</strong> to update your payment method
              before your account is downgraded to the Free plan.
            </Text>
          </Section>
          <Text style={text}>
            Your team will lose access to AI analysis, advanced reports, custom branding, and other
            paid features if payment is not resolved.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={billingUrl}>
              Update Payment Method →
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>
            Need help? Reply to this email or contact support@skaiscrape.com
          </Text>
        </Container>
      </Body>
    </Html>
  );
}

export default PaymentFailed;

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
const warningBox = {
  backgroundColor: "#fff7ed",
  borderRadius: "8px",
  padding: "16px 20px",
  margin: "16px 0",
  border: "1px solid #fed7aa",
};
const warningText = { color: "#9a3412", fontSize: "14px", lineHeight: "22px", margin: "4px 0" };
const btnContainer = { textAlign: "center" as const, margin: "24px 0" };
const button = {
  backgroundColor: "#dc2626",
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
