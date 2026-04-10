// components/pdf/sections/RetailPricingSection.tsx

import { Text, View } from "@react-pdf/renderer";

import { ReportData } from "@/lib/reports/types";

import { SectionHeader } from "../SectionHeader";
import { baseStyles } from "../SharedStyles";

export function RetailPricingSection({ data }: { data: ReportData }) {
  // Extract pricing data with safe fallbacks
  const claim = data.claim || {};
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const estimate = (data as any).estimate || {};

  // Calculate pricing (use estimate or claim fields)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const basePrice = estimate.retailTotal || estimate.total || (claim as any).estimatedValue || 0;
  const upgradeTotal = estimate.upgradeTotal || 0;
  const subtotal = basePrice + upgradeTotal;
  const taxRate = 0.0825; // 8.25% default tax rate (can be made configurable)
  const tax = subtotal * taxRate;
  const total = subtotal + tax;

  // Financing info
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const financingAvailable = (claim as any).financingType || (data as any).financingType;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const financingTerm = (claim as any).financingTerm || (data as any).financingTerm;

  // Calculate monthly payment if financing
  let monthlyPayment: number | null = null;
  if (financingTerm && financingTerm > 0) {
    const apr = 0.0799; // 7.99% default APR (can be made configurable)
    const monthlyRate = apr / 12;
    const numPayments = financingTerm;
    monthlyPayment =
      (total * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
      (Math.pow(1 + monthlyRate, numPayments) - 1);
  }

  return (
    <View style={baseStyles.section}>
      <SectionHeader data={data} title="Investment Summary" />

      <View style={{ marginBottom: 12 }}>
        <Text style={[baseStyles.paragraph, { fontSize: 10, color: "#64748B" }]}>
          Below is a detailed breakdown of your roofing project investment. All pricing is based on
          current market rates and includes materials, labor, and warranty coverage.
        </Text>
      </View>

      {/* Line Items */}
      <View style={{ marginBottom: 16 }}>
        <View
          style={[
            baseStyles.row,
            { paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#E2E8F0" },
          ]}
        >
          <View style={{ flex: 3 }}>
            <Text style={[baseStyles.label, { fontWeight: 600 }]}>Description</Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={[baseStyles.label, { fontWeight: 600 }]}>Amount</Text>
          </View>
        </View>

        <View style={[baseStyles.row, { paddingTop: 8, paddingBottom: 6 }]}>
          <View style={{ flex: 3 }}>
            <Text style={baseStyles.value}>Base Roofing System</Text>
            <Text style={[baseStyles.paragraph, { fontSize: 9, color: "#64748B", marginTop: 2 }]}>
              Complete tear-off, installation, and cleanup
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={baseStyles.value}>
              $
              {basePrice > 0
                ? basePrice.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })
                : "TBD"}
            </Text>
          </View>
        </View>

        {upgradeTotal > 0 && (
          <View style={[baseStyles.row, { paddingTop: 6, paddingBottom: 6 }]}>
            <View style={{ flex: 3 }}>
              <Text style={baseStyles.value}>Premium Upgrades</Text>
              <Text style={[baseStyles.paragraph, { fontSize: 9, color: "#64748B", marginTop: 2 }]}>
                Enhanced materials and additional features
              </Text>
            </View>
            <View style={{ flex: 1, alignItems: "flex-end" }}>
              <Text style={baseStyles.value}>
                $
                {upgradeTotal.toLocaleString("en-US", {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </View>
          </View>
        )}

        {/* Subtotal */}
        <View
          style={[
            baseStyles.row,
            { paddingTop: 12, paddingBottom: 6, borderTopWidth: 1, borderTopColor: "#E2E8F0" },
          ]}
        >
          <View style={{ flex: 3 }}>
            <Text style={[baseStyles.label, { fontSize: 11 }]}>Subtotal</Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={[baseStyles.value, { fontSize: 11 }]}>
              $
              {subtotal.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>

        {/* Tax */}
        <View style={[baseStyles.row, { paddingTop: 6, paddingBottom: 6 }]}>
          <View style={{ flex: 3 }}>
            <Text style={[baseStyles.label, { fontSize: 11 }]}>
              Tax ({(taxRate * 100).toFixed(2)}%)
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={[baseStyles.value, { fontSize: 11 }]}>
              ${tax.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </Text>
          </View>
        </View>

        {/* Total */}
        <View
          style={[
            baseStyles.row,
            { paddingTop: 12, paddingBottom: 8, borderTopWidth: 2, borderTopColor: "#1E293B" },
          ]}
        >
          <View style={{ flex: 3 }}>
            <Text style={[baseStyles.label, { fontSize: 13, fontWeight: 700, color: "#1E293B" }]}>
              Total Investment
            </Text>
          </View>
          <View style={{ flex: 1, alignItems: "flex-end" }}>
            <Text style={[baseStyles.value, { fontSize: 13, fontWeight: 700, color: "#1E293B" }]}>
              $
              {total.toLocaleString("en-US", {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2,
              })}
            </Text>
          </View>
        </View>
      </View>

      {/* Financing Options */}
      {financingAvailable && (
        <View
          style={{
            backgroundColor: "#F8FAFC",
            padding: 12,
            borderRadius: 6,
            borderWidth: 1,
            borderColor: "#CBD5E1",
          }}
        >
          <Text
            style={[baseStyles.sectionTitle, { fontSize: 12, marginBottom: 8, color: "#0F172A" }]}
          >
            Financing Available
          </Text>

          <Text style={[baseStyles.paragraph, { fontSize: 10, marginBottom: 8 }]}>
            We offer flexible financing options to help make your roofing project more affordable:
          </Text>

          {monthlyPayment && financingTerm && (
            <View>
              <View style={[baseStyles.row, { marginBottom: 4 }]}>
                <Text style={[baseStyles.label, { fontSize: 10, flex: 1 }]}>Monthly Payment:</Text>
                <Text style={[baseStyles.value, { fontSize: 11, fontWeight: 600 }]}>
                  $
                  {monthlyPayment.toLocaleString("en-US", {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                  /mo
                </Text>
              </View>
              <View style={[baseStyles.row, { marginBottom: 4 }]}>
                <Text style={[baseStyles.label, { fontSize: 10, flex: 1 }]}>Term:</Text>
                <Text style={baseStyles.value}>{financingTerm} months</Text>
              </View>
              <View style={[baseStyles.row]}>
                <Text style={[baseStyles.label, { fontSize: 10, flex: 1 }]}>APR:</Text>
                <Text style={baseStyles.value}>7.99% (subject to credit approval)</Text>
              </View>
            </View>
          )}

          {!monthlyPayment && (
            <Text
              style={[baseStyles.paragraph, { fontSize: 9, color: "#64748B", fontStyle: "italic" }]}
            >
              Contact us to discuss financing options and monthly payment plans tailored to your
              budget.
            </Text>
          )}
        </View>
      )}

      {/* Payment Terms */}
      <View style={{ marginTop: 16 }}>
        <Text style={[baseStyles.sectionTitle, { fontSize: 11, marginBottom: 6 }]}>
          Payment Terms
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
          • 10% deposit due upon contract signing
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
          • 40% due upon material delivery
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
          • 40% due upon substantial completion
        </Text>
        <Text style={[baseStyles.paragraph, { fontSize: 10 }]}>
          • Final 10% due upon final inspection and approval
        </Text>
      </View>

      {/* Disclaimer */}
      <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#E2E8F0" }}>
        <Text
          style={[baseStyles.paragraph, { fontSize: 8, color: "#64748B", fontStyle: "italic" }]}
        >
          * Pricing valid for 30 days from proposal date. Final pricing may vary based on unforeseen
          conditions discovered during tear-off or inspection. Any changes will be documented and
          approved before proceeding.
        </Text>
      </View>
    </View>
  );
}
