import { test, expect } from "@playwright/test";

test.describe("Layam E2E Feature Audit Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("Scenario 1: Open Home page & verify header and player bar state", async ({ page }) => {
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText("LAYAM").first()).toBeVisible();

    const playerBar = page.locator("div.fixed.bottom-0");
    await expect(playerBar).toBeVisible();
  });

  test("Scenario 2: Open Audio Console modal and verify DSP controls", async ({ page }) => {
    const consoleBtn = page.locator("header button:has-text('Audio Console')").first();
    await expect(consoleBtn).toBeVisible();
    await consoleBtn.click();

    const consoleModal = page.getByText("LAYAM DSP AUDIO CONSOLE");
    await expect(consoleModal).toBeVisible();

    await page.keyboard.press("Escape");
    await expect(consoleModal).not.toBeVisible();
  });

  test("Scenario 3: Open Settings Modal and verify tabs", async ({ page }) => {
    const settingsBtn = page.locator("button[aria-label='Settings']").first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();

    await expect(page.getByText("Layam Hi-Fi Settings")).toBeVisible();
    await expect(page.getByRole("button", { name: /Audio & DSP/i })).toBeVisible();

    await page.keyboard.press("Escape");
  });

  test("Scenario 4: Test Global Hotkeys & Audio Console toggle", async ({ page }) => {
    await page.locator("body").click();
    await page.keyboard.press("e");
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible();

    await page.keyboard.press("e");
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).not.toBeVisible();
  });

  test("Scenario 5: Verify About Modal & Offline guarantees", async ({ page }) => {
    const aboutBtn = page.locator("button[aria-label='About Layam']").first();
    await expect(aboutBtn).toBeVisible();
    await aboutBtn.click();
    await expect(page.getByText(/Engineered for listening to owned lossless music collections/i)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByText(/Engineered for listening to owned lossless music collections/i)).not.toBeVisible();
  });
});
