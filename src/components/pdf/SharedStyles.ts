// components/pdf/SharedStyles.ts

import { StyleSheet } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

export const baseStyles = StyleSheet.create({
  page: {
    paddingTop: 40,
    paddingBottom: 40,
    paddingHorizontal: 40,
    fontSize: 10,
    fontFamily: "Helvetica",
  },
  section: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 14,
    marginBottom: 8,
    fontWeight: "bold",
  },
  paragraph: {
    fontSize: 10,
    lineHeight: 1.5,
    marginBottom: 8,
  },
  label: {
    fontSize: 9,
    fontWeight: "bold",
  },
  value: {
    fontSize: 9,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 8,
  },
  col: {
    flexDirection: "column",
    flexGrow: 1,
  },
  table: {
    width: "100%",
    borderWidth: 0.5,
    borderColor: "#ccc",
    marginTop: 6,
  },
  tableRow: {
    flexDirection: "row",
  },
  tableHeaderCell: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    fontWeight: "bold",
    backgroundColor: "#f0f0f0",
    borderRightWidth: 0.5,
    borderRightColor: "#ccc",
    borderBottomWidth: 0.5,
    borderBottomColor: "#ccc",
  },
  tableCell: {
    flex: 1,
    padding: 4,
    fontSize: 8,
    borderRightWidth: 0.5,
    borderRightColor: "#eee",
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
  },
  divider: {
    marginVertical: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: "#ddd",
  },
});

export function getThemeColors(data: ReportData) {
  return {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    primary: (data.org as any).primaryColor ?? "#111827",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    secondary: (data.org as any).secondaryColor ?? "#4B5563",
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    accent: (data.org as any).accentColor ?? "#2563EB",
  };
}
