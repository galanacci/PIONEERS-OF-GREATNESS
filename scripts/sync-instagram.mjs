import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { validateFieldNotes } from "./validate-content.mjs";

const accessToken = process.env.INSTAGRAM_ACCESS_TOKEN;
const userId = process.env.INSTAGRAM_USER_ID || "me";
// Instagram launched in 2010, so this captures the account's complete available history.
const since = process.env.FIELD_NOTES_SINCE || "2010-01-01T00:00:00Z";
const apiVersion = process.env.INSTAGRAM_API_VERSION || "v24.0";
const graphBase = `https://graph.instagram.com/${apiVersion}`;
const archivePath = join("data", "field-notes.json");
const assetRoot = join("src", "field-notes");

if (!accessToken) {
    throw new Error("INSTAGRAM_ACCESS_TOKEN is required.");
}

if (Number.isNaN(Date.parse(since))) {
    throw new Error("FIELD_NOTES_SINCE must be a valid ISO date.");
}

const fields = [
    "id",
    "caption",
    "media_type",
    "media_url",
    "permalink",
    "thumbnail_url",
    "timestamp",
    "children{media_type,media_url,thumbnail_url}"
].join(",");

function buildFirstPageUrl() {

    const url = new URL(`${graphBase}/${userId}/media`);
    url.searchParams.set("fields", fields);
    url.searchParams.set("limit", "100");
    url.searchParams.set("access_token", accessToken);
    return url;

}

async function requestJson(url) {

    const response = await fetch(url, {
        headers: { "User-Agent": "PoG-Field-Notes-Sync/1.0" }
    });

    if (!response.ok) {
        const body = await response.text();
        throw new Error(`Instagram API request failed (${response.status}): ${body.slice(0, 300)}`);
    }

    return response.json();

}

async function fetchMedia() {

    const collected = [];
    let nextUrl = buildFirstPageUrl();
    let reachedCutoff = false;

    while (nextUrl && !reachedCutoff) {
        const page = await requestJson(nextUrl);

        for (const item of page.data || []) {
            if (!item.timestamp || Date.parse(item.timestamp) < Date.parse(since)) {
                reachedCutoff = true;
                break;
            }

            collected.push(item);
        }

        nextUrl = page.paging?.next || null;
    }

    return collected;

}

function safeDirectoryName(item) {

    const date = item.timestamp.slice(0, 10);
    return `${date}-${item.id.replace(/[^a-zA-Z0-9_-]/g, "")}`;

}

function mediaSources(item) {

    const media = item.media_type === "CAROUSEL_ALBUM"
        ? item.children?.data || []
        : [item];

    return media
        .map((part) => ({
            type: part.media_type,
            url: part.media_type === "VIDEO" ? part.thumbnail_url : part.media_url
        }))
        .filter((part) => Boolean(part.url));

}

async function downloadImage(url, destinationWithoutExtension) {

    const response = await fetch(url, {
        headers: { "User-Agent": "PoG-Field-Notes-Sync/1.0" }
    });

    if (!response.ok) {
        throw new Error(`Media download failed (${response.status}).`);
    }

    const destination = `${destinationWithoutExtension}.webp`;
    const bytes = Buffer.from(await response.arrayBuffer());
    await sharp(bytes)
        .rotate()
        .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
        .webp({ quality: 82, effort: 5 })
        .toFile(destination);
    return destination.replaceAll("\\", "/");

}

async function createNote(item) {

    const directory = join(assetRoot, safeDirectoryName(item));
    await mkdir(directory, { recursive: true });

    const sources = mediaSources(item);
    const images = [];

    for (const [index, source] of sources.entries()) {
        const number = String(index + 1).padStart(2, "0");
        images.push(await downloadImage(source.url, join(directory, number)));
    }

    if (images.length === 0) {
        throw new Error(`Instagram media ${item.id} did not provide a usable image.`);
    }

    return {
        id: item.id,
        timestamp: item.timestamp,
        caption: item.caption?.trim() || "",
        mediaType: item.media_type,
        images,
        instagramUrl: item.permalink
    };

}

async function readExistingArchive() {

    try {
        return JSON.parse(await readFile(archivePath, "utf8"));
    } catch (error) {
        if (error.code === "ENOENT") return { notes: [] };
        throw error;
    }

}

function assignEntryNumbers(notes) {

    const chronological = [...notes].sort((a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp));
    const totalDigits = Math.max(3, String(chronological.length).length);

    chronological.forEach((note, index) => {
        note.entry = `FIELD NOTE ${String(index + 1).padStart(totalDigits, "0")}`;
    });

    return chronological.reverse();

}

async function run() {

    await mkdir(assetRoot, { recursive: true });
    await mkdir("data", { recursive: true });

    const existingArchive = await readExistingArchive();
    const existingById = new Map((existingArchive.notes || []).map((note) => [note.id, note]));
    // Field Notes is an editorial archive of feed posts, not a mirror of Reels.
    const media = (await fetchMedia())
        .filter((item) => item.permalink?.includes("/p/"));
    if (media.length === 0) {
        throw new Error("Instagram returned no eligible regular posts; archive update aborted.");
    }
    let imported = 0;
    let updated = 0;

    for (const item of media) {
        const existing = existingById.get(item.id);

        if (existing) {
            const refreshed = {
                ...existing,
                timestamp: item.timestamp,
                caption: item.caption?.trim() || "",
                mediaType: item.media_type,
                instagramUrl: item.permalink
            };
            const comparableKeys = ["timestamp", "caption", "mediaType", "instagramUrl"];
            const hasChanged = comparableKeys.some((key) => refreshed[key] !== existing[key]);

            if (hasChanged) {
                existingById.set(item.id, refreshed);
                updated += 1;
            }

            continue;
        }

        const note = await createNote(item);
        existingById.set(note.id, note);
        imported += 1;
    }

    const notes = assignEntryNumbers(
        [...existingById.values()].filter((note) => (
            Date.parse(note.timestamp) >= Date.parse(since)
            && note.instagramUrl?.includes("/p/")
        ))
    );

    const archive = {
        generatedAt: imported > 0 || updated > 0
            ? new Date().toISOString()
            : existingArchive.generatedAt || null,
        since,
        notes
    };

    await validateFieldNotes(archive);
    await writeFile(archivePath, `${JSON.stringify(archive, null, 2)}\n`, "utf8");
    console.log(`Field Notes sync complete: ${imported} imported, ${updated} updated, ${notes.length} total.`);

}

await run();
