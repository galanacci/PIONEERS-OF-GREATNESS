# Architecture

## Visitor experience

- `index.html` contains the semantic shell and room markup.
- `style.css` is the stylesheet entry point.
- `styles/tokens.css` owns visual constants.
- `styles/archive-controls.css` owns Field Notes carousel and UNCUT chapter controls.
- `js/app.js` starts independent modules.
- `js/core/` owns navigation, audio and room lifecycle.
- `js/rooms/` owns room-specific rendering.
- `js/services/` owns the waitlist integration.
- `js/room-registry.js` is the central list of available rooms.

Rooms communicate through `pog:*` browser events. A room controller emits `pog:room-opened`, `pog:room-closing` and `pog:room-closed`; media modules use these lifecycle events to clean up playback.

## Content pipelines

- Instagram regular posts generate `data/field-notes.json` and optimized WebP assets.
- The UNCUT playlist generates `data/documentary.json`.
- Both syncs validate non-empty, structurally sound output before writing.
- JSON schemas document the content contract; `npm run validate` verifies live data and local media.
- Scheduled workflows propose changes to `dev` through pull requests.

## Release flow

1. Build and review on `dev`.
2. Merge `dev` into `main` to deploy.
3. Immediately merge `main` back into `dev` and push it.
4. Confirm `git rev-list --left-right --count origin/main...origin/dev` reports no production-only commits.

This resynchronisation step is mandatory after every production release.
