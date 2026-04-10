// components/pdf/sections/DepreciationSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function DepreciationSection({ data }: { data: ReportData }) {
  const dep = data.depreciation;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!dep || !Array.isArray(dep) || (dep as any).items?.length === 0) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="Depreciation" />
        <Text style={baseStyles.value}>No depreciation items included.</Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data} title="Depreciation (RCV → ACV)" />

      <View style={baseStyles.table}>
        <View style={baseStyles.tableRow}>
          <Text style={baseStyles.tableHeaderCell}>Item</Text>
          <Text style={baseStyles.tableHeaderCell}>Age (yrs)</Text>
          <Text style={baseStyles.tableHeaderCell}>Life (yrs)</Text>
          <Text style={baseStyles.tableHeaderCell}>Condition</Text>
          <Text style={baseStyles.tableHeaderCell}>Dep %</Text>
          <Text style={baseStyles.tableHeaderCell}>RCV</Text>
          <Text style={baseStyles.tableHeaderCell}>ACV</Text>
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        </View>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {((dep as any).items || []).map((i: any, idx: number) => (
          <View style={baseStyles.tableRow} key={idx}>
            <Text style={baseStyles.tableCell}>{i.label}</Text>
            <Text style={baseStyles.tableCell}>{i.ageYears}</Text>
            <Text style={baseStyles.tableCell}>{i.lifeExpectancyYears}</Text>
            <Text style={baseStyles.tableCell}>{i.condition}</Text>
            <Text style={baseStyles.tableCell}>{(i.depreciationPercent * 100).toFixed(0)}%</Text>
            <Text style={baseStyles.tableCell}>{formatCurrency(i.rcv)}</Text>
            <Text style={baseStyles.tableCell}>{formatCurrency(i.acv)}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

function formatCurrency(v: number | undefined) {
  if (v == null) return "-";
  return `$${v.toFixed(2)}`;
}
