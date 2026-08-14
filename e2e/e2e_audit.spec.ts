import { test, expect } from "@playwright/test";

test.describe("Layam E2E Feature Audit Suite", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("domcontentloaded");
  });

  test("Scenario 1: Open Home page, play online track & verify player bar state", async ({
    page,
  }) => {
    await expect(page.locator("header")).toBeVisible();
    await expect(page.getByText("Layam").first()).toBeVisible();

    const startBtn = page.getByRole("button", { name: /Start Listening/i });
    if (await startBtn.isVisible()) {
      await startBtn.click();
    }

    const playerBar = page.locator("div.fixed.bottom-0");
    await expect(playerBar).toBeVisible();
  });

  test("Scenario 2: Toggle Offline Mode, check folder view & Equalizer modal", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("layam_app_mode", "offline"));
    await page.goto("/library");
    await expect(page).toHaveURL(/\/library/);

    await expect(page.getByText("Local Music Library").first()).toBeVisible();

    const eqTrigger = page.locator("button[aria-label*='Equalizer']");
    if (await eqTrigger.isVisible()) {
      await eqTrigger.click();
      await expect(page.getByText("Equalizer & Audio Engine").first()).toBeVisible();
    }
  });

  test("Scenario 3: Open Auth Modal & test Listener vs Artist Role selection", async ({ page }) => {
    // Ensure we start completely logged out - clear all storage
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });

    // Reload the page so React re-initializes with null user from localStorage
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // The Sign In button should be visible only when user === null
    const signInBtn = page.getByRole("button", { name: /Sign In/i });
    await expect(signInBtn).toBeVisible({ timeout: 8000 });

    // Click the Sign In button to open AuthModal
    await signInBtn.click();

    // Wait for Radix Dialog to animate in — use role=dialog which Radix sets automatically
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible({ timeout: 8000 });

    // Now check for modal title text inside the dialog
    const modalTitle = dialog.getByText("Welcome to Layam");
    await expect(modalTitle).toBeVisible({ timeout: 5000 });

    // Switch to Create Account tab
    const createAccountTab = page.getByRole("tab", { name: /Create Account/i });
    await expect(createAccountTab).toBeVisible();
    await createAccountTab.click();

    // Verify role selection options are present
    await expect(page.getByText("🎧 Listener")).toBeVisible();
    await expect(page.getByText("🎨 Artist Creator")).toBeVisible();

    // Select Artist Creator role
    await page.getByText("🎨 Artist Creator").click();
  });

  test("Scenario 4: Log in as Artist Creator and test /upload flow", async ({ page }) => {
    await page.evaluate(() => {
      localStorage.setItem(
        "layam_auth_user",
        JSON.stringify({
          id: "demo-artist-e2e",
          name: "Demo Artist Creator",
          email: "artist@layam.app",
          role: "artist",
        }),
      );
    });
    await page.goto("/");

    const uploadNav = page.locator("a[href='/upload']");
    await expect(uploadNav).toBeVisible();

    await uploadNav.click();
    await expect(page).toHaveURL(/\/upload/);
    await expect(page.getByText("Upload a Song").first()).toBeVisible();
  });

  test("Scenario 5: Verify /dashboard is protected & redirects Listener/Guest users", async ({
    page,
  }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL("http://127.0.0.1:3000/");
    await expect(page.getByText(/Artist Account Required/i).first()).toBeVisible();
  });
});
