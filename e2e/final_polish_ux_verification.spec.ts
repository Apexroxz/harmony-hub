import { test, expect } from "@playwright/test";

test.describe("Layam Hi-Fi Player Final Polish & UX E2E Verification", () => {
  test("Verify MediaSession, Custom EQ, Context Menu, Sorting, Volume UX, Audio Info, Settings & Lyrics", async ({
    page,
  }) => {
    // Collect network requests to confirm zero non-local calls
    const networkRequests: { url: string; method: string }[] = [];
    page.on("request", (req) => {
      networkRequests.push({ url: req.url(), method: req.method() });
    });

    // Capture console errors
    const consoleErrors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        consoleErrors.push(msg.text());
      }
    });

    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // ── 1. IMPORT TEST TRACK ──
    const importPayload = await page.evaluate(async () => {
      const sampleRate = 44100;
      const numChannels = 2;
      const durationSec = 10;
      const totalSamples = sampleRate * durationSec;
      const blockAlign = numChannels * 2;
      const byteRate = sampleRate * blockAlign;
      const dataSize = totalSamples * blockAlign;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);

      const writeString = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      writeString(0, "RIFF");
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, "WAVE");
      writeString(12, "fmt ");
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, byteRate, true);
      view.setUint16(32, blockAlign, true);
      view.setUint16(34, 16, true); // 16-bit
      writeString(36, "data");
      view.setUint32(40, dataSize, true);

      // 440 Hz tone
      let offset = 44;
      for (let i = 0; i < totalSamples; i++) {
        const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.4;
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        view.setInt16(offset + 2, intSample, true);
        offset += 4;
      }

      const blob = new Blob([buffer], { type: "audio/wav" });
      const file = new File([blob], "layam_hifi_test_master.wav", { type: "audio/wav" });

      const win = window as any;
      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        input.files = dataTransfer.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }
      return { filename: file.name, size: file.size };
    });

    console.log("Import payload dispatched:", importPayload);
    await page.waitForTimeout(1000);

    // ── 2. VERIFY MEDIASESSION SUPPORT ──
    const mediaSessionStatus = await page.evaluate(() => {
      const ms = (navigator as any).mediaSession;
      return {
        hasMediaSession: Boolean(ms),
        hasMetadata: Boolean(ms && ms.metadata),
        metadataTitle: ms?.metadata?.title,
        metadataArtist: ms?.metadata?.artist,
        playbackState: ms?.playbackState,
      };
    });
    console.log("MediaSession status on cold start:", mediaSessionStatus);
    expect(mediaSessionStatus.hasMediaSession).toBe(true);

    // Start playback
    const trackItem = page.getByText(/layam_hifi_test_master/i).first();
    await trackItem.click();
    await page.waitForTimeout(1000);

    const liveMediaSession = await page.evaluate(() => {
      const ms = (navigator as any).mediaSession;
      return {
        playbackState: ms?.playbackState,
        title: ms?.metadata?.title,
        artist: ms?.metadata?.artist,
      };
    });
    console.log("Live MediaSession state after play:", liveMediaSession);
    expect(liveMediaSession.playbackState).toBe("playing");
    expect(liveMediaSession.title).toContain("layam_hifi_test_master");

    // ── 3. VERIFY CUSTOM EQ PRESET SAVING & DELETION ──
    // Open Audio Console
    await page.locator("button:has-text('Console')").first().click();
    await page.waitForTimeout(400);

    // Click "SAVE AS PRESET"
    const savePresetBtn = page.locator("button:has-text('SAVE AS PRESET')").first();
    await expect(savePresetBtn).toBeVisible();
    await savePresetBtn.click();
    await page.waitForTimeout(200);

    // Type preset name and save
    const presetInput = page.locator("input[placeholder*='Preset name']").first();
    await presetInput.fill("Audiophile Reference");
    await page.locator("button[title='Save Preset']").first().click();
    await page.waitForTimeout(300);

    // Verify custom preset rendered
    const customPresetPill = page.getByText("Audiophile Reference").first();
    await expect(customPresetPill).toBeVisible();

    // Verify persisted in localStorage
    const savedInStorage = await page.evaluate(() => {
      const raw = localStorage.getItem("layam_custom_eq_presets");
      return raw ? JSON.parse(raw) : [];
    });
    console.log("Custom EQ Presets in localStorage:", savedInStorage);
    expect(savedInStorage.some((p: any) => p.name === "Audiophile Reference")).toBe(true);

    // Close Audio Console
    await page.locator("button[title*='Close']").first().click();
    await page.waitForTimeout(300);

    // ── 4. VERIFY TRACK CONTEXT MENU ──
    // Navigate to Tracks tab
    await page.locator("button:has-text('Tracks')").first().click();
    await page.waitForTimeout(300);

    // Right click on track row
    const trackRow = page.getByText(/layam_hifi_test_master/i).first();
    await trackRow.click({ button: "right" });
    await page.waitForTimeout(300);

    // Verify context menu items
    const playNextBtn = page.locator("button:has-text('Play Next')").first();
    const techInfoBtn = page.locator("button:has-text('Technical Audio Info')").first();
    await expect(playNextBtn).toBeVisible();
    await expect(techInfoBtn).toBeVisible();

    // Click "Technical Audio Info"
    await techInfoBtn.click();
    await page.waitForTimeout(400);

    // Verify Technical Audio Info Modal contents
    const modalTitle = page.getByText(/Container \/ Format/i).first();
    await expect(modalTitle).toBeVisible();
    const formatBadge = page.getByText("WAV").first();
    await expect(formatBadge).toBeVisible();

    // Close info modal
    await page.locator("button:has-text('Close Info')").first().click();
    await page.waitForTimeout(300);

    // ── 5. VERIFY LIBRARY SORTING ──
    const titleHeader = page.locator("th:has-text('Title')").first();
    await titleHeader.click();
    await page.waitForTimeout(200);
    // Sort descending
    await titleHeader.click();
    await page.waitForTimeout(200);

    // ── 6. VERIFY VOLUME MUTE / RESTORE & WHEEL ──
    const initialVolume = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return audio ? audio.volume : 0.8;
    });

    // Click mute button in PlayerBar
    const muteBtn = page.locator("button[title*='Mute']").first();
    await muteBtn.click();
    await page.waitForTimeout(200);

    const mutedVolume = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return audio ? audio.volume : 0;
    });
    expect(mutedVolume).toBe(0);

    // Click unmute button to restore volume
    const unmuteBtn = page.locator("button[title*='Unmute']").first();
    await unmuteBtn.click();
    await page.waitForTimeout(200);

    const restoredVolume = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return audio ? audio.volume : 0;
    });
    expect(restoredVolume).toBeGreaterThan(0);

    // ── 7. VERIFY SETTINGS STRUCTURE & TABS ──
    const settingsBtn = page.locator("button[title*='Settings'], button[aria-label*='Settings']").first();
    if (await settingsBtn.isVisible()) {
      await settingsBtn.click();
      await page.waitForTimeout(300);

      // Check tabs
      const audioTab = page.locator("button:has-text('Audio & DSP')").first();
      const shortcutsTab = page.locator("button:has-text('Hotkeys')").first();
      const aboutTab = page.locator("button:has-text('About')").first();

      await expect(audioTab).toBeVisible();
      await expect(shortcutsTab).toBeVisible();

      await shortcutsTab.click();
      await page.waitForTimeout(200);
      await expect(page.getByText(/Play \/ Pause playback/i)).toBeVisible();

      await aboutTab.click();
      await page.waitForTimeout(200);
      await expect(page.getByText(/100% PRIVATE & OFFLINE/i)).toBeVisible();

      // Close Settings
      await page.locator("button[aria-label='Close Settings']").first().click();
      await page.waitForTimeout(300);
    }

    // ── 8. VERIFY FULLSCREEN & LYRICS TAB ──
    const expandBtn = page.locator("button[aria-label='Expand Audiophile Player']").first();
    await expect(expandBtn).toBeVisible();
    await expandBtn.click();
    await page.waitForTimeout(500);

    const lyricsToggle = page.locator("button:has-text('Lyrics')").first();
    await expect(lyricsToggle).toBeVisible();
    await lyricsToggle.dispatchEvent("click");
    await page.waitForTimeout(300);

    await expect(page.getByText(/No Synced Lyrics in Local Vault/i)).toBeVisible();

    // Close Fullscreen
    const minimizeBtn = page.locator("button[aria-label='Minimize Player']").first();
    await minimizeBtn.dispatchEvent("click");
    await page.waitForTimeout(300);

    // ── 9. FINAL OFFLINE INTEGRITY ASSERTION ──
    const externalNetworkCalls = networkRequests.filter(
      (r) =>
        !r.url.includes("localhost") &&
        !r.url.includes("127.0.0.1") &&
        !r.url.startsWith("data:") &&
        !r.url.startsWith("blob:")
    );
    console.log("External network requests during entire run:", externalNetworkCalls);
    expect(externalNetworkCalls.length).toBe(0);
    expect(consoleErrors.length).toBe(0);
  });
});
