import { access, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const FIELD_NOTES_PATH = "data/field-notes.json";
const DOCUMENTARY_PATH = "data/documentary.json";
const GREATNESS_POEM_PATH = "data/greatness-poem.json";

function assert(condition, message) {
    if (!condition) throw new Error(message);
}

function validDate(value) {
    return typeof value === "string" && !Number.isNaN(Date.parse(value));
}

async function readJson(path) {
    return JSON.parse(await readFile(path, "utf8"));
}

export async function validateFieldNotes(payload, { requireFiles = true } = {}) {
    assert(payload && typeof payload === "object", "Field Notes payload must be an object.");
    assert(validDate(payload.since), "Field Notes 'since' must be a valid date.");
    assert(Array.isArray(payload.notes) && payload.notes.length > 0, "Field Notes must contain at least one note.");
    const ids = new Set();
    for (const note of payload.notes) {
        assert(typeof note.id === "string" && note.id, "Every Field Note needs an id.");
        assert(!ids.has(note.id), `Duplicate Field Note id: ${note.id}`);
        ids.add(note.id);
        assert(/^FIELD NOTE \d{3,}$/.test(note.entry), `Invalid entry label for ${note.id}.`);
        assert(validDate(note.timestamp), `Invalid timestamp for ${note.id}.`);
        assert(Array.isArray(note.images) && note.images.length > 0, `Field Note ${note.id} has no images.`);
        assert(note.images.every((path) => path.endsWith(".webp")), `Field Note ${note.id} contains a non-WebP derivative.`);
        assert(/^https:\/\/(www\.)?instagram\.com\/p\//.test(note.instagramUrl), `Field Note ${note.id} is not a regular Instagram post.`);
        if (requireFiles) await Promise.all(note.images.map((path) => access(path)));
    }
}

export function validateDocumentary(payload) {
    assert(payload && typeof payload === "object", "Documentary payload must be an object.");
    assert(typeof payload.playlistId === "string" && payload.playlistId, "Documentary playlistId is required.");
    assert(Array.isArray(payload.episodes) && payload.episodes.length > 0, "Documentary must contain at least one episode.");
    const ids = new Set();
    payload.episodes.forEach((episode, index) => {
        assert(typeof episode.videoId === "string" && episode.videoId, `Episode ${index} has no videoId.`);
        assert(!ids.has(episode.videoId), `Duplicate documentary videoId: ${episode.videoId}`);
        ids.add(episode.videoId);
        assert(/^EPISODE \d{3,}$/.test(episode.episode), `Invalid episode label at index ${index}.`);
        assert(validDate(episode.publishedAt), `Invalid published date for ${episode.videoId}.`);
    });
}

export function validateGreatnessPoem(payload) {
    assert(payload && typeof payload === "object", "GREATNESS poem payload must be an object.");
    assert(Number.isInteger(payload.version) && payload.version > 0, "GREATNESS poem version must be a positive integer.");
    assert(payload.title === "GREATNESS POEM", "GREATNESS poem title must be GREATNESS POEM.");
    assert(typeof payload.placeholder === "boolean", "GREATNESS poem placeholder flag must be boolean.");
    assert(Array.isArray(payload.paragraphs) && payload.paragraphs.length > 0, "GREATNESS poem must contain at least one paragraph.");
    assert(payload.paragraphs.every((paragraph) => typeof paragraph === "string" && paragraph.trim()), "GREATNESS poem paragraphs cannot be empty.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [fieldNotes, documentary, greatnessPoem] = await Promise.all([
        readJson(FIELD_NOTES_PATH),
        readJson(DOCUMENTARY_PATH),
        readJson(GREATNESS_POEM_PATH)
    ]);
    await validateFieldNotes(fieldNotes);
    validateDocumentary(documentary);
    validateGreatnessPoem(greatnessPoem);
    console.log(`Content valid: ${fieldNotes.notes.length} Field Notes, ${documentary.episodes.length} UNCUT episodes and ${greatnessPoem.title} v${greatnessPoem.version}.`);
}
