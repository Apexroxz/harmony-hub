import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("EQ Access Points Comprehensive Audit Suite", () => {
  test("Live verification of all 7 UI & hotkey access points opening the Audio Console Modal", async ({
    page,
  }) => {
    // 1. Create a dummy WAV file
    const testWavPath = path.resolve("./layam_access_test.wav");
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

    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 440 * t) * 0.4 * 32767;
      const offset = 44 + i * blockAlign;
      buffer.writeInt16LE(Math.floor(sample), offset);
      buffer.writeInt16LE(Math.floor(sample), offset + 2);
    }
    fs.writeFileSync(testWavPath, buffer);

    const consoleModalHeader = page.getByText("LAYAM DSP AUDIO CONSOLE");
    const closeConsoleModal = async () => {
      await page.keyboard.press("Escape");
      await expect(consoleModalHeader).not.toBeVisible();
      await page.waitForTimeout(200);
    };

    // 2. Open Home (Standby State)
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("domcontentloaded");

    // ── ACCESS POINT 1: Standalone Header "Audio Console" button ──
    console.log("Testing Access Point 1: Header Audio Console button...");
    const headerConsoleBtn = page.locator("header button:has-text('Audio Console')").first();
    await expect(headerConsoleBtn).toBeVisible({ timeout: 8000 });
    await headerConsoleBtn.click();
    await expect(consoleModalHeader).toBeVisible();
    await closeConsoleModal();

    // ── ACCESS POINT 2: Dashboard Hero "Open Audio Console" button ──
    console.log("Testing Access Point 2: Dashboard Hero Open Audio Console button...");
    const heroConsoleBtn = page.getByRole("button", { name: /Open Audio Console/i }).first();
    await expect(heroConsoleBtn).toBeVisible();
    await heroConsoleBtn.click();
    await expect(consoleModalHeader).toBeVisible();
    await closeConsoleModal();

    // ── ACCESS POINT 3: PlayerBar (Standby State) "Audio Console" button ──
    console.log("Testing Access Point 3: Standby PlayerBar Audio Console button...");
    const standbyBarBtn = page.locator("div.fixed.bottom-0 button:has-text('Audio Console')").first();
    await expect(standbyBarBtn).toBeVisible();
    await standbyBarBtn.click();
    await expect(consoleModalHeader).toBeVisible();
    await closeConsoleModal();

    // Import audio file to test playing state access points
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testWavPath);
    await expect(page.getByText(/layam_access_test/i).first()).toBeVisible({ timeout: 10000 });

    // Start playback
    await page.getByText(/layam_access_test/i).first().click();
    await page.waitForTimeout(1000);

    // ── ACCESS POINT 4: PlayerBar (Active Playback State) "Console" button ──
    console.log("Testing Access Point 4: Active PlayerBar Console button...");
    const activeBarConsoleBtn = page.locator("button[title*='Studio DSP Console']").first();
    await expect(activeBarConsoleBtn).toBeVisible();
    await activeBarConsoleBtn.click();
    await expect(consoleModalHeader).toBeVisible();
    await closeConsoleModal();

    // ── ACCESS POINT 5: Fullscreen Cockpit Footer "EQUALIZER" chip ──
    console.log("Testing Access Point 5: Fullscreen Cockpit EQUALIZER chip...");
    const expandPlayerBtn = page.locator("button[title*='Expand Full Audiophile Cockpit']").first();
    await expandPlayerBtn.click();
    await expect(page.getByText("LAYAM HI-FI AUDIOPHILE COCKPIT")).toBeVisible();

    const fullscreenEqChip = page.locator("button:has-text('EQUALIZER')").first();
    await expect(fullscreenEqChip).toBeVisible();
    await fullscreenEqChip.click();
    await expect(consoleModalHeader).toBeVisible();
    await closeConsoleModal();

    // ── ACCESS POINT 6: Fullscreen Cockpit Footer "DSP HARDWARE" chip ──
    console.log("Testing Access Point 6: Fullscreen Cockpit DSP HARDWARE chip...");
    const fullscreenDspChip = page.locator("button:has-text('DSP HARDWARE')").first();
    await expect(fullscreenDspChip).toBeVisible();
    await fullscreenDspChip.click();
    await expect(consoleModalHeader).toBeVisible();
    await closeConsoleModal();

    // Close fullscreen player
    const minimizeBtn = page.locator("button[title*='Minimize Player']").first();
    await minimizeBtn.click();
    await expect(page.getByText("LAYAM HI-FI AUDIOPHILE COCKPIT")).not.toBeVisible();

    // ── ACCESS POINT 7: Global Hotkey ("E") ──
    console.log("Testing Access Point 7: Global Hotkey 'E'...");
    await page.keyboard.press("KeyE");
    await expect(consoleModalHeader).toBeVisible();
    await closeConsoleModal();

    console.log("ALL 7 EQ / AUDIO CONSOLE ACCESS POINTS AUDITED & VERIFIED LIVE WITH 100% SUCCESS!");

    // Cleanup
    if (fs.existsSync(testWavPath)) {
      fs.unlinkSync(testWavPath);
    }
  });
});
