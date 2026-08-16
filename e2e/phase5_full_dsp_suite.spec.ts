import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Phase 5 — Full DSP Audio Graph Verification Suite", () => {
  test("Live verification of Sub-Bass, Air & Clarity, Normalizer, Soundstage, and Room Modes", async ({
    page,
  }) => {
    // 1. Create a dummy WAV file for testing
    const testWavPath = path.resolve("./layam_dsp_test.wav");
    const numChannels = 2;
    const sampleRate = 44100;
    const bitsPerSample = 16;
    const durationSeconds = 30;
    const numSamples = sampleRate * durationSeconds;
    const blockAlign = (numChannels * bitsPerSample) / 8;
    const byteRate = sampleRate * blockAlign;
    const dataSize = numSamples * blockAlign;
    const buffer = Buffer.alloc(44 + dataSize);

    // RIFF header
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

    // 2. Navigate to app
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("domcontentloaded");

    // 3. Import test file
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testWavPath);
    await expect(page.getByText(/layam_dsp_test/i).first()).toBeVisible({ timeout: 10000 });

    // 4. Play imported track
    await page.getByText(/layam_dsp_test/i).first().click();
    await page.waitForTimeout(1500);

    // 5. Open Audio Console Modal
    const consoleBtn = page.getByRole("button", { name: /Audio Console/i }).first();
    await consoleBtn.click();
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible();
    await page.waitForTimeout(500);

    // 6. Test Sub-Bass Driver (60Hz Low-Shelf)
    const subBassTelemetryBefore = await page.evaluate(() => {
      const win = window as any;
      return win.__LAYAM_BASS_NODE__ ? win.__LAYAM_BASS_NODE__.gain.value : null;
    });
    expect(subBassTelemetryBefore).toBeDefined();

    // Move Sub-Bass Slider
    const subBassInput = page.locator("input[type='range']").nth(10); // 10 EQ sliders (0-9), index 10 is Sub-Bass
    await subBassInput.fill("6.5");
    await page.waitForTimeout(200);

    const subBassTelemetryAfter = await page.evaluate(() => {
      const win = window as any;
      return win.__LAYAM_BASS_NODE__.gain.value;
    });
    console.log("Sub-Bass Gain in Web Audio Graph:", subBassTelemetryAfter);
    expect(subBassTelemetryAfter).toBeGreaterThan(6.0);

    // 7. Test Air & Clarity (12kHz High-Shelf)
    const airInput = page.locator("input[type='range']").nth(11); // Index 11 is Air & Clarity
    await airInput.fill("7");
    await page.waitForTimeout(200);

    const airTelemetryAfter = await page.evaluate(() => {
      const win = window as any;
      return win.__LAYAM_TREBLE_NODE__.gain.value;
    });
    console.log("Air & Clarity Gain in Web Audio Graph:", airTelemetryAfter);
    expect(airTelemetryAfter).toBeGreaterThan(6.5);

    // 8. Test Dynamic Normalizer (DynamicsCompressorNode)
    const normalizerBtn = page.getByRole("button", { name: /DYNAMIC NORMALIZER/i });
    await normalizerBtn.click();
    await page.waitForTimeout(200);

    const compressorTelemetry = await page.evaluate(() => {
      const win = window as any;
      return {
        threshold: win.__LAYAM_COMPRESSOR_NODE__.threshold.value,
        ratio: win.__LAYAM_COMPRESSOR_NODE__.ratio.value,
      };
    });
    console.log("DynamicsCompressor Telemetry:", compressorTelemetry);
    expect(compressorTelemetry.threshold).toBeLessThan(-20);
    expect(compressorTelemetry.ratio).toBeGreaterThan(10);

    // 9. Test Soundstage Expansion (Mid/Side Stereo Widener)
    const soundstageInput = page.locator("input[type='range']").nth(12); // Index 12 is Soundstage
    await soundstageInput.fill("1.4");
    await page.waitForTimeout(200);

    const sideGainTelemetry = await page.evaluate(() => {
      const win = window as any;
      return win.__LAYAM_SIDE_GAIN__.gain.value;
    });
    console.log("Mid-Side SideGain Telemetry:", sideGainTelemetry);
    expect(sideGainTelemetry).toBeGreaterThan(1.3);

    // 10. Test Room Modes (Switching between presets)
    const concertHallBtn = page.getByRole("button", { name: "CONCERT HALL" });
    await concertHallBtn.click();
    await page.waitForTimeout(300);

    const concertHallTelemetry = await page.evaluate(() => {
      const win = window as any;
      return {
        wet: win.__LAYAM_ROOM_WET__.gain.value,
        delayL: win.__LAYAM_ROOM_DELAY_L__.delayTime.value,
        delayR: win.__LAYAM_ROOM_DELAY_R__.delayTime.value,
      };
    });
    console.log("Concert Hall Room Reverb Telemetry:", concertHallTelemetry);
    expect(concertHallTelemetry.wet).toBeGreaterThan(0.1);
    expect(concertHallTelemetry.delayL).toBeGreaterThan(0.05);

    // Switch to Studio Master
    const studioMasterBtn = page.getByRole("button", { name: "STUDIO MASTER" });
    await studioMasterBtn.click();
    await page.waitForTimeout(300);

    const studioMasterTelemetry = await page.evaluate(() => {
      const win = window as any;
      return {
        wet: win.__LAYAM_ROOM_WET__.gain.value,
        delayL: win.__LAYAM_ROOM_DELAY_L__.delayTime.value,
      };
    });
    console.log("Studio Master Room Reverb Telemetry:", studioMasterTelemetry);
    expect(studioMasterTelemetry.delayL).toBeLessThan(0.03);

    // Switch back to Direct Monitor (dry bypass)
    const directMonitorBtn = page.getByRole("button", { name: "DIRECT MONITOR" });
    await directMonitorBtn.click();
    await page.waitForTimeout(300);

    const directMonitorTelemetry = await page.evaluate(() => {
      const win = window as any;
      return {
        wet: win.__LAYAM_ROOM_WET__.gain.value,
      };
    });
    console.log("Direct Monitor Room Reverb Telemetry:", directMonitorTelemetry);
    expect(directMonitorTelemetry.wet).toBeLessThan(0.01);

    // Confirm audio is still playing smoothly without errors
    const isPlaying = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return audio ? !audio.paused && audio.currentTime > 0 : false;
    });
    expect(isPlaying).toBe(true);

    const filteredErrors = consoleErrors.filter(
      (err) => !err.includes("favicon") && !err.includes("SourceMap")
    );
    expect(filteredErrors).toEqual([]);

    console.log("PHASE 5 VERIFICATION COMPLETE: All 5 DSP modules verified live in Web Audio graph.");

    // Cleanup
    if (fs.existsSync(testWavPath)) {
      fs.unlinkSync(testWavPath);
    }
  });
});
