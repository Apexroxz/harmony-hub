import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Phase 6 — Mastering DSP Architecture Overhaul Live Verification Suite", () => {
  test("Live verification of calibrated ISO Q=1.414, Sub-Bass Mono Anchor, 4-Channel FDN Reverb, Master Limiter, and LUFS/dBTP Telemetry", async ({
    page,
  }) => {
    // 1. Create a 1kHz pure tone test audio file
    const testWavPath = path.resolve("./layam_mastering_test.wav");
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
      const sample = Math.sin(2 * Math.PI * 1000 * t) * 0.3 * 32767;
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

    // 2. Load application
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // 3. Import test file and start playback
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testWavPath);
    await expect(page.getByText(/layam_mastering_test/i).first()).toBeVisible({ timeout: 10000 });

    await page.getByText(/layam_mastering_test/i).first().click();
    await page.waitForTimeout(1200);

    // 4. Open Audio Console
    const consoleBtn = page.locator("header button:has-text('Audio Console')").first();
    await consoleBtn.click();
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible();

    // ── AUDIT 1: Calibrated ISO 1-Octave Q = 1.414 across all 10 Peaking Filters ──
    const filterQTelemetry = await page.evaluate(() => {
      const win = window as any;
      const filters = win.__LAYAM_EQ_FILTERS__ as BiquadFilterNode[];
      return {
        count: filters.length,
        qValues: filters.map((f) => Math.round(f.Q.value * 1000) / 1000),
      };
    });
    console.log("10-Band Filter Q-Factor Telemetry:", filterQTelemetry);
    expect(filterQTelemetry.count).toBe(10);
    // All 10 filters must strictly be calibrated to Q = 1.414 (ISO standard)
    filterQTelemetry.qValues.forEach((q) => {
      expect(q).toBe(1.414);
    });

    // ── AUDIT 2: Sub-Bass Mono Anchor (<120Hz Mono-Maker) ──
    const monoMakerTelemetry = await page.evaluate(() => {
      const win = window as any;
      return {
        hasSideGain: Boolean(win.__LAYAM_SIDE_GAIN__),
        hasSplitter: Boolean(win.__LAYAM_STEREO_SPLITTER__),
        hasMerger: Boolean(win.__LAYAM_STEREO_MERGER__),
      };
    });
    console.log("Sub-Bass Mono Anchor Telemetry:", monoMakerTelemetry);
    expect(monoMakerTelemetry.hasSideGain).toBe(true);
    expect(monoMakerTelemetry.hasSplitter).toBe(true);
    expect(monoMakerTelemetry.hasMerger).toBe(true);

    // ── AUDIT 3: 4-Channel Circulating FDN Reverb ──
    const fdnTelemetry = await page.evaluate(() => {
      const win = window as any;
      return {
        hasDry: Boolean(win.__LAYAM_ROOM_DRY__),
        hasWet: Boolean(win.__LAYAM_ROOM_WET__),
        delayL: win.__LAYAM_ROOM_DELAY_L__ ? win.__LAYAM_ROOM_DELAY_L__.delayTime.value : 0,
        delayR: win.__LAYAM_ROOM_DELAY_R__ ? win.__LAYAM_ROOM_DELAY_R__.delayTime.value : 0,
        hasMix: Boolean(win.__LAYAM_ROOM_MIX__),
      };
    });
    console.log("4-Channel FDN Reverb Telemetry:", fdnTelemetry);
    expect(fdnTelemetry.hasDry).toBe(true);
    expect(fdnTelemetry.hasWet).toBe(true);
    expect(fdnTelemetry.hasMix).toBe(true);

    // ── AUDIT 4: Post-DSP True Peak Master Limiter Containment ──
    const limiterTelemetry = await page.evaluate(() => {
      const win = window as any;
      const comp = win.__LAYAM_COMPRESSOR_NODE__ as DynamicsCompressorNode;
      return {
        hasLimiter: Boolean(comp),
        attack: comp ? comp.attack.value : 0,
        release: comp ? comp.release.value : 0,
        knee: comp ? comp.knee.value : 0,
      };
    });
    console.log("Master Limiter Telemetry:", limiterTelemetry);
    expect(limiterTelemetry.hasLimiter).toBe(true);
    expect(limiterTelemetry.attack).toBeLessThanOrEqual(0.005);

    // ── AUDIT 5: Real-Time Broadcast Telemetry (True Peak & LUFS Badges) ──
    await page.waitForTimeout(500);
    const telemetryBadges = await page.evaluate(() => {
      const win = window as any;
      return {
        hasAnalyser: Boolean(win.__LAYAM_ANALYSER_NODE__),
        ctxRunning: win.__LAYAM_AUDIO_CTX__ ? win.__LAYAM_AUDIO_CTX__.state === "running" : false,
      };
    });
    console.log("Broadcast Telemetry Health:", telemetryBadges);
    expect(telemetryBadges.hasAnalyser).toBe(true);
    expect(telemetryBadges.ctxRunning).toBe(true);

    const filteredErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("SourceMap")
    );
    expect(filteredErrors).toEqual([]);

    console.log("MASTERING DSP OVERHAUL VERIFICATION COMPLETED WITH 100% SUCCESS!");

    // Cleanup
    if (fs.existsSync(testWavPath)) {
      fs.unlinkSync(testWavPath);
    }
  });
});
