import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Hard Reload & Real-Time Frequency Energy EQ Bypass Verification", () => {
  test("Full hard reload -> extreme +12dB boost -> real FFT energy increase -> hardware bypass drops boost -> un-bypass restores boost", async ({
    page,
  }) => {
    // 1. Create a 1kHz pure tone WAV file
    const testWavPath = path.resolve("./layam_1k_tone_test.wav");
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

    // 1kHz tone (sine wave)
    for (let i = 0; i < numSamples; i++) {
      const t = i / sampleRate;
      const sample = Math.sin(2 * Math.PI * 1000 * t) * 0.25 * 32767;
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

    // 2. Perform HARD full page reload (clean browser context)
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // 3. Import 1kHz tone audio file
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testWavPath);
    await expect(page.getByText(/layam_1k_tone_test/i).first()).toBeVisible({ timeout: 10000 });

    // 4. Start playback
    await page.getByText(/layam_1k_tone_test/i).first().click();
    await page.waitForTimeout(1200);

    // 5. Open Audio Console Modal
    const consoleBtn = page.locator("header button:has-text('Audio Console')").first();
    await consoleBtn.click();
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible();

    // 6. Measure baseline 1kHz frequency energy at Flat (0dB)
    const get1kEnergy = async () => {
      return await page.evaluate(() => {
        const win = window as any;
        const analyser = win.__LAYAM_ANALYSER_NODE__ as AnalyserNode;
        if (!analyser) return 0;
        const data = new Uint8Array(analyser.frequencyBinCount);
        analyser.getByteFrequencyData(data);
        // sampleRate = 44100, fftSize = 1024 -> bin width = 44100 / 1024 ≈ 43.066 Hz
        // 1000 Hz / 43.066 ≈ bin index 23
        const binIndex = Math.round(1000 / (44100 / 1024));
        return data[binIndex];
      });
    };

    const flatEnergy = await get1kEnergy();
    console.log("Baseline 1kHz Flat Energy (0dB):", flatEnergy);

    // 7. Boost 1kHz band to EXTREME +12dB via UI slider
    const eq1kSlider = page.locator("input[type='range']").nth(5);
    await eq1kSlider.fill("12");
    await page.waitForTimeout(300);

    // Verify node instance gain value
    const boostedFilterNode = await page.evaluate(() => {
      const win = window as any;
      return {
        filterGain: win.__LAYAM_EQ_FILTERS__[5].gain.value,
        isBypassed: win.__LAYAM_DSP_BYPASSED__ ?? false,
      };
    });
    console.log("Boosted (+12dB) Filter Node Telemetry:", boostedFilterNode);
    expect(boostedFilterNode.filterGain).toBeGreaterThan(11.5);
    expect(boostedFilterNode.isBypassed).toBe(false);

    // Verify physical FFT energy increased
    const boostedEnergy = await get1kEnergy();
    console.log("Boosted 1kHz Energy (+12dB Active):", boostedEnergy);
    expect(boostedEnergy).toBeGreaterThan(flatEnergy);

    // 8. Toggle Hardware Bypass ON ("EQ ENABLED" -> "EQ BYPASS")
    const eqPowerBtn = page.locator("button:has-text('EQ ENABLED'), button:has-text('EQ BYPASS')").first();
    await expect(eqPowerBtn).toHaveText(/EQ ENABLED/);
    await eqPowerBtn.click();
    await page.waitForTimeout(400);

    await expect(eqPowerBtn).toHaveText(/EQ BYPASS/);
    await expect(page.getByText("DSP DIRECT")).toBeVisible();

    const bypassTelemetry = await page.evaluate(() => {
      const win = window as any;
      return {
        filterGainPreserved: win.__LAYAM_EQ_FILTERS__[5].gain.value,
        isBypassed: win.__LAYAM_DSP_BYPASSED__,
      };
    });
    console.log("Bypass State Telemetry (Settings preserved on hardware node):", bypassTelemetry);
    expect(bypassTelemetry.filterGainPreserved).toBeGreaterThan(11.5);
    expect(bypassTelemetry.isBypassed).toBe(true);

    // Verify output energy drops back down towards flat level because +12dB filter is bypassed
    const bypassedEnergy = await get1kEnergy();
    console.log("Bypassed 1kHz Output Energy (DSP Direct):", bypassedEnergy);
    expect(bypassedEnergy).toBeLessThan(boostedEnergy);

    // 9. Toggle Hardware Bypass OFF ("EQ BYPASS" -> "EQ ENABLED")
    await eqPowerBtn.click();
    await page.waitForTimeout(400);

    await expect(eqPowerBtn).toHaveText(/EQ ENABLED/);
    await expect(page.getByText("DSP ACTIVE")).toBeVisible();

    const restoredTelemetry = await page.evaluate(() => {
      const win = window as any;
      return {
        filterGainRestored: win.__LAYAM_EQ_FILTERS__[5].gain.value,
        isBypassed: win.__LAYAM_DSP_BYPASSED__,
      };
    });
    console.log("Restored Active State Telemetry:", restoredTelemetry);
    expect(restoredTelemetry.filterGainRestored).toBeGreaterThan(11.5);
    expect(restoredTelemetry.isBypassed).toBe(false);

    // Verify output energy spikes back up to boosted level
    const restoredEnergy = await get1kEnergy();
    console.log("Restored 1kHz Output Energy (+12dB Re-engaged):", restoredEnergy);
    expect(restoredEnergy).toBeGreaterThan(bypassedEnergy);

    // 10. Perform a HARD RELOAD during playback to verify recovery and absence of stale duplicate nodes
    console.log("Performing hard reload to verify node lifecycle & clean graph rebuild...");
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Re-import and start playback after hard reload
    const fileInput2 = page.locator('header input[type="file"]').first();
    await fileInput2.setInputFiles(testWavPath);
    await expect(page.getByText(/layam_1k_tone_test/i).first()).toBeVisible({ timeout: 10000 });
    await page.getByText(/layam_1k_tone_test/i).first().click();
    await page.waitForTimeout(1000);

    const postReloadState = await page.evaluate(() => {
      const win = window as any;
      const ctx = win.__LAYAM_AUDIO_CTX__ as AudioContext;
      const filters = win.__LAYAM_EQ_FILTERS__ as BiquadFilterNode[];
      const source = win.__LAYAM_AUDIO_SOURCE__ as MediaElementAudioSourceNode;
      return {
        hasCtx: Boolean(ctx),
        ctxState: ctx ? ctx.state : null,
        filterCount: filters ? filters.length : 0,
        hasSource: Boolean(source),
      };
    });
    console.log("Post-Hard-Reload Web Audio Graph State:", postReloadState);
    expect(postReloadState.hasCtx).toBe(true);
    expect(postReloadState.ctxState).toBe("running");
    expect(postReloadState.filterCount).toBe(10);
    expect(postReloadState.hasSource).toBe(true);

    const filteredErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("SourceMap")
    );
    expect(filteredErrors).toEqual([]);

    console.log("HARD RELOAD & REAL-TIME FREQUENCY BYPASS AUDIT PASSED WITH 100% SUCCESS!");

    // Cleanup
    if (fs.existsSync(testWavPath)) {
      fs.unlinkSync(testWavPath);
    }
  });
});
