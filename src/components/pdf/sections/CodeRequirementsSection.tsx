// components/pdf/sections/CodeRequirementsSection.tsx

import { StyleSheet, Text, View } from "@react-pdf/renderer";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

const styles = StyleSheet.create({
  table: {
    width: "100%",
    marginTop: 8,
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    paddingVertical: 4,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderBottomWidth: 1,
    borderBottomColor: "#D1D5DB",
    paddingVertical: 6,
  },
  cellCode: {
    width: "20%",
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#1F2937",
    paddingRight: 4,
  },
  cellTrade: {
    width: "15%",
    fontSize: 8,
    color: "#6B7280",
    paddingRight: 4,
  },
  cellRequirement: {
    width: "50%",
    fontSize: 8,
    color: "#374151",
    paddingRight: 4,
  },
  cellCitation: {
    width: "15%",
    fontSize: 7,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  headerText: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#374151",
  },
  stateInfo: {
    backgroundColor: "#EFF6FF",
    padding: 8,
    marginBottom: 8,
    borderRadius: 4,
  },
  stateInfoRow: {
    flexDirection: "row",
    marginBottom: 2,
  },
  stateInfoLabel: {
    fontSize: 8,
    fontFamily: "Helvetica-Bold",
    color: "#117CFF",
    width: 100,
  },
  stateInfoValue: {
    fontSize: 8,
    color: "#1E3A8A",
    flex: 1,
  },
  badge: {
    fontSize: 7,
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 2,
    marginRight: 4,
    marginBottom: 2,
  },
  badgeHurricane: {
    backgroundColor: "#FEE2E2",
    color: "#991B1B",
  },
  badgeIce: {
    backgroundColor: "#DBEAFE",
    color: "#117CFF",
  },
  badgeSeismic: {
    backgroundColor: "#FEF3C7",
    color: "#92400E",
  },
  badgeFire: {
    backgroundColor: "#FFEDD5",
    color: "#C2410C",
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginTop: 4,
  },
  recommendation: {
    fontSize: 8,
    color: "#374151",
    marginBottom: 3,
    paddingLeft: 8,
  },
  recommendationsBox: {
    marginTop: 12,
    padding: 8,
    backgroundColor: "#F9FAFB",
    borderRadius: 4,
    borderLeftWidth: 3,
    borderLeftColor: "#3B82F6",
  },
});

interface CodeItem {
  code: string;
  title?: string;
  requirement?: string;
  summary?: string;
  citation?: string;
  trade?: string;
}

interface StateInfo {
  edition?: string;
  windZone?: string;
  seismicZone?: string;
  iceBarrier?: boolean;
  snowLoad?: boolean;
  fireZone?: boolean;
}

interface ComplianceData {
  codeRequirements?: CodeItem[];
  stateInfo?: StateInfo;
  recommendations?: string[];
  state?: string;
  codeEdition?: string;
}

export function CodeRequirementsSection({
  data,
}: {
  data: ComplianceData & Record<string, unknown>;
}) {
  const items = data.codeRequirements || [];
  const stateInfo = data.stateInfo;
  const recommendations = data.recommendations || [];
  const state = data.state || "";
  const codeEdition = data.codeEdition || stateInfo?.edition || "IRC 2021";

  // If no data at all, show placeholder
  if (!items.length && !stateInfo && !recommendations.length) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data as any} title="Code & Manufacturer Requirements" />
        <Text style={baseStyles.value}>
          No specific code/manufacturer requirements recorded for this report.
        </Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data as any} title="Building Code Compliance" />

      {/* State Info Box */}
      {(state || stateInfo) && (
        <View style={styles.stateInfo}>
          <View style={styles.stateInfoRow}>
            <Text style={styles.stateInfoLabel}>Jurisdiction:</Text>
            <Text style={styles.stateInfoValue}>{state || "—"}</Text>
          </View>
          <View style={styles.stateInfoRow}>
            <Text style={styles.stateInfoLabel}>Code Edition:</Text>
            <Text style={styles.stateInfoValue}>{codeEdition}</Text>
          </View>

          {/* Badges for special zones */}
          <View style={styles.badgesRow}>
            {stateInfo?.windZone === "hurricane" && (
              <Text style={[styles.badge, styles.badgeHurricane]}>🌀 Hurricane Zone</Text>
            )}
            {stateInfo?.iceBarrier && (
              <Text style={[styles.badge, styles.badgeIce]}>❄️ Ice Barrier Required</Text>
            )}
            {stateInfo?.seismicZone && ["C", "D", "E"].includes(stateInfo.seismicZone) && (
              <Text style={[styles.badge, styles.badgeSeismic]}>
                🌍 Seismic Zone {stateInfo.seismicZone}
              </Text>
            )}
            {stateInfo?.fireZone && (
              <Text style={[styles.badge, styles.badgeFire]}>🔥 Wildfire Zone</Text>
            )}
            {stateInfo?.snowLoad && (
              <Text style={[styles.badge, styles.badgeIce]}>❄️ Snow Load Zone</Text>
            )}
          </View>
        </View>
      )}

      {/* Code Requirements Table */}
      {items.length > 0 && (
        <View style={styles.table}>
          {/* Table Header */}
          <View style={styles.tableHeader}>
            <Text style={[styles.cellCode, styles.headerText]}>Code</Text>
            <Text style={[styles.cellTrade, styles.headerText]}>Trade</Text>
            <Text style={[styles.cellRequirement, styles.headerText]}>Requirement</Text>
            <Text style={[styles.cellCitation, styles.headerText]}>Citation</Text>
          </View>

          {/* Table Rows */}
          {items.map((item: CodeItem, idx: number) => (
            <View key={idx} style={styles.tableRow}>
              <Text style={styles.cellCode}>{item.code || "—"}</Text>
              <Text style={styles.cellTrade}>{item.trade || "General"}</Text>
              <Text style={styles.cellRequirement}>
                {item.requirement || item.summary || item.title || "—"}
              </Text>
              <Text style={styles.cellCitation}>{item.citation || "—"}</Text>
            </View>
          ))}
        </View>
      )}

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <View style={styles.recommendationsBox}>
          <Text style={[baseStyles.label, { marginBottom: 4 }]}>📋 Compliance Recommendations</Text>
          {recommendations.slice(0, 10).map((rec: string, idx: number) => (
            <Text key={idx} style={styles.recommendation}>
              • {rec}
            </Text>
          ))}
        </View>
      )}
    </View>
  );
}
