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

- `founder-room`: reached directly from the main menu after the site-wide BEGIN threshold. Its four-choice Founder Hub opens three finished chapters: ORIGIN is the moving Pre-PoG visual archive, THE JOURNEY presents eight artefacts inside one shared 3D archive, and THE CODE presents the 13 Laws of Greatness as a navigable manifesto. CURRENT MISSION remains locked while in development.
- `documentary-room`: UNCUT screening room, grouped by release year. Its YouTube iframe is removed on exit so hidden playback cannot continue.
- `field-notes-room`: Instagram-derived journal. Multi-image entries expose pointer and keyboard carousel controls.

## Adding a room

Add semantic markup, register the id, create an isolated module, add scoped styles, implement loading/error/empty states, and run the checklist in `TESTING.md`.
