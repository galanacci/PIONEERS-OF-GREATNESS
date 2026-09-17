export const COLLECTIONS_PREVIEW_ENABLED = new URLSearchParams(window.location.search).get("preview") === "collections";

export const ROOM_REGISTRY = Object.freeze({
    "founder-room": { label: "FOUNDER", module: "founder", stopMediaOnClose: false },
    "documentary-room": { label: "VIDEO JOURNAL", module: "documentary", stopMediaOnClose: true },
    "field-notes-room": { label: "BEHIND THE SCENES", module: "field-notes", stopMediaOnClose: false },
    ...(COLLECTIONS_PREVIEW_ENABLED ? {
        "collections-room": { label: "COLLECTIONS", module: "collections", stopMediaOnClose: false }
    } : {})
});

export const isKnownRoom = (roomId) => Object.hasOwn(ROOM_REGISTRY, roomId);
