import { access, readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const FIELD_NOTES_PATH = "data/field-notes.json";
const DOCUMENTARY_PATH = "data/documentary.json";
const GREATNESS_POEM_PATH = "data/greatness-poem.json";
const FOUNDER_ROOM_PATH = "data/founder-room.json";
const PRE_POG_PATH = "data/pre-pog.json";

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
        assert(/^ENTRY \d{3,}$/.test(note.entry), `Invalid entry label for ${note.id}.`);
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
        assert(typeof episode.summary === "string" && episode.summary.trim(), `Episode ${episode.videoId} has no summary.`);
        assert(episode.summary.length <= 360, `Episode ${episode.videoId} summary is too long.`);
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

export function validateFounderRoom(payload) {
    assert(payload && typeof payload === "object", "Founder Room payload must be an object.");
    assert(Number.isInteger(payload.version) && payload.version > 0, "Founder Room version must be a positive integer.");
    assert(payload.title === "FOUNDER", "Founder Room title must be FOUNDER.");
    assert(typeof payload.identity === "string" && payload.identity.trim(), "Founder identity is required.");
    assert(Array.isArray(payload.hub) && payload.hub.length === 4, "Founder Hub must contain four sections.");
    const ids = new Set();
    payload.hub.forEach((item, index) => {
        assert(typeof item.id === "string" && item.id, `Founder Hub item ${index} needs an id.`);
        assert(!ids.has(item.id), `Duplicate Founder Hub id: ${item.id}`);
        ids.add(item.id);
        assert(/^\d{2}$/.test(item.number), `Invalid Founder Hub number for ${item.id}.`);
        assert(typeof item.label === "string" && item.label, `Founder Hub item ${item.id} needs a label.`);
        assert(["development", "available"].includes(item.status), `Invalid Founder Hub status for ${item.id}.`);
    });
    assert(Array.isArray(payload.code) && payload.code.length === 13, "The Code must contain thirteen laws.");
    payload.code.forEach((law, index) => {
        assert(law.number === String(index + 1).padStart(2, "0"), `Invalid law number at index ${index}.`);
        assert(typeof law.statement === "string" && law.statement.trim(), `Law ${law.number} needs a statement.`);
    });
    assert(Array.isArray(payload.origin) && payload.origin.length === 3, "Founder Origin must contain three frames.");
    payload.origin.forEach((frame, index) => {
        assert(typeof frame.id === "string" && frame.id, `Founder Origin frame ${index} needs an id.`);
        assert(/^\d{2}$/.test(frame.number), `Invalid Founder Origin frame number for ${frame.id}.`);
        assert(typeof frame.title === "string" && frame.title, `Founder Origin frame ${frame.id} needs a title.`);
        assert(frame.media && ["image", "video", "placeholder"].includes(frame.media.type), `Founder Origin frame ${frame.id} has invalid media.`);
        assert(frame.copy === undefined || Array.isArray(frame.copy), `Founder Origin frame ${frame.id} copy must be an array when supplied.`);
        if (frame.media.type === "placeholder") assert(typeof frame.media.label === "string" && frame.media.label, `Founder Origin placeholder ${frame.id} needs a label.`);
        else assert(typeof frame.media.src === "string" && frame.media.src, `Founder Origin frame ${frame.id} needs a media source.`);
    });
    assert(Array.isArray(payload.journey) && payload.journey.length === 8, "Founder Journey must contain eight memories.");
    const journeyIds = new Set();
    payload.journey.forEach((memory, index) => {
        const scene = memory.scene;
        assert(scene && typeof scene === "object", `Journey ${index} needs scene settings.`);
        for (const key of ["position", "baseRotation", "labelOffset", "focusOffset"]) {
            assert(Array.isArray(scene[key]) && scene[key].length === 3 && scene[key].every(Number.isFinite), `Journey ${index}: invalid ${key}.`);
        }
        for (const key of ["scale", "startRotation", "idleRotationSpeed", "floatAmplitude", "floatSpeed", "floatPhase"]) {
            assert(Number.isFinite(scene[key]), `Journey ${index}: invalid ${key}.`);
        }
        assert(scene.scale > 0 && scene.idleRotationSpeed >= 0 && scene.floatAmplitude >= 0 && scene.floatSpeed >= 0, `Journey ${index}: invalid motion/scale range.`);
        assert([-1, 1].includes(scene.idleRotationDirection), `Journey ${index}: invalid rotation direction.`);
        assert(scene.status === (index === 7 ? "IN PROGRESS" : "SAVED"), `Journey ${index}: invalid status.`);
        assert(typeof memory.id === "string" && memory.id, `Founder Journey memory ${index} needs an id.`);
        assert(!journeyIds.has(memory.id), `Duplicate Founder Journey id: ${memory.id}`);
        journeyIds.add(memory.id);
        assert(/^\d{2}$/.test(memory.number), `Invalid Founder Journey number for ${memory.id}.`);
        assert(typeof memory.title === "string" && memory.title, `Founder Journey memory ${memory.id} needs a title.`);
        assert(Array.isArray(memory.copy) && memory.copy.length > 0, `Founder Journey memory ${memory.id} needs copy.`);
        assert(memory.copy.every((line) => typeof line === "string" && line.trim()), `Founder Journey memory ${memory.id} contains empty copy.`);
        assert(memory.media && ["image", "placeholder", "model"].includes(memory.media.type), `Founder Journey memory ${memory.id} has invalid media.`);
        if (memory.media.type === "model") {
            assert(/^src\/founder\/journey\/[\w-]+\.glb$/.test(memory.media.src), `Invalid Journey model path for ${memory.id}.`);
            assert(typeof memory.media.alt === "string" && memory.media.alt.trim(), `Journey model ${memory.id} needs accessible text.`);
        }
        if (memory.media.type === "placeholder") assert(typeof memory.media.label === "string" && memory.media.label, `Founder Journey placeholder ${memory.id} needs a label.`);
        else assert(typeof memory.media.src === "string" && memory.media.src, `Founder Journey memory ${memory.id} needs an image source.`);
    });
}

export async function validatePrePog(payload, { requireFiles = true } = {}) {
    assert(Array.isArray(payload) && payload.length === 94, "Pre-PoG archive must contain all 94 images.");
    const ids = new Set();
    for (const item of payload) {
        assert(typeof item.id === "string" && item.id, "Every Pre-PoG image needs an id.");
        assert(!ids.has(item.id), `Duplicate Pre-PoG image id: ${item.id}`);
        ids.add(item.id);
        assert(typeof item.alt === "string" && item.alt.trim(), `Pre-PoG image ${item.id} needs accessible text.`);
        assert(Number.isFinite(item.width) && item.width > 0, `Pre-PoG image ${item.id} has invalid width.`);
        assert(Number.isFinite(item.height) && item.height > 0, `Pre-PoG image ${item.id} has invalid height.`);
        assert(/^src\/founder\/origin\/pre-pog\/[\w-]+\.webp$/.test(item.src), `Pre-PoG image ${item.id} has an invalid full image path.`);
        assert(/^src\/founder\/origin\/pre-pog\/thumbs\/[\w-]+\.webp$/.test(item.thumb), `Pre-PoG image ${item.id} has an invalid thumbnail path.`);
        if (requireFiles) await Promise.all([access(item.src), access(item.thumb)]);
    }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
    const [fieldNotes, documentary, greatnessPoem, founderRoom, prePog] = await Promise.all([
        readJson(FIELD_NOTES_PATH),
        readJson(DOCUMENTARY_PATH),
        readJson(GREATNESS_POEM_PATH),
        readJson(FOUNDER_ROOM_PATH),
        readJson(PRE_POG_PATH)
    ]);
    await validateFieldNotes(fieldNotes);
    validateDocumentary(documentary);
    validateGreatnessPoem(greatnessPoem);
    validateFounderRoom(founderRoom);
    await validatePrePog(prePog);
    console.log(`Content valid: ${fieldNotes.notes.length} Field Notes, ${documentary.episodes.length} UNCUT episodes, ${greatnessPoem.title} v${greatnessPoem.version}, Founder Hub v${founderRoom.version}, and ${prePog.length} Pre-PoG images.`);
}
