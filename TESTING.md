# Release Test Checklist

Run `npm test` first. It validates every generated archive and exercises the critical journeys in desktop and mobile Chromium. GitHub repeats the same checks on every push and pull request.

## Desktop

- Background video autoplays muted; sound control works without an outline.
- Right-click does not open the browser context menu on desktop.
- Presented text cannot be selected; the email field remains editable.
- Waitlist placeholder moves, hides on focus and returns after a successful submission.
- Menu opens, does not close from backdrop clicks, and all pointer states are intentional.
- Field Notes waits until the room opens, defaults to the newest year and switches cleanly through the top-right year selector; carousel arrows change only the current card.
- UNCUT waits until the room opens, chapters are ordered newest first, and episode numbering remains correct.
- Leaving UNCUT by MENU or Escape stops playback.

## Keyboard

- Menu: Up/Down, Enter, Escape and Tab work; locked items stay grey.
- FOUNDER, DOCUMENTARY and FIELD NOTES show the LOADING... threshold before their destination becomes visible; WAITLIST and EXIT remain immediate.
- Founder: each paragraph types in isolation with a visible writing cursor, remains visible for its reading pause, and clears before the next; the cursor disappears and ENTER appears only after the final pause. The first visit cannot be escaped, and returning visitors can Tab between replay and direct entry.
- Rooms: focus starts on MENU, remains trapped inside, and Escape returns to the menu.
- Field Notes carousels respond to Left/Right when their image area is focused.
- UNCUT episode buttons respond to Up/Down.
- Focus indicators are visible and no hidden surface receives focus.

## Mobile (320px, 375px, 430px)

- No horizontal scrolling or emoji-rendered controls.
- Pinch zoom is disabled so the intended composition remains fixed.
- Landing controls align as one system.
- Room headings, archives, carousel controls and return buttons remain usable.
- External links open correctly.

## Motion

- Menu and room transitions remain deliberate and consistent.
- GREATNESS POEM preserves its character-by-character writing, equal one-second paragraph pauses, fades and blinking writing cursor on desktop and mobile.
- The final poem paragraph clears before the Greatness Tee image and ENTER appear together.

## Pipeline integrity

- Empty or malformed API fixtures exit non-zero without modifying archive JSON.
- Field Note paths end in `.webp` and every referenced file exists.
- Instagram Reel permalinks are rejected.
- Duplicate Instagram and YouTube ids are rejected.
