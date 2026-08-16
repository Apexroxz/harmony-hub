import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Phase 2 — Single 1kHz EQ Band Live Verification", () => {
  test("Live verification of 1kHz peaking BiquadFilterNode slider in Audio Console", async ({
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

    // 5. Check baseline filter node state in Web Audio graph
    const initialGraphState = await page.evaluate(() => {
      const win = window as any;
      const filter = win.__LAYAM_EQ_1K_NODE__ as BiquadFilterNode;
      const ctx = win.__LAYAM_AUDIO_CTX__ as AudioContext;
      return {
        hasFilter: !!filter,
        type: filter ? filter.type : null,
        frequency: filter ? filter.frequency.value : null,
        Q: filter ? filter.Q.value : null,
        gain: filter ? filter.gain.value : null,
        ctxState: ctx ? ctx.state : null,
      };
    });

    console.log("Initial Web Audio Filter State:", initialGraphState);
    expect(initialGraphState.hasFilter).toBe(true);
    expect(initialGraphState.type).toBe("peaking");
    expect(initialGraphState.frequency).toBe(1000);
    expect(initialGraphState.gain).toBe(0);
    expect(initialGraphState.ctxState).toBe("running");

    // 6. Locate the 1kHz slider (slider for 1kHz is at index 5 in the 10-band rack)
    const sliders = page.locator('div.grid-cols-10 input[type="range"]');
    const count = await sliders.count();
    console.log("10-band parametric sliders count:", count);
    expect(count).toBe(10);

    const slider1k = sliders.nth(5); // 1kHz slider

    // 7. Boost 1kHz to +8.0 dB
    await slider1k.fill("8");
    await page.waitForTimeout(300);

    const boostGain = await page.evaluate(() => {
      const win = window as any;
      const filter = win.__LAYAM_EQ_1K_NODE__ as BiquadFilterNode;
      return filter ? filter.gain.value : null;
    });
    console.log("Web Audio 1kHz Gain after +8.0 dB boost:", boostGain);
    expect(boostGain).toBeGreaterThanOrEqual(7.5);
    expect(boostGain).toBeLessThanOrEqual(8.0);

    // Verify audio is still playing smoothly without interruption
    const playingDuringBoost = await page.evaluate(() => {
      const audio = (window as any).__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return { paused: audio.paused, currentTime: audio.currentTime };
    });
    expect(playingDuringBoost.paused).toBe(false);
    expect(playingDuringBoost.currentTime).toBeGreaterThan(0);

    // 8. Cut 1kHz to -6.0 dB
    await slider1k.fill("-6");
    await page.waitForTimeout(300);

    const cutGain = await page.evaluate(() => {
      const win = window as any;
      const filter = win.__LAYAM_EQ_1K_NODE__ as BiquadFilterNode;
      return filter ? filter.gain.value : null;
    });
    console.log("Web Audio 1kHz Gain after -6.0 dB cut:", cutGain);
    expect(cutGain).toBeLessThanOrEqual(-5.5);
    expect(cutGain).toBeGreaterThanOrEqual(-6.0);

    // Verify audio is still playing smoothly without interruption
    const playingDuringCut = await page.evaluate(() => {
      const audio = (window as any).__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return { paused: audio.paused, currentTime: audio.currentTime };
    });
    expect(playingDuringCut.paused).toBe(false);

    // 9. Return 1kHz to 0.0 dB
    await slider1k.fill("0");
    await page.waitForTimeout(300);

    const neutralGain = await page.evaluate(() => {
      const win = window as any;
      const filter = win.__LAYAM_EQ_1K_NODE__ as BiquadFilterNode;
      return filter ? filter.gain.value : null;
    });
    console.log("Web Audio 1kHz Gain after 0.0 dB reset:", neutralGain);
    expect(neutralGain).toBeGreaterThanOrEqual(-0.5);
    expect(neutralGain).toBeLessThanOrEqual(0.5);

    // 10. Confirm zero AbortErrors
    expect(abortErrors).toEqual([]);
    console.log("PHASE 2 VERIFICATION COMPLETE: Single 1kHz peaking EQ band verified live in audio graph with zero errors.");

    await context.close();
  });
});
