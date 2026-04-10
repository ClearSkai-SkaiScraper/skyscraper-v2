// components/pdf/sections/MaterialsSection.tsx

import { Text,View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function MaterialsSection({ data }: { data: ReportData }) {
  const m = data.materials;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!m || !(m as any).items || !(m as any).items.length) {
    return (
      <View style={baseStyles.section}>
        <SectionHeader data={data} title="Materials & Color Selections" />
        <Text style={baseStyles.value}>No material selections recorded.</Text>
      </View>
    );
  }

  return (
    <View style={baseStyles.section}>
      // eslint-disable-next-line react/jsx-no-comment-textnodes
      <SectionHeader data={data} title="Materials & Color Selections" />

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      {((m as any).primarySystemName || (m as any).primaryColorName) && (
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        <View style={{ marginBottom: 8 }}>
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {(m as any).primarySystemName && (
            <>
              // eslint-disable-next-line react/jsx-no-comment-textnodes
              <Text style={baseStyles.label}>Primary System</Text>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Text style={baseStyles.value}>{(m as any).primarySystemName}</Text>
            </>
          // eslint-disable-next-line react/jsx-no-comment-textnodes
          )}
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          {(m as any).primaryColorName && (
            <>
              // eslint-disable-next-line react/jsx-no-comment-textnodes
              <Text style={baseStyles.label}>Primary Color</Text>
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              <Text style={baseStyles.value}>{(m as any).primaryColorName}</Text>
            </>
          )}
        </View>
      )}

      <View style={baseStyles.table}>
        <View style={baseStyles.tableRow}>
          <Text style={baseStyles.tableHeaderCell}>Category</Text>
          <Text style={baseStyles.tableHeaderCell}>Product</Text>
          <Text style={baseStyles.tableHeaderCell}>Vendor</Text>
          <Text style={baseStyles.tableHeaderCell}>Color</Text>
          <Text style={baseStyles.tableHeaderCell}>Qty</Text>
          <Text style={baseStyles.tableHeaderCell}>Unit</Text>
          <Text style={baseStyles.tableHeaderCell}>Upgrade</Text>
        // eslint-disable-next-line react/jsx-no-comment-textnodes
        </View>
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        {((m as any).items || []).map((i: any, idx: number) => (
          <View style={baseStyles.tableRow} key={idx}>
            <Text style={baseStyles.tableCell}>{i.category}</Text>
            <Text style={baseStyles.tableCell}>{i.name}</Text>
            <Text style={baseStyles.tableCell}>{i.vendorName || "-"}</Text>
            <Text style={baseStyles.tableCell}>{i.color || "-"}</Text>
            <Text style={baseStyles.tableCell}>{i.quantity ?? "-"}</Text>
            <Text style={baseStyles.tableCell}>{i.unit || "-"}</Text>
            <Text style={baseStyles.tableCell}>{i.isUpgrade ? "Yes" : "No"}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
