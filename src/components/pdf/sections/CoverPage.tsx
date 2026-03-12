// components/pdf/sections/CoverPage.tsx

import { Image, StyleSheet, Text, View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { getThemeColors } from "../SharedStyles";

export function CoverPage({ data }: { data: ReportData }) {
  const { org, claim, cover } = data;
  const colors = getThemeColors(data);

  return (
    <View style={styles.container}>
      {/* HEADER: Logo LEFT | Company Info CENTER | Team Photo RIGHT */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          {org.logoUrl && <Image style={styles.logo} src={org.logoUrl} />}
        </View>
        <View style={styles.headerCenter}>
          <Text style={[styles.orgName, { color: colors.primary }]}>{org.name}</Text>
          {(org.slogan || org.motto) && (
            <Text style={styles.orgSlogan}>{org.slogan || org.motto}</Text>
          )}
          {org.phone && <Text style={styles.orgContact}>{org.phone}</Text>}
          {org.website && <Text style={styles.orgContact}>{org.website}</Text>}
        </View>
        <View style={styles.headerRight}>
          {(org as any).teamPhotoUrl ? (
            <Image src={(org as any).teamPhotoUrl} style={styles.teamPhoto} />
          ) : (org as any).agentPhotoUrl ? (
            <Image src={(org as any).agentPhotoUrl} style={styles.teamPhoto} />
          ) : null}
        </View>
      </View>

      {/* TITLE */}
      <Text style={[styles.title, { color: colors.primary }]}>{cover?.title || "Report"}</Text>
      <Text style={styles.subtitle}>{(cover as any)?.subtitle || ""}</Text>

      {/* INFO BLOCK */}
      <View style={styles.infoBlock}>
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Insured / Client</Text>
            <Text style={styles.infoValue}>{(claim as any).clientName || "N/A"}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Carrier / Claim #</Text>
            <Text style={styles.infoValue}>
              {(claim as any).carrier || "N/A"} • {claim.claimNumber || "N/A"}
            </Text>
          </View>
        </View>
        <View style={styles.infoRow}>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Property Address</Text>
            <Text style={styles.infoValue}>{claim.propertyAddress}</Text>
          </View>
          <View style={styles.infoCol}>
            <Text style={styles.infoLabel}>Date of Loss</Text>
            <Text style={styles.infoValue}>
              {claim.dateOfLoss ? new Date(claim.dateOfLoss).toLocaleDateString() : "N/A"}
            </Text>
          </View>
        </View>
      </View>

      {/* PROPERTY PHOTOS */}
      <View style={styles.photoRow}>
        {(cover as any)?.frontPhotoUrl && (
          <Image src={(cover as any).frontPhotoUrl} style={styles.photo} />
        )}
        {(cover as any)?.aerialPhotoUrl && (
          <Image src={(cover as any).aerialPhotoUrl} style={styles.photo} />
        )}
      </View>

      {/* FOOTER */}
      <View style={styles.footer}>
        <Text style={styles.footerLine}>
          Generated on{" "}
          {cover?.createdAt
            ? new Date(cover.createdAt).toLocaleDateString()
            : new Date().toLocaleDateString()}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 30,
    paddingHorizontal: 40,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingBottom: 12,
    borderBottomWidth: 2,
    borderBottomColor: "#e2e8f0",
  },
  headerLeft: {
    width: 80,
  },
  logo: {
    width: 70,
    height: 70,
    objectFit: "contain",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    paddingHorizontal: 16,
  },
  orgName: {
    fontSize: 16,
    fontWeight: "bold",
    textAlign: "center",
  },
  orgSlogan: {
    fontSize: 10,
    color: "#64748b",
    textAlign: "center",
    marginTop: 2,
  },
  orgContact: {
    fontSize: 9,
    color: "#64748b",
    textAlign: "center",
  },
  headerRight: {
    width: 80,
    alignItems: "flex-end",
  },
  teamPhoto: {
    width: 70,
    height: 70,
    borderRadius: 35,
    objectFit: "cover",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
    marginTop: 8,
  },
  subtitle: {
    fontSize: 12,
    textAlign: "center",
    color: "#64748b",
    marginBottom: 20,
  },
  infoBlock: {
    marginBottom: 20,
    backgroundColor: "#f8fafc",
    padding: 12,
    borderRadius: 4,
  },
  infoRow: {
    flexDirection: "row",
    marginBottom: 8,
  },
  infoCol: {
    flex: 1,
    paddingHorizontal: 4,
  },
  infoLabel: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#64748b",
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
  },
  photoRow: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 12,
    gap: 16,
  },
  photo: {
    width: 200,
    height: 140,
    objectFit: "cover",
    borderRadius: 4,
  },
  footer: {
    marginTop: 24,
    fontSize: 9,
    textAlign: "center",
  },
  footerLine: {
    fontSize: 8,
    color: "#94a3b8",
  },
});
