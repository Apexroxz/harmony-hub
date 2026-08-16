import { test, expect } from "@playwright/test";

test.describe("Legacy Demo Purge & User Music Preservation", () => {
  test("Automatically purges legacy demo songs while strictly preserving all user-imported Weeknd tracks", async ({
    page,
  }) => {
    await page.goto("http://localhost:8081/");
    await page.waitForLoadState("networkidle");

    // Seed mock mixed state (user tracks + legacy demo tracks) to verify automatic pruning
    await page.evaluate(() => {
      const mixedTracks = [
        {
          id: "local-imported-1-weeknd-1",
          title: "the_weeknd_-_love_in_the_sky_(mp3.pm)",
          artistName: "Local Artist",
          artist: "Local Artist",
          album: "Imported Files",
          quality: "MP3",
          format: "MP3",
          duration: 180,
          source: "offline",
          fileSizeBytes: 4200000,
        },
        {
          id: "local-imported-2-weeknd-2",
          title: "The_Weeknd_-_Earned_It_IY_Flip_(mp3.pm)",
          artistName: "Local Artist",
          artist: "Local Artist",
          album: "Imported Files",
          quality: "MP3",
          format: "MP3",
          duration: 180,
          source: "offline",
          fileSizeBytes: 4500000,
        },
        {
          id: "local-imported-3-weeknd-3",
          title: "TheWeeknd_-_starboy_original_(mp3.pm)",
          artistName: "Local Artist",
          artist: "Local Artist",
          album: "Imported Files",
          quality: "MP3",
          format: "MP3",
          duration: 180,
          source: "offline",
          fileSizeBytes: 4800000,
        },
        {
          id: "midnight-protocol",
          title: "Midnight Protocol",
          artistName: "Neon Drifter",
          artist: "Neon Drifter",
          album: "Midnight Sessions",
          quality: "FLAC",
          format: "FLAC",
          duration: 371,
          source: "online",
        },
        {
          id: "phantom-waves",
          title: "Phantom Waves",
          artistName: "Solana Siren",
          artist: "Solana Siren",
          album: "Phantom Album",
          quality: "WAV",
          format: "WAV",
          duration: 337,
          source: "online",
        },
        {
          id: "hash-rate",
          title: "Hash Rate",
          artistName: "Byte Bass",
          artist: "Byte Bass",
          album: "Hash Album",
          quality: "ALAC",
          format: "ALAC",
          duration: 342,
          source: "online",
        },
      ];

      localStorage.setItem("layam_local_tracks", JSON.stringify(mixedTracks));
    });

    // Reload page to let OfflineService.getTracks() run the filter
    await page.reload();
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(500);

    // Verify localStorage tracks after filter
    const activeTracks = await page.evaluate(() => {
      const stored = localStorage.getItem("layam_local_tracks");
      return stored ? JSON.parse(stored) : [];
    });

    console.log("Active tracks in library after automatic demo purge:", activeTracks.map((t: any) => t.title));

    // Assert exact count is 3
    expect(activeTracks.length).toBe(3);

    // Assert all 3 Weeknd tracks are present
    expect(activeTracks.some((t: any) => t.title.includes("love_in_the_sky"))).toBe(true);
    expect(activeTracks.some((t: any) => t.title.includes("Earned_It"))).toBe(true);
    expect(activeTracks.some((t: any) => t.title.includes("starboy"))).toBe(true);

    // Assert demo tracks are completely purged
    expect(activeTracks.some((t: any) => t.title === "Midnight Protocol")).toBe(false);
    expect(activeTracks.some((t: any) => t.title === "Phantom Waves")).toBe(false);
    expect(activeTracks.some((t: any) => t.title === "Hash Rate")).toBe(false);

    // Verify UI reflects exactly 3 user tracks
    await expect(page.getByText(/love_in_the_sky/i).first()).toBeVisible();
    await expect(page.getByText(/Earned_It/i).first()).toBeVisible();
    await expect(page.getByText(/starboy/i).first()).toBeVisible();

    // Verify demo tracks do NOT exist in the DOM
    await expect(page.getByText("Midnight Protocol")).toHaveCount(0);
    await expect(page.getByText("Phantom Waves")).toHaveCount(0);
    await expect(page.getByText("Hash Rate")).toHaveCount(0);
  });
});
