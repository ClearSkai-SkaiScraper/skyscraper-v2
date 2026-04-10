// components/pdf/PageHeader.tsx

import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { getThemeColors } from "./SharedStyles";

interface PageHeaderProps {
  data: ReportData;
  titleOverride?: string;
}

export function PageHeader({ data, titleOverride }: PageHeaderProps) {
  const colors = getThemeColors(data);

  // User-requested layout: Logo LEFT | Company Info CENTER | Team Photo RIGHT
  return (
    <View style={[styles.container, { borderBottomColor: colors.primary }]}>
      {/* LEFT: Company Logo */}
      <View style={styles.leftSection}>
        {data.org.logoUrl && <Image src={data.org.logoUrl} style={styles.logo} />}
      </View>

      {/* CENTER: Company Name + Details + Page Title */}
      <View style={styles.centerSection}>
        <Text style={[styles.orgName, { color: colors.primary }]}>{data.org.name}</Text>
        {data.org.slogan && <Text style={styles.orgSlogan}>{data.org.slogan}</Text>}
        <Text style={[styles.title, { color: colors.primary }]}>
          {titleOverride || data.cover?.title || "Report"}
        </Text>
        <Text style={styles.meta}>
          Claim: {data.claim.claimNumber || "N/A"} • DOL:{" "}
          {data.claim.dateOfLoss ? new Date(data.claim.dateOfLoss).toLocaleDateString() : "N/A"}
        </Text>
      </View>

      {/* RIGHT: Team Photo / Agent Headshot */}
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <View style={styles.rightSection}>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {(data.org as any).teamPhotoUrl ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Image src={(data.org as any).teamPhotoUrl} style={styles.teamPhoto} />
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ) : (data.org as any).agentPhotoUrl ? (
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Image src={(data.org as any).agentPhotoUrl} style={styles.teamPhoto} />
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 2,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  leftSection: {
    width: 60,
    flexDirection: "row",
    alignItems: "center",
  },
  logo: {
    width: 50,
    height: 50,
    objectFit: "contain",
  },
  centerSection: {
    flex: 1,
    flexDirection: "column",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  orgName: {
    fontSize: 12,
    fontWeight: "bold",
    textAlign: "center",
  },
  orgSlogan: {
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
    marginBottom: 4,
  },
  title: {
    fontSize: 11,
    fontWeight: "bold",
    textAlign: "center",
  },
  meta: {
    fontSize: 8,
    color: "#64748b",
    textAlign: "center",
  },
  rightSection: {
    width: 60,
    flexDirection: "row",
    justifyContent: "flex-end",
    alignItems: "center",
  },
  teamPhoto: {
    width: 50,
    height: 50,
    borderRadius: 25,
    objectFit: "cover",
  },
});
