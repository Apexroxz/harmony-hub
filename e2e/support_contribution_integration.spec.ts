import { test, expect } from "@playwright/test";

test.describe("Layam Hi-Fi Player - Voluntary Support & Contribution Layer", () => {
  test("Verifies custom amount input, validation, no fixed tiers, voluntary disclaimer, offline handling, provider routing, and zero data leakage", async ({
    page,
  }) => {
    let capturedCheckoutPayload: any = null;

    // Intercept create-support-checkout Edge Function
    await page.route("**/functions/v1/create-support-checkout", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        try {
          capturedCheckoutPayload = JSON.parse(request.postData() || "{}");
        } catch {
          capturedCheckoutPayload = null;
        }

        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            success: true,
            checkout_url: "https://checkout.stripe.com/c/pay/cs_test_sample123#test_mode",
            provider_transaction_id: "cs_test_sample123",
          }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // ── 1. OPEN ABOUT MODAL -> SUPPORT TAB ──
    const aboutBtn = page.getByTitle("About Layam & Privacy Settings").first();
    await expect(aboutBtn).toBeVisible();
    await aboutBtn.click();
    await page.waitForTimeout(300);

    const aboutModal = page.locator(".fixed.inset-0.z-50").first();
    const supportTab = aboutModal.getByRole("button", { name: "Support" }).first();
    await expect(supportTab).toBeVisible();
    await supportTab.click();
    await page.waitForTimeout(200);

    // ── 2. VERIFY NO FIXED TIERS EXIST ──
    await expect(aboutModal.getByText(/Audiophile Patron/i)).not.toBeVisible();
    await expect(aboutModal.getByText(/Master Backer/i)).not.toBeVisible();
    await expect(aboutModal.getByText(/Supporter Badge/i)).not.toBeVisible();

    // ── 3. VERIFY VOLUNTARY DISCLAIMER ──
    await expect(
      aboutModal.getByText(/Your contribution is completely voluntary and does not unlock features or content/i).first(),
    ).toBeVisible();

    // ── 4. TEST AMOUNT VALIDATION (Zero, Negative, Decimal, Custom) ──
    const amountInput = aboutModal.locator('input[type="number"]').first();
    const supportSubmitBtn = aboutModal.getByRole("button", { name: /Support Layam/i }).first();
    await expect(amountInput).toBeVisible();
    await expect(supportSubmitBtn).toBeVisible();

    // Zero
    await amountInput.fill("0");
    await supportSubmitBtn.click();
    await expect(
      aboutModal.getByText(/Contribution amount must be greater than zero|Minimum contribution amount/i).first(),
    ).toBeVisible();

    // Negative
    await amountInput.fill("-15");
    await supportSubmitBtn.click();
    await expect(
      aboutModal.getByText(/Contribution amount must be greater than zero|Minimum contribution amount/i).first(),
    ).toBeVisible();

    // Decimal amount (e.g. 12.50)
    await amountInput.fill("12.50");
    await supportSubmitBtn.click();

    // ── 5. VERIFY PAYLOAD INTEGRITY (STRICTLY NO MUSIC/LIBRARY LEAKAGE) ──
    await page.waitForTimeout(300);
    expect(capturedCheckoutPayload).not.toBeNull();
    expect(capturedCheckoutPayload.amount).toBe(12.5);
    expect(capturedCheckoutPayload.currency).toBe("usd");
    expect(capturedCheckoutPayload.platform).toBeDefined();
    expect(capturedCheckoutPayload.app_version).toBe("1.0.0-offline");

    // Strictly ensure zero local user data is included in support checkout
    expect(capturedCheckoutPayload.tracks).toBeUndefined();
    expect(capturedCheckoutPayload.library).toBeUndefined();
    expect(capturedCheckoutPayload.audioBlobs).toBeUndefined();
    expect(capturedCheckoutPayload.listeningHistory).toBeUndefined();
    expect(capturedCheckoutPayload.eqPresets).toBeUndefined();
    expect(capturedCheckoutPayload.deviceId).toBeUndefined();

    // ── 6. TEST OFFLINE ERROR HANDLING ──
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    });

    await amountInput.fill("25");
    await supportSubmitBtn.click();
    await expect(
      aboutModal.getByText(/An internet connection is required to make a contribution/i).first(),
    ).toBeVisible();

    // Close Modal
    const closeBtn = aboutModal.getByRole("button", { name: "Close About" }).first();
    await closeBtn.click();
    await page.waitForTimeout(300);

    // ── 7. VERIFY LOCAL PLAYBACK & VAULT ARE COMPLETELY UNAFFECTED ──
    await expect(page.getByText(/Tracks/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Audio Console/i }).first()).toBeVisible();
  });
});
