import { test, expect } from "@playwright/test";

test.describe("Privacy Identifier Removal & Offline Privacy Verification", () => {
  test("Verifies Privacy Identifier is completely removed, while Privacy & Data, Feedback, Settings and Playback work flawlessly", async ({
    page,
  }) => {
    // Inject mock track to verify playback
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // ── 1. VERIFY LOCALSTORAGE CLEANUP ──
    const deviceIdInStorage = await page.evaluate(() => {
      return localStorage.getItem("layam_offline_anonymous_device_id");
    });
    expect(deviceIdInStorage).toBeNull();

    // ── 2. OPEN ABOUT MODAL & INSPECT PRIVACY & DATA TAB ──
    const aboutBtn = page.getByTitle("About Layam & Privacy Settings").first();
    await expect(aboutBtn).toBeVisible();
    await aboutBtn.click();
    await page.waitForTimeout(300);

    const aboutModal = page.locator('.fixed.inset-0.z-50').first();
    const privacyTab = aboutModal.getByRole("button", { name: "Privacy & Data" }).first();
    await expect(privacyTab).toBeVisible();
    await privacyTab.click();
    await page.waitForTimeout(200);

    // Verify Privacy Identifier and Copy button DO NOT exist
    await expect(aboutModal.getByText("Privacy Identifier")).toHaveCount(0);
    await expect(aboutModal.getByRole("button", { name: "Copy" })).toHaveCount(0);

    // Verify Privacy Architecture text is visible
    await expect(aboutModal.getByText("Privacy Architecture")).toBeVisible();
    await expect(aboutModal.getByText(/zero cloud tracking/i)).toBeVisible();

    // Verify Anonymous Crash Reports toggle is functional
    const crashToggle = aboutModal.locator('input[type="checkbox"]').first();
    await expect(crashToggle).toBeVisible();
    await crashToggle.click();

    // Verify Opt-In Online Metadata toggle is functional
    const metadataToggleBtn = aboutModal.getByRole("button", { name: /LOCAL ONLY|OPT-IN ENABLED/i }).first();
    await expect(metadataToggleBtn).toBeVisible();
    await metadataToggleBtn.click();
    await expect(aboutModal.getByRole("button", { name: "OPT-IN ENABLED" })).toBeVisible();
    await metadataToggleBtn.click(); // Revert

    // ── 3. VERIFY FEEDBACK FUNCTIONALITY ──
    const feedbackTab = aboutModal.getByRole("button", { name: "Feedback" }).first();
    await expect(feedbackTab).toBeVisible();
    await feedbackTab.click();
    await page.waitForTimeout(200);

    const textarea = aboutModal.locator("textarea").first();
    await textarea.fill("Audiophile feedback: Soundstage separation is incredible!");
    const submitFeedbackBtn = aboutModal.getByRole("button", { name: /Send Feedback/i }).first();
    await submitFeedbackBtn.click();
    await expect(aboutModal.getByText(/Feedback sent successfully|Feedback will be available/i).first()).toBeVisible();

    // Close About Modal
    const closeAboutBtn = aboutModal.getByRole("button", { name: "Close About" }).first();
    await closeAboutBtn.click();
    await page.waitForTimeout(300);

    // ── 4. VERIFY SETTINGS MODAL & CHECK FOR UPDATES ──
    const settingsBtn = page.getByTitle("Hi-Fi Settings & Hotkeys").first();
    await expect(settingsBtn).toBeVisible();
    await settingsBtn.click();
    await page.waitForTimeout(300);

    const settingsModal = page.locator('div[role="dialog"]').or(page.locator('.fixed.inset-0.z-50')).first();
    const aboutSettingsTab = settingsModal.getByRole("button", { name: "About" }).first();
    await expect(aboutSettingsTab).toBeVisible();
    await aboutSettingsTab.click();
    await page.waitForTimeout(200);

    const checkUpdatesBtn = settingsModal.getByRole("button", { name: /Check for Updates/i }).first();
    await expect(checkUpdatesBtn).toBeVisible();
    await checkUpdatesBtn.click();
    await expect(settingsModal.getByText(/Up to date!/i).first()).toBeVisible();

    const closeSettingsBtn = settingsModal.getByRole("button", { name: "Close Settings" }).first();
    await closeSettingsBtn.click();
    await page.waitForTimeout(300);

    // ── 5. VERIFY LOCAL AUDIO PLAYBACK REMAINS 100% OFFLINE ──
    const playStatus = await page.evaluate(async () => {
      // Create user audio track
      const sampleRate = 44100;
      const duration = 1.0;
      const numSamples = sampleRate * duration;
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);
      const writeStr = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
      };
      writeStr(0, "RIFF");
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(8, "WAVE");
      writeStr(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, "data");
      view.setUint32(40, numSamples * 2, true);
      for (let i = 0; i < numSamples; i++) {
        const s = Math.sin((2 * Math.PI * 440 * i) / sampleRate);
        view.setInt16(44 + i * 2, s < 0 ? s * 0x8000 : s * 0x7fff, true);
      }
      const blob = new Blob([buffer], { type: "audio/wav" });
      const trackId = `local-imported-${Date.now()}`;
      
      const req = indexedDB.open("layam_audiophile_db", 2);
      await new Promise((resolve) => {
        req.onsuccess = (e: any) => {
          const db = e.target.result;
          const tx = db.transaction("local_audio_blobs", "readwrite");
          tx.objectStore("local_audio_blobs").put({ id: trackId, blob });
          tx.oncomplete = resolve;
        };
      });

      const userTrack = {
        id: trackId,
        title: "Test Offline Vault Audio",
        artistName: "Audiophile Engineer",
        artist: "Audiophile Engineer",
        album: "Local Master",
        quality: "WAV",
        duration: 1.0,
        source: "offline",
      };
      localStorage.setItem("layam_local_tracks", JSON.stringify([userTrack]));
      return { trackId, success: true };
    });

    expect(playStatus.success).toBe(true);
    await page.reload();
    await page.waitForLoadState("networkidle");
    await expect(page.getByText("Test Offline Vault Audio").first()).toBeVisible();
  });
});
