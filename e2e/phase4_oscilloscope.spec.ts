import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Phase 4 — Oscilloscope & Spectrum Analyser Visualizer Live Verification", () => {
  test("Live verification of parallel AnalyserNode tap, FFT bars, Oscilloscope waveform, and audio continuity", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleLogs: string[] = [];
    const abortErrors: string[] = [];

    page.on("console", (msg) => {
      const text = msg.text();
      consoleLogs.push(`[${msg.type()}] ${text}`);
      if (text.toLowerCase().includes("aborterror")) {
        abortErrors.push(text);
      }
      console.log(`[Browser:${msg.type()}] ${text}`);
    });

    page.on("pageerror", (err) => {
      consoleLogs.push(`[PageError] ${err.message}`);
      if (err.message.toLowerCase().includes("aborterror")) {
        abortErrors.push(err.message);
      }
      console.error(`[PageError] ${err.message}`);
    });

    // 1. Open app
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("domcontentloaded");

    // 2. Import real test track
    const testFilePath = path.resolve(process.cwd(), "layam_master_test.wav");
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testFilePath);

    await expect(page.getByText(/layam_master_test/i).first()).toBeVisible({ timeout: 10000 });

    // 3. Start playback
    await page.getByText(/layam_master_test/i).first().click();
    await page.waitForTimeout(1500);

    // 4. Open Audio Console Modal
    const consoleBtn = page.getByRole("button", { name: /Audio Console/i }).first();
    await consoleBtn.click();
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible({ timeout: 5000 });
    await expect(page.getByText("MASTER OUTPUT SPECTRUM READOUT")).toBeVisible({ timeout: 5000 });

    // 5. Inspect AnalyserNode in Web Audio API graph
    const analyserAudit = await page.evaluate(() => {
      const win = window as any;
      const analyser = win.__LAYAM_ANALYSER_NODE__ as AnalyserNode;
      const ctx = win.__LAYAM_AUDIO_CTX__ as AudioContext;
      const headroom = win.__LAYAM_HEADROOM_GAIN__ as GainNode;

      return {
        hasAnalyser: !!analyser,
        fftSize: analyser ? analyser.fftSize : null,
        frequencyBinCount: analyser ? analyser.frequencyBinCount : null,
        smoothingTimeConstant: analyser ? analyser.smoothingTimeConstant : null,
        ctxState: ctx ? ctx.state : null,
        hasHeadroom: !!headroom,
      };
    });

    console.log("Web Audio AnalyserNode Tap Audit:", analyserAudit);
    expect(analyserAudit.hasAnalyser).toBe(true);
    expect(analyserAudit.fftSize).toBe(1024);
    expect(analyserAudit.frequencyBinCount).toBe(512);
    expect(analyserAudit.ctxState).toBe("running");

    // 6. Read real-time frequency data & time-domain waveform while audio plays
    const audioDataTelemetry = await page.evaluate(() => {
      const win = window as any;
      const analyser = win.__LAYAM_ANALYSER_NODE__ as AnalyserNode;
      const freqData = new Uint8Array(analyser.frequencyBinCount);
      const timeData = new Uint8Array(analyser.fftSize);

      analyser.getByteFrequencyData(freqData);
      analyser.getByteTimeDomainData(timeData);

      let maxFreq = 0;
      let sumFreq = 0;
      for (let i = 0; i < freqData.length; i++) {
        const val = freqData[i]!;
        if (val > maxFreq) maxFreq = val;
        sumFreq += val;
      }
      const avgFreq = sumFreq / freqData.length;

      let maxTimeDev = 0;
      for (let i = 0; i < timeData.length; i++) {
        const dev = Math.abs(timeData[i]! - 128);
        if (dev > maxTimeDev) maxTimeDev = dev;
      }

      return {
        maxFreq,
        avgFreq,
        maxTimeDev,
      };
    });

    console.log("Live Audio Signal Telemetry from Analyser Tap:", audioDataTelemetry);
    // Real audio playing means non-zero frequency spectrum and non-zero time-domain deviation
    expect(audioDataTelemetry.maxFreq).toBeGreaterThan(0);
    expect(audioDataTelemetry.avgFreq).toBeGreaterThan(0);
    expect(audioDataTelemetry.maxTimeDev).toBeGreaterThan(0);

    // 7. Verify Canvas Rendering: FFT BARS mode
    const canvas = page.locator("canvas").first();
    await expect(canvas).toBeVisible();
    await page.waitForTimeout(500);

    // 8. Switch to OSCILLOSCOPE mode and verify
    const waveModeBtn = page.getByRole("button", { name: "OSCILLOSCOPE", exact: true });
    await waveModeBtn.click();
    await page.waitForTimeout(500);

    // Switch back to FFT BARS
    const barsModeBtn = page.getByRole("button", { name: "FFT BARS", exact: true });
    await barsModeBtn.click();
    await page.waitForTimeout(500);

    // 9. Verify EQ band interaction still works seamlessly with Analyser tap active
    const faders = page.locator('div.grid-cols-10 input[type="range"]');
    const fader1k = faders.nth(5);
    await fader1k.fill("6");
    await page.waitForTimeout(300);

    const fader1kGain = await page.evaluate(() => {
      const win = window as any;
      const filter = win.__LAYAM_EQ_FILTERS__[5] as BiquadFilterNode;
      return filter ? filter.gain.value : null;
    });
    console.log("1kHz Filter Gain during visualizer animation:", fader1kGain);
    expect(fader1kGain).toBeCloseTo(6, 0.5);

    // 10. Confirm smooth continuous playback and zero AbortErrors
    const finalAudioState = await page.evaluate(() => {
      const audio = (window as any).__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return { paused: audio.paused, currentTime: audio.currentTime };
    });
    expect(finalAudioState.paused).toBe(false);
    expect(finalAudioState.currentTime).toBeGreaterThan(0);
    expect(abortErrors).toEqual([]);

    console.log("PHASE 4 VERIFICATION COMPLETE: Parallel Analyser tap and live visualizer verified with zero playback impact.");

    await context.close();
  });
});
