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

- `founder-room`: reached directly from the main menu after the site-wide BEGIN threshold. The full GREATNESS POEM animation and Greatness Tee image-and-ENTER reveal form a one-time initiation; CONTINUE enters the menu directly. In ORIGIN, pressing the `THE FIRST PHYSICAL EXPRESSION` image replays the poem with SKIP and returns to the same frame. The five-choice Founder Hub currently opens two finished chapters: ORIGIN is a three-frame, non-looping visual sequence containing the dated London bedroom, original poem and first Greatness Tee. THE JOURNEY is an eight-memory save history with a selector and finite entry navigation. The former scrolling story remains preserved but hidden until its remaining content has been converted and verified chapter by chapter.
- `documentary-room`: UNCUT screening room, grouped by release year. Its YouTube iframe is removed on exit so hidden playback cannot continue.
- `field-notes-room`: Instagram-derived journal. Multi-image entries expose pointer and keyboard carousel controls.

## Adding a room

Add semantic markup, register the id, create an isolated module, add scoped styles, implement loading/error/empty states, and run the checklist in `TESTING.md`.
