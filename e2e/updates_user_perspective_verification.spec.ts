import { test, expect } from "@playwright/test";

test.describe("Layam Hi-Fi Player - Updates & Normal User Experience Verification", () => {
  test("Verifies Check for Updates option in Settings Modal and About Modal", async ({
    page,
  }) => {
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // ── 1. TEST SETTINGS MODAL UPDATE OPTION ──
    const settingsBtn = page.getByTitle("Hi-Fi Settings & Hotkeys").first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await page.waitForTimeout(300);

    // Switch to About tab inside Settings Modal
    const settingsModal = page.locator('div[role="dialog"]').or(page.locator('.fixed.inset-0.z-50')).first();
    const aboutTabBtn = settingsModal.getByRole("button", { name: "About" }).first();
    await expect(aboutTabBtn).toBeVisible();
    await aboutTabBtn.click();
    await page.waitForTimeout(200);

    // Verify Check for Updates button exists in Settings
    const checkUpdatesBtn = settingsModal.getByRole("button", { name: /Check for Updates/i }).first();
    await expect(checkUpdatesBtn).toBeVisible();
    await checkUpdatesBtn.click();

    // Verify up-to-date message appears
    await expect(settingsModal.getByText(/Up to date!/i).first()).toBeVisible();

    // Close Settings Modal
    const closeSettingsBtn = settingsModal.getByRole("button", { name: "Close Settings" }).first();
    await closeSettingsBtn.click();
    await page.waitForTimeout(300);

    // ── 2. TEST ABOUT MODAL UPDATE OPTION ──
    const aboutHeaderBtn = page.getByTitle("About Layam & Privacy Settings").first();
    await expect(aboutHeaderBtn).toBeVisible();
    await aboutHeaderBtn.click();
    await page.waitForTimeout(300);

    // Switch to Updates tab in About Modal
    const aboutModal = page.locator('.fixed.inset-0.z-50').first();
    const updatesTab = aboutModal.getByRole("button", { name: "Updates" }).first();
    await expect(updatesTab).toBeVisible();
    await updatesTab.click();
    await page.waitForTimeout(200);

    // Verify version and release channel selector
    await expect(aboutModal.getByText(/v1.0.0-offline/i).first()).toBeVisible();
    await expect(aboutModal.getByRole("button", { name: "stable" }).first()).toBeVisible();

    // Click Check for Updates in About Modal
    const aboutCheckUpdatesBtn = aboutModal.getByRole("button", { name: /Check for Updates/i }).first();
    await expect(aboutCheckUpdatesBtn).toBeVisible();
    await aboutCheckUpdatesBtn.click();

    // Verify up to date confirmation or offline banner and changelog
    await expect(
      aboutModal.getByText(/running the latest stable version|You're up to date!|Unable to check for updates while offline/i).first(),
    ).toBeVisible();
    await expect(aboutModal.getByText(/What's New in v1.0.0/i).first()).toBeVisible();
  });
});
