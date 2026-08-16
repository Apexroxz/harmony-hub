import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Oscilloscope & EQ Combined Permanent Regression Test", () => {
  test("Modal opened before & during playback with live EQ slider modulation and dual-mode visualizer animation", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleLogs: { type: string; text: string }[] = [];
    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      const type = msg.type();
      const text = msg.text();
      consoleLogs.push({ type, text });
      if (type === "error" || text.toLowerCase().includes("aborterror")) {
        consoleErrors.push(text);
      }
      console.log(`[Browser:${type}] ${text}`);
    });

    page.on("pageerror", (err) => {
      consoleLogs.push({ type: "pageerror", text: err.message });
      consoleErrors.push(err.message);
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

    // 4. Open Audio Console Modal (mounts canvas and starts visualizer animation)
    const consoleBtn = page.getByRole("button", { name: /Audio Console/i }).first();
    await consoleBtn.click();
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible();

    // 5. Audit DSP Graph & Analyser acquisition
    const dspAudit = await page.evaluate(() => {
      const win = window as any;
      const filters = win.__LAYAM_EQ_FILTERS__ as BiquadFilterNode[];
      const analyser = win.__LAYAM_ANALYSER_NODE__ as AnalyserNode;
      const headroom = win.__LAYAM_HEADROOM_GAIN__ as GainNode;
      const ctx = win.__LAYAM_AUDIO_CTX__ as AudioContext;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;

      return {
        hasAudio: !!audio,
        paused: audio ? audio.paused : null,
        currentTime: audio ? audio.currentTime : 0,
        hasCtx: !!ctx,
        ctxState: ctx ? ctx.state : null,
        filterCount: filters ? filters.length : 0,
        hasHeadroom: !!headroom,
        hasAnalyser: !!analyser,
        analyserFft: analyser ? analyser.fftSize : null,
        analyserBins: analyser ? analyser.frequencyBinCount : null,
      };
    });

    console.log("Live DSP State while modal open:", dspAudit);
    expect(dspAudit.paused).toBe(false);
    expect(dspAudit.ctxState).toBe("running");
    expect(dspAudit.filterCount).toBe(10);
    expect(dspAudit.hasAnalyser).toBe(true);
    expect(dspAudit.analyserBins).toBe(512);

    // 6. Verify real-time signal activity inside AnalyserNode
    const spectrumData = await page.evaluate(() => {
      const win = window as any;
      const analyser = win.__LAYAM_ANALYSER_NODE__ as AnalyserNode;
      const data = new Uint8Array(analyser.frequencyBinCount);
      analyser.getByteFrequencyData(data);
      let max = 0;
      for (let i = 0; i < data.length; i++) {
        if (data[i]! > max) max = data[i]!;
      }
      return { maxEnergy: max };
    });
    console.log("Live Spectrum Peak Energy:", spectrumData);
    expect(spectrumData.maxEnergy).toBeGreaterThan(0);

    // 7. Modulate EQ Sliders while visualizer is actively running
    const faders = page.locator('div.grid-cols-10 input[type="range"]');
    expect(await faders.count()).toBe(10);

    // Boost Band 1 (64Hz) to +8dB
    await faders.nth(1).fill("8");
    // Cut Band 5 (1kHz) to -4dB
    await faders.nth(5).fill("-4");
    // Boost Band 9 (16kHz) to +6dB
    await faders.nth(9).fill("6");

    await page.waitForTimeout(400);

    // 8. Assert graph filters received gain changes directly
    const liveFilterGains = await page.evaluate(() => {
      const win = window as any;
      const filters = win.__LAYAM_EQ_FILTERS__ as BiquadFilterNode[];
      return filters ? filters.map((f) => f.gain.value) : [];
    });

    console.log("Live Filter Node Gains during active visualizer:", liveFilterGains);
    expect(liveFilterGains[1]).toBeCloseTo(8, 0.5);
    expect(liveFilterGains[5]).toBeCloseTo(-4, 0.5);
    expect(liveFilterGains[9]).toBeCloseTo(6, 0.5);

    // 9. Switch to Oscilloscope mode while playing & adjusting
    const oscModeBtn = page.getByRole("button", { name: "OSCILLOSCOPE", exact: true });
    await oscModeBtn.click();
    await page.waitForTimeout(400);

    // Verify time-domain signal actively modulating
    const timeDomainData = await page.evaluate(() => {
      const win = window as any;
      const analyser = win.__LAYAM_ANALYSER_NODE__ as AnalyserNode;
      const data = new Uint8Array(analyser.fftSize);
      analyser.getByteTimeDomainData(data);
      let maxDev = 0;
      for (let i = 0; i < data.length; i++) {
        const dev = Math.abs(data[i]! - 128);
        if (dev > maxDev) maxDev = dev;
      }
      return { maxDev };
    });
    console.log("Live Oscilloscope Max Waveform Deviation:", timeDomainData);
    expect(timeDomainData.maxDev).toBeGreaterThan(0);

    // 10. Confirm zero errors in console
    expect(consoleErrors).toEqual([]);
    console.log("COMBINED OSCILLOSCOPE + EQ REGRESSION TEST PASSED WITH 0 CONSOLE ERRORS.");

    await context.close();
  });
});
