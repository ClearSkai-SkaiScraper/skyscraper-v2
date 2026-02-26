/**
 * CSV Exporter Tests (Sprint 8 + 10)
 */

import { describe, expect, it } from "vitest";

import { filterByDateRange, formatCurrency, formatDate, toCsv } from "@/lib/export/csvExporter";

describe("csvExporter", () => {
  const sampleData = [
    { id: "1", name: "Alice", amount: 5000, created: "2024-06-01" },
    { id: "2", name: "Bob", amount: 3200, created: "2024-07-15" },
    { id: "3", name: 'Charlie "Chuck"', amount: 1500, created: "2024-08-20" },
  ];

  describe("toCsv", () => {
    it("generates CSV with headers by default", () => {
      const csv = toCsv(sampleData, ["id", "name", "amount"]);
      const lines = csv.split("\n");
      expect(lines[0]).toBe("id,name,amount");
      expect(lines.length).toBe(4); // header + 3 rows
    });

    it("can exclude headers", () => {
      const csv = toCsv(sampleData, ["id"], { includeHeader: false });
      const lines = csv.split("\n");
      expect(lines.length).toBe(3);
      expect(lines[0]).toBe("1");
    });

    it("escapes commas in values", () => {
      const data = [{ name: "Smith, John", city: "Phoenix" }];
      const csv = toCsv(data, ["name", "city"]);
      expect(csv).toContain('"Smith, John"');
    });

    it("escapes double quotes in values", () => {
      const csv = toCsv(sampleData, ["name"]);
      expect(csv).toContain('"Charlie ""Chuck"""');
    });

    it("supports custom column headers", () => {
      const csv = toCsv(sampleData, [
        { key: "name", header: "Full Name" },
        { key: "amount", header: "Amount ($)" },
      ]);
      expect(csv.split("\n")[0]).toBe("Full Name,Amount ($)");
    });

    it("supports custom formatters", () => {
      const csv = toCsv(sampleData, [{ key: "amount", header: "Amount", format: (v) => `$${v}` }]);
      expect(csv).toContain("$5000");
    });

    it("supports custom delimiter", () => {
      const csv = toCsv(sampleData, ["id", "name"], { delimiter: "\t" });
      expect(csv.split("\n")[0]).toBe("id\tname");
    });

    it("handles empty array", () => {
      const csv = toCsv([], ["id", "name"]);
      expect(csv).toBe("id,name");
    });
  });

  describe("filterByDateRange", () => {
    it("filters by start date", () => {
      const filtered = filterByDateRange(sampleData, "created", "2024-07-01");
      expect(filtered.length).toBe(2);
    });

    it("filters by end date", () => {
      const filtered = filterByDateRange(sampleData, "created", undefined, "2024-07-31");
      expect(filtered.length).toBe(2);
    });

    it("filters by both dates", () => {
      const filtered = filterByDateRange(sampleData, "created", "2024-07-01", "2024-07-31");
      expect(filtered.length).toBe(1);
      expect(filtered[0].name).toBe("Bob");
    });

    it("returns all when no dates specified", () => {
      const filtered = filterByDateRange(sampleData, "created");
      expect(filtered.length).toBe(3);
    });
  });

  describe("formatDate", () => {
    it("formats ISO date string", () => {
      const result = formatDate("2024-06-15T00:00:00Z");
      expect(result).toMatch(/06\/15\/2024/);
    });

    it("returns empty for null/undefined", () => {
      expect(formatDate(null)).toBe("");
      expect(formatDate(undefined)).toBe("");
    });

    it("returns original for invalid date", () => {
      expect(formatDate("not-a-date")).toBe("not-a-date");
    });
  });

  describe("formatCurrency", () => {
    it("formats number as dollar amount", () => {
      expect(formatCurrency(5000)).toBe("$5000.00");
    });

    it("formats string number", () => {
      expect(formatCurrency("1234.5")).toBe("$1234.50");
    });

    it("returns $0.00 for null", () => {
      expect(formatCurrency(null)).toBe("$0.00");
    });

    it("returns $0.00 for NaN", () => {
      expect(formatCurrency("abc")).toBe("$0.00");
    });
  });
});
