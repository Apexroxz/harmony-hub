import { test, expect } from "@playwright/test";

test.describe("Layam Hi-Fi Player - Supabase Updates Integration & Release Management", () => {
  test("Verifies current version check, up-to-date, newer release, channels, minimum supported version, offline handling, and zero data leakage", async ({
    page,
  }) => {
    let capturedRequests: any[] = [];
    let mockMode: "up_to_date" | "newer_release" | "update_required" | "invalid_platform" | "invalid_channel" | "invalid_version" | "server_error" = "up_to_date";

    // Intercept check-update requests to verify payload and simulate different release responses
    await page.route("**/functions/v1/check-update", async (route) => {
      const request = route.request();
      if (request.method() === "POST") {
        let payload: any = {};
        try {
          payload = JSON.parse(request.postData() || "{}");
          capturedRequests.push(payload);
        } catch {
          payload = {};
        }

        // 1. Validation test cases
        if (mockMode === "invalid_platform") {
          return route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error: "Invalid platform 'playstation'. Must be one of: macos, windows, linux, android, ios, web.",
            }),
          });
        }

        if (mockMode === "invalid_channel") {
          return route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error: "Invalid channel 'nightly'. Must be one of: stable, beta, dev.",
            }),
          });
        }

        if (mockMode === "invalid_version") {
          return route.fulfill({
            status: 400,
            contentType: "application/json",
            body: JSON.stringify({
              success: false,
              error: "Invalid or missing 'current_version'. Must be a valid semantic version string.",
            }),
          });
        }

        // 2. Up to date response
        if (mockMode === "up_to_date") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              current_version: payload.current_version,
              latest_version: "1.0.0-offline",
              update_available: false,
              update_required: false,
              release: null,
            }),
          });
        }

        // 3. Newer release response
        if (mockMode === "newer_release") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              current_version: payload.current_version,
              latest_version: "1.0.1",
              update_available: true,
              update_required: false,
              release: {
                version: "1.0.1",
                channel: payload.channel || "stable",
                release_title: "Mastering DSP Optimization & Low-Latency DAC Output",
                release_notes: "• Enhanced 64-bit float math efficiency\n• Added support for 384kHz DAC buffers\n• Fixed minor visual glitches on high-DPI screens",
                published_at: new Date().toISOString(),
                download_url: "https://github.com/layam/player/releases/tag/v1.0.1",
                installer_type: "zip",
                sha256: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
                signature: "MEQCIAzX9...==",
                minimum_supported_version: "1.0.0-offline",
              },
            }),
          });
        }

        // 4. Update required response
        if (mockMode === "update_required") {
          return route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              success: true,
              current_version: payload.current_version,
              latest_version: "2.0.0",
              update_available: true,
              update_required: true,
              release: {
                version: "2.0.0",
                channel: "stable",
                release_title: "Major DSP Engine 2.0 Overhaul",
                release_notes: "Mandatory security and architecture update.",
                published_at: new Date().toISOString(),
                download_url: "https://github.com/layam/player/releases/tag/v2.0.0",
                installer_type: "dmg",
                minimum_supported_version: "2.0.0",
              },
            }),
          });
        }

        return route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ success: false, error: "Internal server error." }),
        });
      }

      await route.continue();
    });

    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // ── 1. OPEN UPDATES TAB IN ABOUT MODAL ──
    const aboutBtn = page.getByTitle("About Layam & Privacy Settings").first();
    await expect(aboutBtn).toBeVisible();
    await aboutBtn.click();
    await page.waitForTimeout(300);

    const aboutModal = page.locator(".fixed.inset-0.z-50").first();
    const updatesTab = aboutModal.getByRole("button", { name: "Updates" }).first();
    await expect(updatesTab).toBeVisible();
    await updatesTab.click();
    await page.waitForTimeout(200);

    // ── 2. TEST UP-TO-DATE STATUS (STABLE CHANNEL) ──
    mockMode = "up_to_date";
    const checkUpdatesBtn = aboutModal.getByRole("button", { name: /Check for Updates/i }).first();
    await expect(checkUpdatesBtn).toBeVisible();
    await checkUpdatesBtn.click();

    // Verify Up-to-date notice banner
    await expect(
      aboutModal.getByText(/You're running the latest stable version/i).first(),
    ).toBeVisible();

    // Verify payload cleanliness: MUST contain only current_version, platform, channel
    expect(capturedRequests.length).toBeGreaterThanOrEqual(1);
    const firstReq = capturedRequests[0];
    expect(firstReq.current_version).toBe("1.0.0-offline");
    expect(firstReq.platform).toBeDefined();
    expect(firstReq.channel).toBe("stable");

    // Strictly ensure NO music tracks, library data, EQ settings, or device IDs are sent
    expect(firstReq.tracks).toBeUndefined();
    expect(firstReq.library).toBeUndefined();
    expect(firstReq.audioBlobs).toBeUndefined();
    expect(firstReq.playlists).toBeUndefined();
    expect(firstReq.deviceId).toBeUndefined();

    // ── 3. TEST NEWER RELEASE DETECTION ──
    mockMode = "newer_release";
    await checkUpdatesBtn.click();

    await expect(aboutModal.getByText(/Layam Hi-Fi 1.0.1 is available/i).first()).toBeVisible();
    await expect(
      aboutModal.getByText(/Mastering DSP Optimization & Low-Latency DAC Output/i).first(),
    ).toBeVisible();
    await expect(
      aboutModal.getByRole("link", { name: /Download Release Asset/i }).first(),
    ).toBeVisible();

    // ── 4. TEST BETA & DEV CHANNELS ──
    const betaBtn = aboutModal.getByRole("button", { name: "beta" }).first();
    await expect(betaBtn).toBeVisible();
    await betaBtn.click();
    await checkUpdatesBtn.click();

    const lastReq = capturedRequests[capturedRequests.length - 1];
    expect(lastReq.channel).toBe("beta");

    const devBtn = aboutModal.getByRole("button", { name: "dev" }).first();
    await expect(devBtn).toBeVisible();
    await devBtn.click();
    await checkUpdatesBtn.click();

    const devReq = capturedRequests[capturedRequests.length - 1];
    expect(devReq.channel).toBe("dev");

    // ── 5. TEST MANDATORY UPDATE (UPDATE REQUIRED) ──
    mockMode = "update_required";
    const stableBtn = aboutModal.getByRole("button", { name: "stable" }).first();
    await stableBtn.click();
    await checkUpdatesBtn.click();

    await expect(
      aboutModal.getByText(/Mandatory Update Required: Layam Hi-Fi 2.0.0/i).first(),
    ).toBeVisible();

    // ── 6. TEST OFFLINE GRACEFUL HANDLING ──
    await page.evaluate(() => {
      Object.defineProperty(navigator, "onLine", { value: false, configurable: true });
    });

    await checkUpdatesBtn.click();
    await expect(
      aboutModal.getByText(/Unable to check for updates while offline/i).first(),
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
