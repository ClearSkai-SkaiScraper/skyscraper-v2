import { expect, test } from "@playwright/test";

import { gotoAuthed } from "./utils/auth-fixture";
import { hasRealDb } from "./utils/dbTestGuard";
const hasDb = hasRealDb();

const BASE = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

test.describe("Drift hardened pages smoke", () => {
  test("vendors page loads heading", async ({ page }) => {
    await gotoAuthed(page, `${BASE}/vendors`);
    const url = page.url();
    if (url.includes("/sign-in")) {
      // Auth redirect is valid
      return;
    }
    const header = page.locator("h1");
    await expect(header).toContainText(/Vendor|Directory|Sign In Required|Initialize/i);
  });

  test("report history page accessible or gated", async ({ page }) => {
    await gotoAuthed(page, `${BASE}/reports/history`);
    const url = page.url();
    if (url.includes("/sign-in")) {
      return;
    }
    const heading = page.locator("h1");
    await expect(heading).toContainText(/Report|History|Sign In Required|Initialize/i);
  });

  test("retail proposal builder accessible or gated", async ({ page }) => {
    await gotoAuthed(page, `${BASE}/reports/retail`);
    const url = page.url();
    if (url.includes("/sign-in")) {
      return;
    }
    const h1 = page.locator("h1");
    await expect(h1).toContainText(/Retail|Proposal|Builder|Sign In Required|Initialize/i);
  });
});
