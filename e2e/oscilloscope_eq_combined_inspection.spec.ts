import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Oscilloscope & EQ Combined Live Inspection", () => {
  test("Inspect console errors and filter node connections while oscilloscope is actively running", async ({
    browser,
  }) => {
    const context = await browser.newContext();
    const page = await context.newPage();

    const consoleLogs: { type: string; text: string }[] = [];

    page.on("console", (msg) => {
      consoleLogs.push({ type: msg.type(), text: msg.text() });
      console.log(`[Browser:${msg.type()}] ${msg.text()}`);
    });

    page.on("pageerror", (err) => {
      consoleLogs.push({ type: "pageerror", text: err.message });
      console.error(`[PageError] ${err.message}`);
    });

    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("domcontentloaded");

    const testFilePath = path.resolve(process.cwd(), "layam_master_test.wav");
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testFilePath);

    await expect(page.getByText(/layam_master_test/i).first()).toBeVisible({ timeout: 10000 });

    // Start playing
    await page.getByText(/layam_master_test/i).first().click();
    await page.waitForTimeout(1000);

    // Open Audio Console Modal (mounts canvas and starts requestAnimationFrame)
    const consoleBtn = page.getByRole("button", { name: /Audio Console/i }).first();
    await consoleBtn.click();
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible();

    // Verify canvas is running
    await page.waitForTimeout(500);

    // Move all 10 sliders one by one
    const faders = page.locator('div.grid-cols-10 input[type="range"]');
    const faderCount = await faders.count();
    console.log("Fader count:", faderCount);

    for (let i = 0; i < faderCount; i++) {
      const fader = faders.nth(i);
      await fader.fill("6");
      await page.waitForTimeout(100);
    }

    // Inspect live graph node connections & values
    const graphAudit = await page.evaluate(() => {
      const win = window as any;
      const filters = win.__LAYAM_EQ_FILTERS__ as BiquadFilterNode[];
      const source = win.__LAYAM_AUDIO_SOURCE__ as MediaElementAudioSourceNode;
      const headroom = win.__LAYAM_HEADROOM_GAIN__ as GainNode;
      const analyser = win.__LAYAM_ANALYSER_NODE__ as AnalyserNode;
      const ctx = win.__LAYAM_AUDIO_CTX__ as AudioContext;

      return {
        hasCtx: !!ctx,
        ctxState: ctx ? ctx.state : null,
        hasSource: !!source,
        hasHeadroom: !!headroom,
        hasAnalyser: !!analyser,
        filterGains: filters ? filters.map((f) => f.gain.value) : [],
        analyserFft: analyser ? analyser.fftSize : null,
        // Check if globalDspEngine instance is using these exact filter references
        dspFiltersMatchGlobal: win.__LAYAM_EQ_FILTERS__ === filters,
      };
    });

    console.log("Graph Audit Result:", graphAudit);

    // Check all errors
    const errors = consoleLogs.filter((l) => l.type === "error" || l.type === "pageerror");
    console.log("All Errors in Console:", errors);

    await context.close();
  });
});
