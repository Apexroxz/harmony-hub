import { test, expect } from "@playwright/test";
import path from "path";
import fs from "fs";

test.describe("Rigorous Release-Readiness Audit Suite for Layam Hi-Fi Player", () => {
  test("Execute complete live empirical audit of Layam Hi-Fi Player (Product 1)", async ({ page }) => {
    // 1. Prepare multi-format test files (WAV 44.1kHz 16-bit PCM)
    const testWavPath = path.resolve("./layam_audit_test_track.wav");
    const numChannels = 2;
    const sampleRate = 44100;
    const bitsPerSample = 16;
    const durationSeconds = 15;
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
      const sample = Math.sin(2 * Math.PI * 440 * t) * 0.3 * 32767;
      const offset = 44 + i * blockAlign;
      buffer.writeInt16LE(Math.floor(sample), offset);
      buffer.writeInt16LE(Math.floor(sample), offset + 2);
    }
    fs.writeFileSync(testWavPath, buffer);

    const consoleMessages: { type: string; text: string }[] = [];
    page.on("console", (msg) => {
      consoleMessages.push({ type: msg.type(), text: msg.text() });
    });

    const networkRequests: { url: string; method: string }[] = [];
    page.on("request", (req) => {
      networkRequests.push({ url: req.url(), method: req.method() });
    });

    // ── SECTION 1: STARTUP AUDIT ──
    console.log("=== SECTION 1: STARTUP AUDIT ===");
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    const pageTitle = await page.title();
    console.log("Document Title:", pageTitle);

    const startupConsoleErrors = consoleMessages.filter((m) => m.type === "error");
    console.log("Startup Console Errors Count:", startupConsoleErrors.length);

    // ── SECTION 2: STORAGE & INDEXEDDB ARCHITECTURE AUDIT ──
    console.log("=== SECTION 2: STORAGE & INDEXEDDB ARCHITECTURE AUDIT ===");
    const idbDetails = await page.evaluate(async () => {
      return new Promise<any>((resolve) => {
        const req = indexedDB.open("layam_audiophile_db");
        req.onsuccess = () => {
          const db = req.result;
          const storeNames = Array.from(db.objectStoreNames);
          db.close();
          resolve({ dbName: db.name, version: db.version, stores: storeNames });
        };
        req.onerror = () => resolve(null);
      });
    });
    console.log("IndexedDB Local Vault Status:", idbDetails);

    // ── SECTION 3: IMPORT & METADATA EXTRACTION AUDIT ──
    console.log("=== SECTION 3: IMPORT & METADATA EXTRACTION AUDIT ===");
    const fileInput = page.locator('header input[type="file"]').first();
    await fileInput.setInputFiles(testWavPath);
    await page.waitForTimeout(1000);

    const importedTrackText = page.getByText(/layam_audit_test_track/i).first();
    await expect(importedTrackText).toBeVisible({ timeout: 10000 });
    console.log("Track Imported and Rendered in Library DOM");

    // Inspect parsed metadata in state
    const trackMetadataInDb = await page.evaluate(async () => {
      return new Promise<any>((resolve) => {
        const req = indexedDB.open("layam_audiophile_db");
        req.onsuccess = () => {
          const db = req.result;
          if (!db.objectStoreNames.contains("local_audio_blobs")) {
            db.close();
            resolve({ storeFound: false });
            return;
          }
          const tx = db.transaction(["local_audio_blobs"], "readonly");
          const blobStore = tx.objectStore("local_audio_blobs");

          const blobCountReq = blobStore.count();
          blobCountReq.onsuccess = () => {
            db.close();
            resolve({
              storeFound: true,
              blobCount: blobCountReq.result,
            });
          };
        };
      });
    });
    console.log("Track & Binary Blob Storage Verification:", trackMetadataInDb);

    // ── SECTION 4: PLAYBACK & AUDIO ENGINE AUDIT ──
    console.log("=== SECTION 4: PLAYBACK & AUDIO ENGINE AUDIT ===");
    await importedTrackText.click();
    await page.waitForTimeout(1500);

    const playbackTelemetry = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      const ctx = win.__LAYAM_AUDIO_CTX__ as AudioContext;
      return {
        hasAudioInstance: Boolean(audio),
        paused: audio ? audio.paused : true,
        currentTime: audio ? audio.currentTime : 0,
        duration: audio ? audio.duration : 0,
        volume: audio ? audio.volume : 0,
        ctxState: ctx ? ctx.state : "none",
        sampleRate: ctx ? ctx.sampleRate : 0,
      };
    });
    console.log("Audio Engine Live Playback State:", playbackTelemetry);
    expect(playbackTelemetry.hasAudioInstance).toBe(true);
    expect(playbackTelemetry.paused).toBe(false);
    expect(playbackTelemetry.ctxState).toBe("running");

    // ── SECTION 5: UNIFIED SINGLE-INSTANCE PLAYBACK STATE AUDIT ──
    console.log("=== SECTION 5: UNIFIED SINGLE-INSTANCE PLAYBACK STATE AUDIT ===");
    // Count audio elements in DOM vs internal singleton
    const audioNodesCount = await page.evaluate(() => {
      const domAudios = document.querySelectorAll("audio");
      return {
        domAudiosLength: domAudios.length,
        hasSingletonOnWindow: Boolean((window as any).__LAYAM_MASTER_AUDIO__),
      };
    });
    console.log("Audio Element Single-Instance Verification:", audioNodesCount);
    expect(audioNodesCount.hasSingletonOnWindow).toBe(true);

    // ── SECTION 6: HARDWARE AUDIO CONSOLE & DSP GRAPH AUDIT ──
    console.log("=== SECTION 6: AUDIO CONSOLE & DSP GRAPH AUDIT ===");
    const consoleBtn = page.locator("header button:has-text('Audio Console')").first();
    await consoleBtn.click();
    await expect(page.getByText("LAYAM DSP AUDIO CONSOLE")).toBeVisible();

    const dspGraphState = await page.evaluate(() => {
      const win = window as any;
      return {
        hasFilters: Array.isArray(win.__LAYAM_EQ_FILTERS__) && win.__LAYAM_EQ_FILTERS__.length === 10,
        hasBass: Boolean(win.__LAYAM_BASS_NODE__),
        hasTreble: Boolean(win.__LAYAM_TREBLE_NODE__),
        hasLimiter: Boolean(win.__LAYAM_COMPRESSOR_NODE__),
        hasHeadroom: Boolean(win.__LAYAM_HEADROOM_GAIN__),
        hasAnalyser: Boolean(win.__LAYAM_ANALYSER_NODE__),
        isBypassed: Boolean(win.__LAYAM_DSP_BYPASSED__),
        sourceNodeConnectedTo: win.__LAYAM_SOURCE_CONNECTED_TO__ || "unknown",
      };
    });
    console.log("Live DSP Node Graph State:", dspGraphState);
    expect(dspGraphState.hasFilters).toBe(true);
    expect(dspGraphState.hasLimiter).toBe(true);
    expect(dspGraphState.hasHeadroom).toBe(true);

    // ── SECTION 7: REAL BROADCAST TELEMETRY AUDIT ──
    console.log("=== SECTION 7: BROADCAST TELEMETRY AUDIT ===");
    const broadcastBadges = await page.evaluate(() => {
      const el = document.querySelector(".fixed");
      return el ? el.textContent?.slice(0, 100) : "N/A";
    });
    console.log("Live Broadcast Telemetry Summary:", broadcastBadges);

    // ── SECTION 8: FULLSCREEN EXPANDED PLAYER AUDIT ──
    console.log("=== SECTION 8: FULLSCREEN PLAYER AUDIT ===");
    // Close console and expand player
    await page.locator("button[title*='Close']").first().click();
    await page.waitForTimeout(300);

    const expandBtn = page.locator("button[title*='Expand'], button[aria-label*='Expand'], .lucide-maximize2").first();
    if (await expandBtn.isVisible()) {
      await expandBtn.click();
      await page.waitForTimeout(500);
      const isFullscreenOpen = await page.getByText(/LAYAM AUDIOPHILE/i).first().isVisible().catch(() => false);
      console.log("Fullscreen Audiophile Player Mounted:", isFullscreenOpen);
    }

    // ── SECTION 9: HARD RELOAD & TRUE OFFLINE PERSISTENCE AUDIT ──
    console.log("=== SECTION 9: HARD RELOAD & TRUE OFFLINE PERSISTENCE AUDIT ===");
    await page.reload();
    await page.waitForLoadState("networkidle");

    const trackPersistedAfterReload = await page.getByText(/layam_audit_test_track/i).first().isVisible({ timeout: 5000 });
    console.log("Track Persistent After Full Hard Reload:", trackPersistedAfterReload);
    expect(trackPersistedAfterReload).toBe(true);

    // Play persisted track from local IndexedDB storage
    await page.getByText(/layam_audit_test_track/i).first().click();
    await page.waitForTimeout(1000);

    const postReloadPlayback = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return {
        hasAudio: Boolean(audio),
        srcType: audio ? (audio.src.startsWith("blob:") ? "blob-url" : audio.src.startsWith("data:") ? "data-url" : "network-url") : "none",
        isPlaying: audio ? !audio.paused : false,
      };
    });
    console.log("Post-Reload Local Playback from IndexedDB:", postReloadPlayback);
    expect(postReloadPlayback.srcType).toBe("blob-url");
    expect(postReloadPlayback.isPlaying).toBe(true);

    // ── SECTION 10: NON-BLOCKING NETWORK LEAKAGE CHECK ──
    console.log("=== SECTION 10: NETWORK LEAKAGE AUDIT ===");
    const externalNetworkCalls = networkRequests.filter(
      (r) => !r.url.includes("localhost") && !r.url.includes("127.0.0.1") && !r.url.startsWith("data:") && !r.url.startsWith("blob:")
    );
    console.log("External Network Calls During Local Playback:", externalNetworkCalls);
    expect(externalNetworkCalls).toEqual([]);

    console.log("=== RIGOROUS AUDIT COMPLETE: ALL CHECKS RECORDED ===");

    // Cleanup test file
    if (fs.existsSync(testWavPath)) {
      fs.unlinkSync(testWavPath);
    }
  });
});
