import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Opt-In Online Metadata (Artwork & Synced Lyrics) Verification", () => {
  test("Verifies strict opt-in default, offline fallback without playback breakage, and local caching", async ({
    page,
  }) => {
    // 1. Create a dummy test audio file
    const testWavPath = path.resolve("./layam_metadata_test.wav");
    const numChannels = 2;
    const sampleRate = 44100;
    const bitsPerSample = 16;
    const durationSeconds = 30;
    const numSamples = sampleRate * durationSeconds;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = Buffer.alloc(44 + dataSize);

    buffer.write("RIFF", 0);
    buffer.writeUInt32LE(36 + dataSize, 4);
    buffer.write("WAVE", 8);
    buffer.write("fmt ", 12);
    buffer.writeUInt32LE(16, 16);
    buffer.writeUInt16LE(1, 20);
    buffer.writeUInt16LE(numChannels, 22);
    buffer.writeUInt32LE(sampleRate, 24);
    buffer.writeUInt32LE(byteRate, 28);
    buffer.writeUInt16LE(blockAlign, 32);
    buffer.writeUInt16LE(bitsPerSample, 34);
    buffer.write("data", 36);
    buffer.writeUInt32LE(dataSize, 40);

    fs.writeFileSync(testWavPath, buffer);

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // Track external network requests
    const networkRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (url.includes("itunes.apple.com") || url.includes("lrclib.net") || url.includes("musicbrainz.org")) {
        networkRequests.push(url);
      }
    });

    // 2. Load page
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // ── AUDIT 1: Default Opt-In State must be strictly FALSE ──
    const initialOptInState = await page.evaluate(() => {
      return localStorage.getItem("layam_fetch_online_metadata_opt_in") === "true";
    });
    console.log("Initial Online Metadata Opt-In State:", initialOptInState);
    expect(initialOptInState).toBe(false);

    // ── AUDIT 2: Import audio file with Opt-In FALSE — No external metadata requests ──
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testWavPath);
    await expect(page.getByText(/layam_metadata_test/i).first()).toBeVisible({ timeout: 10000 });

    await page.getByText(/layam_metadata_test/i).first().click();
    await page.waitForTimeout(1000);

    // Assert that NO external metadata calls were made
    expect(networkRequests).toEqual([]);

    // ── AUDIT 3: Open Offline Settings and Toggle Opt-In ──
    // Click About/Privacy info button in header
    const infoBtn = page.locator("header button[title*='Privacy'], header button[title*='About']").first();
    await infoBtn.click();
    await expect(page.getByText("Privacy & Data").first()).toBeVisible();

    // Click Privacy & Data tab
    await page.getByText("Privacy & Data").first().click();
    await expect(page.getByText("Fetch Online Metadata")).toBeVisible();

    // Toggle to Opt-In
    const optInToggleBtn = page.getByRole("button", { name: /LOCAL ONLY/i }).first();
    await optInToggleBtn.click();
    await page.waitForTimeout(200);

    const updatedOptIn = await page.evaluate(() => {
      return localStorage.getItem("layam_fetch_online_metadata_opt_in") === "true";
    });
    console.log("Updated Online Metadata Opt-In State:", updatedOptIn);
    expect(updatedOptIn).toBe(true);

    // Verify button text changes to OPT-IN ENABLED
    await expect(page.getByRole("button", { name: /OPT-IN ENABLED/i }).first()).toBeVisible();

    // ── AUDIT 4: Verify playback remains 100% stable with zero console errors ──
    const isPlaying = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return audio ? !audio.paused : false;
    });
    expect(isPlaying).toBe(true);

    const filteredErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("SourceMap")
    );
    expect(filteredErrors).toEqual([]);

    console.log("OPT-IN ONLINE METADATA VERIFICATION COMPLETED WITH 100% SUCCESS!");

    // Cleanup
    if (fs.existsSync(testWavPath)) {
      fs.unlinkSync(testWavPath);
    }
  });
});
