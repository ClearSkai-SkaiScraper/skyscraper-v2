// components/pdf/sections/ClientSnapshotSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function ClientSnapshotSection({ data }: { data: ReportData }) {
  const c = data.claim;

  // ✅ P4: Graceful fallback if contact missing
  const hasContact =
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    c && ((c as any).clientName || (c as any).clientPhone || (c as any).clientEmail);

  if (!hasContact) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="Client / Insured Information" />
        <Text style={baseStyles.value}>Contact information not available for this claim.</Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data} title="Client / Insured Information" />

      <View style={baseStyles.row}>
        <View style={baseStyles.col}>
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <Text style={baseStyles.label}>Name</Text>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Text style={baseStyles.value}>{(c as any).clientName || "N/A"}</Text>
        </View>
        <View style={baseStyles.col}>
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <Text style={baseStyles.label}>Phone</Text>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Text style={baseStyles.value}>{(c as any).clientPhone || "N/A"}</Text>
        </View>
        <View style={baseStyles.col}>
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <Text style={baseStyles.label}>Email</Text>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Text style={baseStyles.value}>{(c as any).clientEmail || "N/A"}</Text>
        </View>
      </View>

      <View style={{ marginTop: 8 }}>
        <Text style={baseStyles.label}>Service Address</Text>
        <Text style={baseStyles.value}>{c.propertyAddress}</Text>
      </View>
    </View>
  );
}
