import {
  Body,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";

interface WeeklySummaryProps {
  orgName: string;
  weekOf: string;
  stats: {
    newClaims: number;
    closedClaims: number;
    activeUsers: number;
    totalActivities: number;
    closeRate: number;
    avgCycleTimeDays: number;
  };
  topFeatures?: { name: string; count: number }[];
  dashboardUrl?: string;
}

export default function WeeklySummary({
  orgName = "Your Company",
  weekOf = "Feb 24, 2026",
  stats = {
    newClaims: 12,
    closedClaims: 8,
    activeUsers: 5,
    totalActivities: 234,
    closeRate: 67,
    avgCycleTimeDays: 14,
  },
  topFeatures = [
    { name: "Claims Created", count: 12 },
    { name: "Reports Generated", count: 8 },
    { name: "Photos Uploaded", count: 45 },
  ],
  dashboardUrl = "https://skaiscrape.com/analytics",
}: WeeklySummaryProps) {
  return (
    <Html>
      <Head />
      <Preview>
        Weekly Performance Summary for {orgName} — Week of {weekOf}
      </Preview>
      <Body style={styles.body}>
        <Container style={styles.container}>
          {/* Header */}
          <Section style={styles.header}>
            <Heading style={styles.headerTitle}>📊 Weekly Summary</Heading>
            <Text style={styles.headerSubtitle}>
              {orgName} — Week of {weekOf}
            </Text>
          </Section>

          {/* Key Metrics */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              Key Metrics
            </Heading>
            <table style={styles.metricsTable}>
              <tbody>
                <tr>
                  <td style={styles.metricCell}>
                    <Text style={styles.metricValue}>{stats.newClaims}</Text>
                    <Text style={styles.metricLabel}>New Claims</Text>
                  </td>
                  <td style={styles.metricCell}>
                    <Text style={styles.metricValue}>{stats.closedClaims}</Text>
                    <Text style={styles.metricLabel}>Closed</Text>
                  </td>
                  <td style={styles.metricCell}>
                    <Text style={styles.metricValue}>{stats.closeRate}%</Text>
                    <Text style={styles.metricLabel}>Close Rate</Text>
                  </td>
                  <td style={styles.metricCell}>
                    <Text style={styles.metricValue}>{stats.avgCycleTimeDays}d</Text>
                    <Text style={styles.metricLabel}>Avg Cycle</Text>
                  </td>
                </tr>
              </tbody>
            </table>
          </Section>

          {/* Team Activity */}
          <Section style={styles.section}>
            <Heading as="h2" style={styles.sectionTitle}>
              Team Activity
            </Heading>
            <Text style={styles.text}>
              <strong>{stats.activeUsers}</strong> active team members performed{" "}
              <strong>{stats.totalActivities}</strong> activities this week.
            </Text>
          </Section>

          {/* Top Features */}
          {topFeatures && topFeatures.length > 0 && (
            <Section style={styles.section}>
              <Heading as="h2" style={styles.sectionTitle}>
                Most Used Features
              </Heading>
              {topFeatures.map((feature) => (
                <Text key={feature.name} style={styles.featureRow}>
                  {feature.name}: <strong>{feature.count}</strong>
                </Text>
              ))}
            </Section>
          )}

          <Hr style={styles.hr} />

          {/* CTA */}
          <Section style={styles.ctaSection}>
            <Link href={dashboardUrl} style={styles.ctaButton}>
              View Full Dashboard →
            </Link>
          </Section>

          {/* Footer */}
          <Section style={styles.footer}>
            <Text style={styles.footerText}>
              Sent by SkaiScraper Pro · You&apos;re receiving this because you&apos;re an org admin.
            </Text>
            <Text style={styles.footerText}>
              <Link href="https://skaiscrape.com/settings/notifications" style={styles.link}>
                Manage notification preferences
              </Link>
            </Text>
          </Section>
        </Container>
      </Body>
    </Html>
  );
}

// ─── Styles ─────────────────────────────────────────────────────────────────

const styles = {
  body: {
    backgroundColor: "#f4f4f5",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    margin: "0",
    padding: "0",
  } as React.CSSProperties,
  container: {
    backgroundColor: "#ffffff",
    borderRadius: "12px",
    margin: "40px auto",
    maxWidth: "580px",
    overflow: "hidden",
  } as React.CSSProperties,
  header: {
    backgroundColor: "#4f46e5",
    padding: "32px 24px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  headerTitle: {
    color: "#ffffff",
    fontSize: "24px",
    fontWeight: "700",
    margin: "0",
  } as React.CSSProperties,
  headerSubtitle: {
    color: "#c7d2fe",
    fontSize: "14px",
    margin: "8px 0 0",
  } as React.CSSProperties,
  section: {
    padding: "24px",
  } as React.CSSProperties,
  sectionTitle: {
    color: "#18181b",
    fontSize: "16px",
    fontWeight: "600",
    margin: "0 0 12px",
  } as React.CSSProperties,
  text: {
    color: "#3f3f46",
    fontSize: "14px",
    lineHeight: "1.6",
    margin: "0",
  } as React.CSSProperties,
  metricsTable: {
    width: "100%",
    borderCollapse: "collapse" as const,
  } as React.CSSProperties,
  metricCell: {
    textAlign: "center" as const,
    padding: "12px 8px",
    backgroundColor: "#f9fafb",
    borderRadius: "8px",
  } as React.CSSProperties,
  metricValue: {
    color: "#4f46e5",
    fontSize: "24px",
    fontWeight: "700",
    margin: "0",
  } as React.CSSProperties,
  metricLabel: {
    color: "#6b7280",
    fontSize: "11px",
    textTransform: "uppercase" as const,
    letterSpacing: "0.5px",
    margin: "4px 0 0",
  } as React.CSSProperties,
  featureRow: {
    color: "#3f3f46",
    fontSize: "14px",
    margin: "4px 0",
    paddingLeft: "8px",
    borderLeft: "3px solid #e5e7eb",
  } as React.CSSProperties,
  hr: {
    borderColor: "#e5e7eb",
    margin: "0",
  } as React.CSSProperties,
  ctaSection: {
    padding: "24px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  ctaButton: {
    backgroundColor: "#4f46e5",
    borderRadius: "8px",
    color: "#ffffff",
    display: "inline-block",
    fontSize: "14px",
    fontWeight: "600",
    padding: "12px 24px",
    textDecoration: "none",
  } as React.CSSProperties,
  footer: {
    padding: "16px 24px 24px",
    textAlign: "center" as const,
  } as React.CSSProperties,
  footerText: {
    color: "#9ca3af",
    fontSize: "12px",
    margin: "4px 0",
  } as React.CSSProperties,
  link: {
    color: "#6366f1",
    textDecoration: "underline",
  } as React.CSSProperties,
};
