# Release Test Checklist

Run `npm test` first.

## Desktop

- Background video autoplays muted; sound control works without an outline.
- Waitlist placeholder moves, hides on focus and returns after a successful submission.
- Menu opens, does not close from backdrop clicks, and all pointer states are intentional.
- Field Notes loads every entry; carousel arrows change only the current card.
- UNCUT loads, chapters are ordered newest first, and episode numbering remains correct.
- Leaving UNCUT by MENU or Escape stops playback.

## Keyboard

- Menu: Up/Down, Enter, Escape and Tab work; locked items stay grey.
- FOUNDER, DOCUMENTARY and FIELD NOTES show the LOADING... threshold before their destination becomes visible; WAITLIST and EXIT remain immediate.
- Founder: each paragraph types in isolation, remains visible for its reading pause, and clears before the next; the first visit cannot be escaped, ENTER appears only after the final pause, and returning visitors can Tab between replay and direct entry.
- Rooms: focus starts on MENU, remains trapped inside, and Escape returns to the menu.
- Field Notes carousels respond to Left/Right when their image area is focused.
- UNCUT episode buttons respond to Up/Down.
- Focus indicators are visible and no hidden surface receives focus.

## Mobile (320px, 375px, 430px)

- No horizontal scrolling or emoji-rendered controls.
- Landing controls align as one system.
- Room headings, archives, carousel controls and return buttons remain usable.
- External links open correctly.

## Reduced motion

- Enable the operating system's reduced-motion setting.
- Menu and room transitions become immediate.
- Placeholder and image effects do not cause disorienting motion.
- THE BEGINNING preserves paragraph order and reading pauses without character-by-character typing.

## Pipeline integrity

- Empty or malformed API fixtures exit non-zero without modifying archive JSON.
- Field Note paths end in `.webp` and every referenced file exists.
- Instagram Reel permalinks are rejected.
- Duplicate Instagram and YouTube ids are rejected.
