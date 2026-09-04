import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { validateDocumentary } from "./validate-content.mjs";

const apiKey = process.env.YOUTUBE_API_KEY;
const playlistId = process.env.YOUTUBE_PLAYLIST_ID || "PL_UEBZlt-mUL5Hc2zGP4_Xsr6ayZAtWs3";
const archivePath = join("data", "documentary.json");
const apiBase = "https://www.googleapis.com/youtube/v3/playlistItems";

if (!apiKey) {
    throw new Error("YOUTUBE_API_KEY is required.");
}

async function requestPage(pageToken) {

    const url = new URL(apiBase);
    url.searchParams.set("part", "snippet,contentDetails,status");
    url.searchParams.set("playlistId", playlistId);
    url.searchParams.set("maxResults", "50");
    url.searchParams.set("key", apiKey);
    if (pageToken) url.searchParams.set("pageToken", pageToken);

    const response = await fetch(url, {
        headers: { "User-Agent": "PoG-UNCUT-Sync/1.0" }
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`YouTube API request failed (${response.status}): ${body.slice(0, 300)}`);
    }

    return response.json();

}

async function fetchPlaylist() {

    const items = [];
    let pageToken;

    do {
        const page = await requestPage(pageToken);
        items.push(...(page.items || []));
        pageToken = page.nextPageToken;
    } while (pageToken);

    return items;

}

function buildArchive(items) {

    const available = items.filter((item) => {
        const title = item.snippet?.title || "";
        return item.contentDetails?.videoId && !["Deleted video", "Private video"].includes(title);
    });

    return available.map((item, index) => {
        const snippet = item.snippet;
        const videoId = item.contentDetails.videoId;

        return {
            episode: `EPISODE ${String(available.length - index).padStart(3, "0")}`,
            playlistPosition: Number.isInteger(snippet.position) ? snippet.position : index,
            videoId,
            title: snippet.title || "UNTITLED",
            description: snippet.description || "",
            publishedAt: snippet.videoPublishedAt || snippet.publishedAt,
            thumbnail: snippet.thumbnails?.maxres?.url
                || snippet.thumbnails?.standard?.url
                || snippet.thumbnails?.high?.url
                || snippet.thumbnails?.medium?.url
                || snippet.thumbnails?.default?.url
                || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
            youtubeUrl: `https://www.youtube.com/watch?v=${videoId}&list=${playlistId}`
        };
    });

}

const items = await fetchPlaylist();
const episodes = buildArchive(items);
if (episodes.length === 0) {
    throw new Error("YouTube returned no playable episodes; archive update aborted.");
}

const archive = {
    playlistId,
    syncedAt: new Date().toISOString(),
    episodes
};
validateDocumentary(archive);

await mkdir(dirname(archivePath), { recursive: true });
await writeFile(archivePath, `${JSON.stringify(archive, null, 2)}\n`, "utf8");

console.log(`Synced ${episodes.length} UNCUT episode${episodes.length === 1 ? "" : "s"}.`);
