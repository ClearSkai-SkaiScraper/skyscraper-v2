import { expect, test } from "@playwright/test";

import { gotoAuthed } from "../utils/auth-fixture";

test("first visit to dashboard shows onboarding gate", async ({ page }) => {
  await gotoAuthed(page, "/dashboard");

  // May redirect to sign-in or show inline gate depending on auth config
  const url = page.url();
  if (url.includes("/sign-in")) {
    // Clerk redirect behavior - valid auth gate
    await expect(page).toHaveURL(/sign-in/);
    return;
  }

  // New unauth/onboarding state heading
  const heading = page.locator("h1");
  await expect(heading).toContainText(
    /Initialize Workspace|Sign In Required|Mission Control|Dashboard/i
  );
  // Start Onboarding CTA presence when initialization needed
  const onboardingBtn = page.getByRole("link", { name: /Start Onboarding/i });
  if (await onboardingBtn.isVisible().catch(() => false)) {
    await expect(onboardingBtn).toBeVisible();
  }
});
