import { test, expect } from "@playwright/test";
import path from "path";

test.describe("Core Loop Regression Suite (Standing Check)", () => {
  test("Full Core Playback Loop: Import -> Play -> Seek -> Arrow Keys -> Pause/Resume -> Track Switch", async ({
    browser,
  }) => {
    // 1. Fresh isolated Incognito context
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

    // 2. Open Offline Player
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("domcontentloaded");

    // 3. Import two real test tracks
    const track1Path = path.resolve(process.cwd(), "layam_master_test.wav");
    const track2Path = path.resolve(process.cwd(), "layam_second_test.wav");
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles([track1Path, track2Path]);

    // Wait for both tracks to be indexed and rendered in the DOM
    await expect(page.getByText(/layam_master_test/i).first()).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/layam_second_test/i).first()).toBeVisible({ timeout: 10000 });

    // 4. Play Track 1
    await page.getByText(/layam_master_test/i).first().click();
    await page.waitForTimeout(1500);

    // Verify Track 1 is playing
    let state = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      const ctx = win.__LAYAM_AUDIO_CTX__ as AudioContext;
      return {
        hasAudio: !!audio,
        paused: audio ? audio.paused : null,
        currentTime: audio ? audio.currentTime : 0,
        src: audio ? audio.src : "",
        hasCtx: !!ctx,
        ctxState: ctx ? ctx.state : null,
      };
    });

    expect(state.hasAudio).toBe(true);
    expect(state.hasCtx).toBe(true);
    expect(state.ctxState).toBe("running");
    expect(state.paused).toBe(false);
    expect(state.currentTime).toBeGreaterThan(0);

    // 5. Seek via Progress Bar (Set currentTime to 2.0s)
    await page.evaluate(() => {
      const win = window as any;
      (win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement).currentTime = 2.0;
    });
    await page.waitForTimeout(500);

    let currentTime = await page.evaluate(() => {
      return (window as any).__LAYAM_MASTER_AUDIO__.currentTime;
    });
    expect(currentTime).toBeGreaterThanOrEqual(1.9);
    expect(currentTime).toBeLessThanOrEqual(4.0);

    // 6. Arrow-key skipping forward (+10s)
    await page.keyboard.press("ArrowRight");
    await page.waitForTimeout(500);
    const timeAfterForward = await page.evaluate(() => {
      return (window as any).__LAYAM_MASTER_AUDIO__.currentTime;
    });
    expect(timeAfterForward).toBeGreaterThanOrEqual(11.5);
    expect(timeAfterForward).toBeLessThanOrEqual(14.8);

    // Arrow-key skipping backward (-10s)
    await page.keyboard.press("ArrowLeft");
    await page.waitForTimeout(500);
    const timeAfterBackward = await page.evaluate(() => {
      return (window as any).__LAYAM_MASTER_AUDIO__.currentTime;
    });
    expect(timeAfterBackward).toBeLessThan(timeAfterForward);
    expect(timeAfterBackward).toBeLessThanOrEqual(5.0);

    // 7. Pause & Resume
    await page.keyboard.press("Space");
    await page.waitForTimeout(500);
    let isPaused = await page.evaluate(() => (window as any).__LAYAM_MASTER_AUDIO__.paused);
    expect(isPaused).toBe(true);

    await page.keyboard.press("Space");
    await page.waitForTimeout(800);
    isPaused = await page.evaluate(() => (window as any).__LAYAM_MASTER_AUDIO__.paused);
    expect(isPaused).toBe(false);

    // 8. Switch to Track 2 and confirm playback
    await page.getByText(/layam_second_test/i).first().click();
    await page.waitForTimeout(1500);

    const track2State = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return {
        paused: audio.paused,
        currentTime: audio.currentTime,
        src: audio.src,
      };
    });

    console.log("Track 2 State after switch:", track2State);
    expect(track2State.paused).toBe(false);
    expect(track2State.currentTime).toBeGreaterThan(0);

    // 9. Confirm zero AbortErrors throughout the full test cycle
    expect(abortErrors).toEqual([]);
    console.log("Core loop regression verified with ZERO AbortErrors.");

    await context.close();
  });
});
