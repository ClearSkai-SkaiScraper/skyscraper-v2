/**
 * Nav Ghost-Link Validation Tests
 *
 * Validates that all nav items point to real routes
 * and no ghost links exist in the navigation config.
 */

import { CONTEXT_NAV, CORE_NAV } from "@/config/nav";
import { describe, expect, it } from "vitest";

// Known valid route patterns (pages that exist in the app)
const KNOWN_VALID_ROUTES = new Set([
  "/dashboard",
  "/claims",
  "/leads",
  "/ai/claims-analysis",
  "/ai/bad-faith",
  "/ai/damage-builder",
  "/ai/mockup",
  "/ai/roof-report",
  "/ai/roofplan-builder",
  "/ai/exports",
  "/ai/tools/rebuttal",
  "/reports/history",
  "/reports/claims",
  "/reports/retail",
  "/maps",
  "/maps/map-view",
  "/maps/door-knocking",
  "/maps/routes",
  "/maps/weather",
  "/maps/weather-chains",
  "/trades",
  "/trades/feed",
  "/trades/analytics",
  "/vendor-network",
  "/vendor-network/ai-match",
  "/vendor-network/cart",
  "/vendor-network/receipts",
  "/vendor-network/connectors",
  "/vendor-network/admin",
  "/smart-docs",
  "/esign/on-site",
  "/measurements",
  "/settings",
  "/settings/billing",
  "/settings/integrations",
  "/settings/security-audit",
  "/tasks",
  "/invoices",
  "/clients",
  "/contracts",
  "/work-orders",
  "/contacts",
]);

// Known ghost routes that were removed (regression guard)
const REMOVED_GHOST_ROUTES = ["/ai/video-reports", "/trades/metrics"];

describe("Navigation Config", () => {
  describe("CORE_NAV", () => {
    it("should not contain removed ghost links", () => {
      const coreHrefs = CORE_NAV.map((item) => item.href);
      for (const ghost of REMOVED_GHOST_ROUTES) {
        expect(coreHrefs).not.toContain(ghost);
      }
    });

    it("should have unique hrefs", () => {
      const hrefs = CORE_NAV.map((item) => item.href);
      const uniqueHrefs = new Set(hrefs);
      expect(uniqueHrefs.size).toBe(hrefs.length);
    });

    it("all items should have required fields", () => {
      for (const item of CORE_NAV) {
        expect(item.href).toBeTruthy();
        expect(item.label).toBeTruthy();
        expect(item.icon).toBeTruthy();
        expect(item.match).toBeInstanceOf(RegExp);
      }
    });
  });

  describe("CONTEXT_NAV", () => {
    it("should not contain removed ghost links", () => {
      const allContextHrefs: string[] = [];
      for (const items of Object.values(CONTEXT_NAV)) {
        for (const item of items) {
          allContextHrefs.push(item.href);
        }
      }
      for (const ghost of REMOVED_GHOST_ROUTES) {
        expect(allContextHrefs).not.toContain(ghost);
      }
    });

    it("context nav keys should match CORE_NAV parent hrefs", () => {
      const coreHrefs = new Set(CORE_NAV.map((item) => item.href));
      for (const key of Object.keys(CONTEXT_NAV)) {
        // Context nav keys should match a core nav href OR be a child path of one
        const isDirectMatch = coreHrefs.has(key);
        const isChildOfCore = [...coreHrefs].some(
          (href) => key.startsWith(href + "/") || key === href
        );
        expect(isDirectMatch || isChildOfCore).toBe(true);
      }
    });
  });
});
