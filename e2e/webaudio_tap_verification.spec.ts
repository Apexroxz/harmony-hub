import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Web Audio API Tap Core-Loop Verification", () => {
  test("Verify Web Audio Tap playback, seek, arrow-keys, and pause/resume without AbortError", async ({
    browser,
  }) => {
    // 1. Create fresh isolated Incognito context
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

    // 2. Navigate to Offline Player at http://localhost:8081
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("domcontentloaded");

    // 3. Upload real file: layam_master_test.wav (15 seconds track)
    const testFilePath = path.resolve(process.cwd(), "layam_master_test.wav");
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testFilePath);

    // Wait for the track to be parsed, stored in IndexedDB, and rendered
    await expect(page.getByText(/layam_master_test/i).first()).toBeVisible({ timeout: 10000 });

    // 4. Click the track to initiate playback
    await page.getByText(/layam_master_test/i).first().click();

    // Wait for audio playback to start
    await page.waitForTimeout(1500);

    // 5. Verify Audio Engine, AudioContext, and MediaElementAudioSourceNode
    const audioState = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement | undefined;
      const ctx = win.__LAYAM_AUDIO_CTX__ as AudioContext | undefined;
      const source = win.__LAYAM_AUDIO_SOURCE__ as MediaElementAudioSourceNode | undefined;
      return {
        hasAudio: !!audio,
        paused: audio ? audio.paused : null,
        currentTime: audio ? audio.currentTime : 0,
        duration: audio ? audio.duration : 0,
        src: audio ? audio.src : "",
        hasCtx: !!ctx,
        ctxState: ctx ? ctx.state : null,
        hasSource: !!source,
      };
    });

    console.log("Audio Engine State:", audioState);
    expect(audioState.hasAudio).toBe(true);
    expect(audioState.hasCtx).toBe(true);
    expect(audioState.ctxState).toBe("running");
    expect(audioState.hasSource).toBe(true);
    expect(audioState.paused).toBe(false);
    expect(audioState.currentTime).toBeGreaterThan(0);

    // 6. Test Direct Seek to 2.0s
    await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      audio.currentTime = 2.0;
    });
    await page.waitForTimeout(600);

    const timeAfterSeek = await page.evaluate(() => {
      const win = window as any;
      return (win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement).currentTime;
    });
    console.log("Time after direct seek (2.0s):", timeAfterSeek);
    expect(timeAfterSeek).toBeGreaterThanOrEqual(1.9);
    expect(timeAfterSeek).toBeLessThanOrEqual(4.0);

    // 7. Test ArrowKey skipping (ArrowRight +10s -> lands at ~12.5s)
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(600);
    const timeAfterArrowRight = await page.evaluate(() => {
      const win = window as any;
      return (win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement).currentTime;
    });
    console.log("Time after ArrowRight (+10s):", timeAfterArrowRight);
    expect(timeAfterArrowRight).toBeGreaterThanOrEqual(11.5);
    expect(timeAfterArrowRight).toBeLessThanOrEqual(14.8);

    // Test ArrowLeft -10s -> lands back at ~2.5s
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(600);
    const timeAfterArrowLeft = await page.evaluate(() => {
      const win = window as any;
      return (win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement).currentTime;
    });
    console.log("Time after ArrowLeft (-10s):", timeAfterArrowLeft);
    expect(timeAfterArrowLeft).toBeLessThan(timeAfterArrowRight);
    expect(timeAfterArrowLeft).toBeLessThanOrEqual(5.0);

    // 8. Test Pause and Resume
    await page.keyboard.press("Space");
    await page.waitForTimeout(500);
    const pausedState = await page.evaluate(() => {
      const win = window as any;
      return (win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement).paused;
    });
    console.log("Paused state after Spacebar:", pausedState);
    expect(pausedState).toBe(true);

    await page.keyboard.press("Space");
    await page.waitForTimeout(1000);
    const resumedState = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return { paused: audio.paused, currentTime: audio.currentTime };
    });
    console.log("Resumed state after Spacebar:", resumedState);
    expect(resumedState.paused).toBe(false);
    expect(resumedState.currentTime).toBeGreaterThan(timeAfterArrowLeft);

    // 9. Confirm zero AbortErrors throughout the entire cycle
    expect(abortErrors).toEqual([]);
    console.log("VERIFICATION SUCCESS: Web Audio API Tap passed all core-loop tests with zero AbortErrors!");

    await context.close();
  });
});
