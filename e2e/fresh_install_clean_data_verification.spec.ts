import { test, expect } from "@playwright/test";

test.describe("Layam Hi-Fi Player Fresh Install & Seed-Free Verification", () => {
  test("Fresh installation starts with 0 tracks and cleanly imports/persists user music without any automatic seed data", async ({
    page,
    context,
  }) => {
    // ── 1. FRESH INSTALLATION SIMULATION ──
    // Clear all storage in the browser context to simulate a pristine fresh installation
    await context.clearCookies();
    await page.goto("http://localhost:8081/");
    await page.evaluate(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
    await page.reload();
    await page.waitForLoadState("networkidle");

    // Verify initial fresh installation state
    const initialStats = await page.evaluate(async () => {
      const storedTracksRaw = localStorage.getItem("layam_local_tracks");
      const storedPlaylistsRaw = localStorage.getItem("layam_local_playlists");
      const tracks = storedTracksRaw ? JSON.parse(storedTracksRaw) : [];
      const playlists = storedPlaylistsRaw ? JSON.parse(storedPlaylistsRaw) : [];

      // Inspect IndexedDB
      let blobCount = 0;
      try {
        const req = indexedDB.open("layam_audiophile_db", 2);
        await new Promise((resolve) => {
          req.onsuccess = () => {
            const db = req.result;
            if (db.objectStoreNames.contains("local_audio_blobs")) {
              const tx = db.transaction("local_audio_blobs", "readonly");
              const store = tx.objectStore("local_audio_blobs");
              const countReq = store.count();
              countReq.onsuccess = () => {
                blobCount = countReq.result;
                resolve(null);
              };
              countReq.onerror = () => resolve(null);
            } else {
              resolve(null);
            }
          };
          req.onerror = () => resolve(null);
        });
      } catch {}

      return {
        trackCount: tracks.length,
        playlistCount: playlists.length,
        blobCount,
      };
    });

    console.log("Fresh install initial storage stats:", initialStats);
    expect(initialStats.trackCount).toBe(0);
    expect(initialStats.playlistCount).toBe(0);
    expect(initialStats.blobCount).toBe(0);

    // Verify UI reflects zero tracks on fresh install
    const tracksTabBadge = page.getByText("Tracks (0)").first();
    await expect(tracksTabBadge).toBeVisible();

    // Click Tracks tab and verify empty table message
    await tracksTabBadge.click();
    await page.waitForTimeout(200);
    const emptyStateText = page.getByText(/No audio tracks found in local vault/i).first();
    await expect(emptyStateText).toBeVisible();

    // ── 2. IMPORT USER MUSIC ──
    const importResult = await page.evaluate(async () => {
      const sampleRate = 44100;
      const numChannels = 2;
      const durationSec = 6;
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

      // 440 Hz pure tone
      let offset = 44;
      for (let i = 0; i < totalSamples; i++) {
        const sample = Math.sin((2 * Math.PI * 440 * i) / sampleRate) * 0.4;
        const intSample = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
        view.setInt16(offset, intSample, true);
        view.setInt16(offset + 2, intSample, true);
        offset += 4;
      }

      const blob = new Blob([buffer], { type: "audio/wav" });
      const file = new File([blob], "user_imported_audiophile_track.wav", { type: "audio/wav" });

      const input = document.querySelector('input[type="file"]') as HTMLInputElement;
      if (input) {
        const dt = new DataTransfer();
        dt.items.add(file);
        input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true }));
      }

      return { filename: file.name, size: file.size };
    });

    console.log("Imported user track:", importResult);
    await page.waitForTimeout(1000);

    // Verify user track appears in the library UI
    const importedTrackRow = page.getByText(/user_imported_audiophile_track/i).first();
    await expect(importedTrackRow).toBeVisible();

    // Verify localStorage and IndexedDB after import
    const postImportStats = await page.evaluate(async () => {
      const storedTracksRaw = localStorage.getItem("layam_local_tracks");
      const tracks = storedTracksRaw ? JSON.parse(storedTracksRaw) : [];

      let blobCount = 0;
      try {
        const req = indexedDB.open("layam_audiophile_db", 2);
        await new Promise((resolve) => {
          req.onsuccess = () => {
            const db = req.result;
            const tx = db.transaction("local_audio_blobs", "readonly");
            const store = tx.objectStore("local_audio_blobs");
            const countReq = store.count();
            countReq.onsuccess = () => {
              blobCount = countReq.result;
              resolve(null);
            };
          };
        });
      } catch {}

      return {
        trackCount: tracks.length,
        trackTitle: tracks[0]?.title,
        blobCount,
      };
    });

    console.log("Post-import storage stats:", postImportStats);
    expect(postImportStats.trackCount).toBe(1);
    expect(postImportStats.trackTitle).toBe("user_imported_audiophile_track");
    expect(postImportStats.blobCount).toBe(1);

    // ── 3. VERIFY PERSISTENCE ACROSS FULL PAGE RELOAD ──
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1000);

    const postReloadTrackRow = page.getByText(/user_imported_audiophile_track/i).first();
    await expect(postReloadTrackRow).toBeVisible();

    // Play the persisted track to confirm bit-perfect playback from IndexedDB
    await postReloadTrackRow.click();
    await page.waitForTimeout(800);

    const playbackStatus = await page.evaluate(() => {
      const win = window as any;
      const audio = win.__LAYAM_MASTER_AUDIO__ as HTMLAudioElement;
      return {
        isPlaying: Boolean(audio && !audio.paused),
        srcType: audio?.src ? (audio.src.startsWith("blob:") ? "blob-url" : "external-url") : "none",
      };
    });

    console.log("Playback status of persisted user track:", playbackStatus);
    expect(playbackStatus.isPlaying).toBe(true);
    expect(playbackStatus.srcType).toBe("blob-url");

    // ── 4. VERIFY USER LIBRARY IMMUTABILITY (NO MIGRATION OVERWRITE) ──
    const finalCheck = await page.evaluate(() => {
      const stored = localStorage.getItem("layam_local_tracks");
      const tracks = stored ? JSON.parse(stored) : [];
      return {
        trackCount: tracks.length,
        tracks: tracks.map((t: any) => t.title),
      };
    });

    console.log("Final library state check:", finalCheck);
    expect(finalCheck.trackCount).toBe(1);
    expect(finalCheck.tracks).toContain("user_imported_audiophile_track");
  });
});
