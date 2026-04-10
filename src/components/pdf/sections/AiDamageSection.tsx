// components/pdf/sections/AiDamageSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function AiDamageSection({ data }: { data: ReportData }) {
  const dmg = data.damage;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!dmg || !(dmg as any).photos || !(dmg as any).photos.length) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="AI Damage Documentation" />
        <Text style={baseStyles.value}>No damage photos analyzed.</Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data} title="AI Damage Documentation" />

      <View style={baseStyles.table}>
        <View style={baseStyles.tableRow}>
          <Text style={baseStyles.tableHeaderCell}>Location</Text>
          <Text style={baseStyles.tableHeaderCell}>Component</Text>
          <Text style={baseStyles.tableHeaderCell}>Severity</Text>
          <Text style={baseStyles.tableHeaderCell}>Cause</Text>
          <Text style={baseStyles.tableHeaderCell}>Recommendation</Text>
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        </View>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {((dmg as any).photos || []).map((p: any, idx: number) => (
          <View style={baseStyles.tableRow} key={idx}>
            <Text style={baseStyles.tableCell}>{p.location || "-"}</Text>
            <Text style={baseStyles.tableCell}>{p.component || "-"}</Text>
            <Text style={baseStyles.tableCell}>{p.severity || "-"}</Text>
            <Text style={baseStyles.tableCell}>{p.causeTag || "-"}</Text>
            <Text style={baseStyles.tableCell}>{p.recommendation || "-"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
