// components/pdf/sections/EstimateSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData, ReportSectionId } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

interface Props {
  data: ReportData;
  sections: ReportSectionId[];
}

export function EstimateSection({ data, sections }: Props) {
  const est = data.estimate;

  if (!est) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="Estimate" />
        <Text style={baseStyles.value}>No estimate data available.</Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.section}>
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <SectionHeader data={data} title="Estimate Overview" />

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {sections.includes("ESTIMATE_INITIAL") && (est as any).initial && (
        <View style={{ marginBottom: 10 }}>
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <Text style={baseStyles.label}>Initial Estimate</Text>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/jsx-no-comment-textnodes
          <EstimateBlock summary={(est as any).initial.summary} />
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <EstimateTable items={(est as any).initial.lineItems} />
        </View>
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      )}

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {sections.includes("ESTIMATE_SUPPLEMENT") && (est as any).supplement && (
        <View style={{ marginTop: 10 }}>
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          <Text style={baseStyles.label}>Supplement</Text>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any, react/jsx-no-comment-textnodes
          <EstimateBlock summary={(est as any).supplement.summary} />
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          <EstimateTable items={(est as any).supplement.lineItems} />
        </View>
      )}
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EstimateBlock({ summary }: { summary: any }) {
  return (
    <View style={{ marginTop: 4 }}>
      <View style={baseStyles.row}>
        <View style={baseStyles.col}>
          <Text style={baseStyles.label}>RCV</Text>
          <Text style={baseStyles.value}>{formatCurrency(summary.totalRcv)}</Text>
        </View>
        {summary.totalAcv != null && (
          <View style={baseStyles.col}>
            <Text style={baseStyles.label}>ACV</Text>
            <Text style={baseStyles.value}>{formatCurrency(summary.totalAcv)}</Text>
          </View>
        )}
        {summary.deductible != null && (
          <View style={baseStyles.col}>
            <Text style={baseStyles.label}>Deductible</Text>
            <Text style={baseStyles.value}>{formatCurrency(summary.deductible)}</Text>
          </View>
        )}
        {summary.netClaim != null && (
          <View style={baseStyles.col}>
            <Text style={baseStyles.label}>Net Claim</Text>
            <Text style={baseStyles.value}>{formatCurrency(summary.netClaim)}</Text>
          </View>
        )}
      </View>
    </View>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function EstimateTable({ items }: { items: any[] }) {
  if (!items?.length) return null;

  return (
    <View style={[baseStyles.table, { marginTop: 6 }]}>
      <View style={baseStyles.tableRow}>
        <Text style={baseStyles.tableHeaderCell}>Ln</Text>
        <Text style={baseStyles.tableHeaderCell}>Description</Text>
        <Text style={baseStyles.tableHeaderCell}>Qty</Text>
        <Text style={baseStyles.tableHeaderCell}>Unit</Text>
        <Text style={baseStyles.tableHeaderCell}>Unit Price</Text>
        <Text style={baseStyles.tableHeaderCell}>Total</Text>
      </View>
      {items.map((item, idx) => (
        <View style={baseStyles.tableRow} key={idx}>
          <Text style={baseStyles.tableCell}>{item.lineNumber || idx + 1}</Text>
          <Text style={baseStyles.tableCell}>{item.description}</Text>
          <Text style={baseStyles.tableCell}>{item.quantity}</Text>
          <Text style={baseStyles.tableCell}>{item.unit}</Text>
          <Text style={baseStyles.tableCell}>{formatCurrency(item.unitPrice)}</Text>
          <Text style={baseStyles.tableCell}>{formatCurrency(item.total)}</Text>
        </View>
      ))}
    </View>
  );
}

function formatCurrency(v: number | undefined) {
  if (v == null) return "-";
  return `$${v.toFixed(2)}`;
}
