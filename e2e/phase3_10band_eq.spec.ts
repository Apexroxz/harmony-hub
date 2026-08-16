import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Phase 3 — 10-Band EQ Series Chain & Headroom Live Verification", () => {
  test("Live verification of all 10 BiquadFilterNodes, distinct slider mappings, headroom protection, and presets", async ({
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

    // 2. Import real file
    const testFilePath = path.resolve(process.cwd(), "layam_master_test.wav");
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testFilePath);

    await expect(page.getByText(/layam_master_test/i).first()).toBeVisible({ timeout: 10000 });

    // 3. Play track
    await page.getByText(/layam_master_test/i).first().click();
    await page.waitForTimeout(1500);

    // 4. Open Audio Console Modal
    const consoleBtn = page.getByRole("button", { name: /Audio Console/i }).first();
    await consoleBtn.click();
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible({ timeout: 5000 });

    // 5. Audit all 10 Web Audio BiquadFilterNodes & Headroom Gain in the DSP graph
    const initialDspState = await page.evaluate(() => {
      const win = window as any;
      const filters = win.__LAYAM_EQ_FILTERS__ as BiquadFilterNode[];
      const headroom = win.__LAYAM_HEADROOM_GAIN__ as GainNode;
      const ctx = win.__LAYAM_AUDIO_CTX__ as AudioContext;
      return {
        filterCount: filters ? filters.length : 0,
        frequencies: filters ? filters.map((f) => f.frequency.value) : [],
        types: filters ? filters.map((f) => f.type) : [],
        gains: filters ? filters.map((f) => f.gain.value) : [],
        headroomGain: headroom ? headroom.gain.value : null,
        ctxState: ctx ? ctx.state : null,
      };
    });

    console.log("Initial DSP Graph State:", initialDspState);
    expect(initialDspState.filterCount).toBe(10);
    expect(initialDspState.frequencies).toEqual([32, 64, 125, 250, 500, 1000, 2000, 4000, 8000, 16000]);
    expect(initialDspState.types.every((t) => t === "peaking")).toBe(true);
    expect(initialDspState.headroomGain).toBeCloseTo(0.7079, 3);
    expect(initialDspState.ctxState).toBe("running");

    // 6. Test Fader Mapping: Verify all 10 faders correspond to their unique band index
    const faders = page.locator('div.grid-cols-10 input[type="range"]');
    expect(await faders.count()).toBe(10);

    // Simultaneous Multi-Band Boost Test:
    // Boost Band 1 (64Hz) to +8.0 dB (Sub-bass)
    // Boost Band 3 (250Hz) to +6.0 dB (Warmth)
    // Cut Band 5 (1kHz) to -4.0 dB (Mid scoop)
    // Boost Band 7 (4kHz) to +8.0 dB (Presence)
    // Boost Band 9 (16kHz) to +6.0 dB (Air)
    await faders.nth(1).fill("8");
    await faders.nth(3).fill("6");
    await faders.nth(5).fill("-4");
    await faders.nth(7).fill("8");
    await faders.nth(9).fill("6");

    await page.waitForTimeout(400);

    // Read back all 10 filter node gains from live Web Audio graph
    const liveGains = await page.evaluate(() => {
      const win = window as any;
      const filters = win.__LAYAM_EQ_FILTERS__ as BiquadFilterNode[];
      return filters ? filters.map((f) => f.gain.value) : [];
    });

    console.log("Live 10-Band Gains after simultaneous multi-band adjust:", liveGains);

    // Check individual mappings
    expect(liveGains[0]).toBeCloseTo(0, 1); // 32Hz unchanged
    expect(liveGains[1]).toBeCloseTo(8, 0.5); // 64Hz = +8dB
    expect(liveGains[2]).toBeCloseTo(0, 1); // 125Hz unchanged
    expect(liveGains[3]).toBeCloseTo(6, 0.5); // 250Hz = +6dB
    expect(liveGains[4]).toBeCloseTo(0, 1); // 500Hz unchanged
    expect(liveGains[5]).toBeCloseTo(-4, 0.5); // 1kHz = -4dB
    expect(liveGains[6]).toBeCloseTo(0, 1); // 2kHz unchanged
    expect(liveGains[7]).toBeCloseTo(8, 0.5); // 4kHz = +8dB
    expect(liveGains[8]).toBeCloseTo(0, 1); // 8kHz unchanged
    expect(liveGains[9]).toBeCloseTo(6, 0.5); // 16kHz = +6dB

    // 7. Verify smooth continuous playback during multi-band boost (headroom absorbing boosts)
    const playingState = await page.evaluate(() => {
      const audio = (window as any).__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return { paused: audio.paused, currentTime: audio.currentTime };
    });
    expect(playingState.paused).toBe(false);
    expect(playingState.currentTime).toBeGreaterThan(0);

    // 8. Test EQ Preset switching: Click "Rock" preset
    const rockPresetBtn = page.getByRole("button", { name: "Rock", exact: true });
    await rockPresetBtn.click();
    await page.waitForTimeout(400);

    const rockGains = await page.evaluate(() => {
      const win = window as any;
      const filters = win.__LAYAM_EQ_FILTERS__ as BiquadFilterNode[];
      return filters ? filters.map((f) => f.gain.value) : [];
    });
    console.log("Rock Preset Gains in Web Audio Graph:", rockGains);
    // Rock preset: [6, 4, 2, 0, -2, -2, 0, 2, 4, 6]
    expect(rockGains[0]).toBeCloseTo(6, 0.5);
    expect(rockGains[1]).toBeCloseTo(4, 0.5);
    expect(rockGains[9]).toBeCloseTo(6, 0.5);

    // 9. Reset Flat
    const resetBtn = page.getByRole("button", { name: /RESET FLAT/i });
    await resetBtn.click();
    await page.waitForTimeout(400);

    const flatGains = await page.evaluate(() => {
      const win = window as any;
      const filters = win.__LAYAM_EQ_FILTERS__ as BiquadFilterNode[];
      return filters ? filters.map((f) => f.gain.value) : [];
    });
    console.log("Flat Reset Gains in Web Audio Graph:", flatGains);
    expect(flatGains.every((g) => Math.abs(g) < 0.2)).toBe(true);

    // 10. Confirm zero AbortErrors
    expect(abortErrors).toEqual([]);
    console.log("PHASE 3 VERIFICATION COMPLETE: Full 10-band EQ series graph and headroom protection verified.");

    await context.close();
  });
});
