export const ROOM_REGISTRY = Object.freeze({
    "documentary-room": { label: "DOCUMENTARY", module: "documentary", stopMediaOnClose: true },
    "field-notes-room": { label: "FIELD NOTES", module: "field-notes", stopMediaOnClose: false }
});

export const isKnownRoom = (roomId) => Object.hasOwn(ROOM_REGISTRY, roomId);
