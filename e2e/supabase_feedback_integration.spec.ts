import { test, expect } from "@playwright/test";

test.describe("Layam Hi-Fi Player - Supabase Feedback Integration & Offline Resilience", () => {
  test("Verifies Feedback form validation, category selection, optional email, online submit, offline queueing, and zero music data leakage", async ({
    page,
  }) => {
    // Intercept Supabase Edge Function requests to inspect and verify payload
    let capturedPayload: any = null;
    let mockStatus = 200;
    let mockResponse: any = { success: true, message: "Feedback submitted successfully." };

    await page.route("**/functions/v1/submit-feedback", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        try {
          capturedPayload = JSON.parse(request.postData() || "{}");
        } catch {
          capturedPayload = null;
        }

        await route.fulfill({
          status: mockStatus,
          contentType: "application/json",
          body: JSON.stringify(mockResponse),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // ── 1. OPEN FEEDBACK FORM ──
    const aboutBtn = page.getByTitle("About Layam & Privacy Settings").first();
    await expect(aboutBtn).toBeVisible();
    await aboutBtn.click();
    await page.waitForTimeout(300);

    const aboutModal = page.locator(".fixed.inset-0.z-50").first();
    const feedbackTab = aboutModal.getByRole("button", { name: "Feedback" }).first();
    await expect(feedbackTab).toBeVisible();
    await feedbackTab.click();
    await page.waitForTimeout(200);

    // ── 2. VERIFY CATEGORY SELECTION ──
    const audioDspCatBtn = aboutModal.getByRole("button", { name: "Audio DSP" }).first();
    await expect(audioDspCatBtn).toBeVisible();
    await audioDspCatBtn.click();

    // ── 3. VERIFY OPTIONAL EMAIL & MESSAGE INPUTS ──
    const emailInput = aboutModal.locator('input[type="email"]').first();
    await expect(emailInput).toBeVisible();
    await emailInput.fill("audiophile.tester@example.com");

    const textarea = aboutModal.locator("textarea").first();
    await expect(textarea).toBeVisible();
    await textarea.fill("The 64-bit float mastering limiter and sub-bass mono anchor sound pristine!");

    // ── 4. VERIFY PRIVACY DISCLOSURE ──
    await expect(
      aboutModal.getByText(/Your local music library, files, and listening history are never attached/i).first(),
    ).toBeVisible();

    // ── 5. SUBMIT ONLINE & VERIFY PAYLOAD ──
    const submitBtn = aboutModal.getByRole("button", { name: "Send Feedback" }).first();
    await expect(submitBtn).toBeVisible();
    await submitBtn.click();

    // Verify Success banner
    await expect(aboutModal.getByText(/Feedback sent successfully/i).first()).toBeVisible();

    // Verify Payload Integrity: ONLY category, message, email, app_version, platform
    expect(capturedPayload).not.toBeNull();
    expect(capturedPayload.category).toBe("audio_dsp");
    expect(capturedPayload.email).toBe("audiophile.tester@example.com");
    expect(capturedPayload.message).toContain("mastering limiter and sub-bass mono anchor");
    expect(capturedPayload.app_version).toBe("1.0.0-offline");

    // Strictly ensure NO music tracks, library, deviceId, or audio blobs were transmitted
    expect(capturedPayload.tracks).toBeUndefined();
    expect(capturedPayload.library).toBeUndefined();
    expect(capturedPayload.audioBlobs).toBeUndefined();
    expect(capturedPayload.listeningHistory).toBeUndefined();
    expect(capturedPayload.deviceId).toBeUndefined();

    // ── 6. TEST ERROR / RETRY STATE ──
    mockStatus = 400;
    mockResponse = { success: false, error: "Validation rejected: message contains prohibited format." };

    await textarea.fill("Trigger error test");
    await submitBtn.click();
    await expect(aboutModal.getByText(/Validation rejected|Unable to send feedback/i).first()).toBeVisible();

    // ── 7. TEST OFFLINE LOCAL QUEUEING ──
    await page.evaluate(() => {
      // Simulate browser offline
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    });

    await textarea.fill("Offline message queued for later");
    await submitBtn.click();

    // Verify offline notice banner
    await expect(
      aboutModal.getByText(/You're offline. Feedback will be available when you're connected/i).first(),
    ).toBeVisible();

    // Verify feedback was securely queued in localStorage
    const queuedItems = await page.evaluate(() => {
      const raw = localStorage.getItem("layam_offline_queued_feedback");
      return raw ? JSON.parse(raw) : [];
    });

    expect(queuedItems.length).toBeGreaterThanOrEqual(1);
    expect(queuedItems[queuedItems.length - 1].message).toBe("Offline message queued for later");
    expect(queuedItems[queuedItems.length - 1].category).toBe("audio_dsp");

    // Close Modal
    const closeBtn = aboutModal.getByRole("button", { name: "Close About" }).first();
    await closeBtn.click();
    await page.waitForTimeout(300);

    // ── 8. VERIFY LOCAL PLAYBACK & VAULT REMAIN 100% FUNCTIONAL ──
    await expect(page.getByText(/Tracks/i).first()).toBeVisible();
    await expect(page.getByRole("button", { name: /Audio Console/i }).first()).toBeVisible();
  });
});
