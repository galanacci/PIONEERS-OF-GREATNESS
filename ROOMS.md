# Rooms

## Registry

Every interactive room must be registered in `js/room-registry.js` and have a matching `<section id>` in `index.html`.

## Lifecycle

- Menu selection emits `pog:open-room`.
- The controller opens only registered rooms.
- `pog:room-opened` starts or restores room-specific presentation.
- `pog:room-closing` stops time-sensitive media immediately.
- `pog:room-closed` confirms teardown and returns focus to the menu.

## Current rooms

- `founder-room`: reached through the versioned `THE BEGINNING` introduction. First-time visitors complete the ritual; returning visitors can replay it or enter directly.
- `documentary-room`: UNCUT screening room, grouped by release year. Its YouTube iframe is removed on exit so hidden playback cannot continue.
- `field-notes-room`: Instagram-derived journal. Multi-image entries expose pointer and keyboard carousel controls.

## Adding a room

Add semantic markup, register the id, create an isolated module, add scoped styles, implement loading/error/empty states, and run the checklist in `TESTING.md`.
