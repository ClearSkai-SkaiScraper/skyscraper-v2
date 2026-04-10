// components/pdf/sections/AiSummaryRetailSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function AiSummaryRetailSection({ data }: { data: ReportData }) {
  const s = data.aiSummaryRetail || {};

  if (!data.aiSummaryRetail) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="Summary & Next Steps" />
        <Text style={baseStyles.value}>Retail summary has not been generated for this report.</Text>
      </View>
    );
  }

  return (
    // eslint-disable-next-line react/jsx-no-comment-textnodes
    <View style={baseStyles.section}>
      // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/jsx-no-comment-textnodes
      <SectionHeader data={data} title={(s as any).headline || "Summary & Next Steps"} />

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {(s as any).bullets?.length > 0 &&
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (s as any).bullets.map((b: string, idx: number) => (
          <Text key={idx} style={baseStyles.value}>
            • {b}
          </Text>
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        ))}

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {(s as any).bodyParagraph && (
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <View style={{ marginTop: 8 }}>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <Text style={baseStyles.value}>{(s as any).bodyParagraph}</Text>
        </View>
      )}
    </View>
  );
}
