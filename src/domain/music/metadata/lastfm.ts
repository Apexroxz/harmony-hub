import axios from "axios";

const LAST_FM_API_KEY = import.meta.env.VITE_LASTFM_API_KEY;

const LAST_FM_BASE_URL =
  "https://ws.audioscrobbler.com/2.0/";

export async function fetchMetadata(
  artist: string,
  track: string
) {
  try {
    const response = await axios.get(
      LAST_FM_BASE_URL,
      {
        params: {
          method: "track.getInfo",
          artist,
          track,
          api_key: LAST_FM_API_KEY,
          format: "json",
        },
      }
    );

    return response.data.track;

  } catch (error) {
    console.error(
      "Metadata fetch failed:",
      error
    );

    return null;
  }
}
