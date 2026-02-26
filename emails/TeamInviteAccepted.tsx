/**
 * Team Invite Accepted Email — Sprint 4
 * Sent when a team member accepts their invitation.
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

interface TeamInviteAcceptedProps {
  inviterName: string;
  memberName: string;
  memberEmail: string;
  orgName: string;
  dashboardUrl?: string;
}

export function TeamInviteAccepted({
  inviterName = "Team Admin",
  memberName = "New Member",
  memberEmail = "member@example.com",
  orgName = "Your Company",
  dashboardUrl = "https://skaiscrape.com/dashboard",
}: TeamInviteAcceptedProps) {
  return (
    <Html>
      <Head />
      <Preview>
        {memberName} has joined {orgName} on SkaiScraper
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={heading}>🎉 Team Member Joined!</Heading>
          <Text style={text}>Hi {inviterName},</Text>
          <Text style={text}>
            Great news! <strong>{memberName}</strong> ({memberEmail}) has accepted your invitation
            and joined <strong>{orgName}</strong> on SkaiScraper.
          </Text>
          <Text style={text}>
            They now have access to your organization&apos;s projects, claims, and pipeline. You can
            manage their role and permissions from the Team settings page.
          </Text>
          <Section style={btnContainer}>
            <Button style={button} href={dashboardUrl}>
              View Team →
            </Button>
          </Section>
          <Hr style={hr} />
          <Text style={footer}>SkaiScraper — The Roofing CRM That Fights For You™</Text>
        </Container>
      </Body>
    </Html>
  );
}

export default TeamInviteAccepted;

// ── Styles ────────────────────────────────────────────────────
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
