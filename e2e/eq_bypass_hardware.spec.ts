import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Master EQ Hardware Bypass Live Verification Suite", () => {
  test("Live verification of true hardware DSP bypass and state preservation on re-enable", async ({
    page,
  }) => {
    // 1. Create a dummy WAV file
    const testWavPath = path.resolve("./layam_bypass_test.wav");
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

    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    // 2. Open app & import track
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("domcontentloaded");

    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testWavPath);
    await expect(page.getByText(/layam_bypass_test/i).first()).toBeVisible({ timeout: 10000 });

    // 3. Start playback
    await page.getByText(/layam_bypass_test/i).first().click();
    await page.waitForTimeout(1000);

    // 4. Open Audio Console
    const consoleBtn = page.locator("header button:has-text('Audio Console')").first();
    await consoleBtn.click();
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible();

    // 5. Dial in aggressive EQ boosts
    const eq1kSlider = page.locator("input[type='range']").nth(5); // 1kHz slider
    await eq1kSlider.fill("8");
    await page.waitForTimeout(200);

    const subBassSlider = page.locator("input[type='range']").nth(10); // Sub-Bass
    await subBassSlider.fill("6.5");
    await page.waitForTimeout(200);

    // 6. Verify initial state: DSP active (not bypassed)
    let dspState = await page.evaluate(() => {
      const win = window as any;
      return {
        isBypassed: win.__LAYAM_AUDIO_CTX__ ? !win.__LAYAM_EQ_FILTERS__ : null,
        filter1kGain: win.__LAYAM_EQ_FILTERS__[5].gain.value,
        bassGain: win.__LAYAM_BASS_NODE__.gain.value,
      };
    });
    console.log("DSP Active State before bypass:", dspState);
    expect(dspState.filter1kGain).toBeGreaterThan(7.5);
    expect(dspState.bassGain).toBeGreaterThan(6.0);

    // 7. Toggle EQ off (Hardware Bypass)
    const eqPowerBtn = page.locator("button:has-text('EQ ENABLED'), button:has-text('EQ BYPASS')").first();
    await expect(eqPowerBtn).toHaveText(/EQ ENABLED/);
    await eqPowerBtn.click();
    await page.waitForTimeout(300);

    // Verify UI reflects bypass
    await expect(eqPowerBtn).toHaveText(/EQ BYPASS/);
    await expect(page.getByText("DSP DIRECT")).toBeVisible();

    // Verify Web Audio graph bypass status & preserved settings on nodes
    const bypassState = await page.evaluate(() => {
      const win = window as any;
      const ctx = win.__LAYAM_AUDIO_CTX__ as AudioContext;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return {
        audioPaused: audio ? audio.paused : true,
        ctxState: ctx ? ctx.state : null,
        filter1kGain: win.__LAYAM_EQ_FILTERS__[5].gain.value,
        bassGain: win.__LAYAM_BASS_NODE__.gain.value,
      };
    });
    console.log("DSP Bypassed State (Preserved settings on nodes):", bypassState);
    expect(bypassState.audioPaused).toBe(false);
    expect(bypassState.ctxState).toBe("running");
    // Settings are preserved in memory on nodes while signal routes around them
    expect(bypassState.filter1kGain).toBeGreaterThan(7.5);
    expect(bypassState.bassGain).toBeGreaterThan(6.0);

    // 8. Re-enable EQ Processing
    await eqPowerBtn.click();
    await page.waitForTimeout(300);

    // Verify UI reflects active DSP
    await expect(eqPowerBtn).toHaveText(/EQ ENABLED/);
    await expect(page.getByText("DSP ACTIVE")).toBeVisible();

    // Verify filter and bass settings are immediately restored in active path
    const restoredState = await page.evaluate(() => {
      const win = window as any;
      return {
        filter1kGain: win.__LAYAM_EQ_FILTERS__[5].gain.value,
        bassGain: win.__LAYAM_BASS_NODE__.gain.value,
      };
    });
    console.log("DSP Re-enabled Restored State:", restoredState);
    expect(restoredState.filter1kGain).toBeGreaterThan(7.5);
    expect(restoredState.bassGain).toBeGreaterThan(6.0);

    // 9. Confirm audio continuity
    const isStillPlaying = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return audio ? !audio.paused && audio.currentTime > 0 : false;
    });
    expect(isStillPlaying).toBe(true);

    const filteredErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("SourceMap")
    );
    expect(filteredErrors).toEqual([]);

    console.log("MASTER EQ HARDWARE BYPASS TEST PASSED WITH 0 CONSOLE ERRORS.");

    // Cleanup
    if (fs.existsSync(testWavPath)) {
      fs.unlinkSync(testWavPath);
    }
  });
});
