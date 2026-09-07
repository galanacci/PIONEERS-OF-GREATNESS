# Release Test Checklist

Run `npm test` first. It validates every generated archive and exercises the critical journeys in desktop and mobile Chromium. GitHub repeats the same checks on every push and pull request.

## Desktop

- Background video autoplays permanently muted. Opening the menu starts the low-volume Muhammad Ali training ambience from a random point; SOUND ON/OFF controls only that MP3, and the ambience continues into rooms without an outline on its control.
- Right-click does not open the browser context menu on desktop.
- Presented text cannot be selected; the email field remains editable.
- Waitlist placeholder moves, hides on focus and returns after a successful submission.
- Menu opens, does not close from backdrop clicks, and all pointer states are intentional.
- Field Notes waits until the room opens, defaults to the newest year and switches cleanly through the top-right year selector; carousel arrows change only the current card.
- Field Notes custom year selector aligns with RETURN TO MENU at wide, intermediate and mobile widths; its closed and open backgrounds remain transparent, the selected year is purple and other years are grey.
- Every desktop room scrollbar shows a slim indicator with no visible track.
- UNCUT waits until the room opens, chapters are ordered newest first, and episode numbering remains correct.
- Leaving UNCUT by MENU or Escape stops playback.

## Keyboard

- Menu: Up/Down, Enter, Escape and Tab work; locked items stay grey.
- FOUNDER, DOCUMENTARY and FIELD NOTES build behind the LOADING veil; it stays visible for at least one second and fades only after the destination reports its first visible state ready. WAITLIST and EXIT remain immediate.
- The LOADING veil appears instantly when a destination is selected, preventing a one-frame glimpse of the landing page on mobile; only its exit fades.
- Founder: the poem plays automatically on every visit; each paragraph types in isolation with a visible writing cursor, remains visible for its reading pause, and clears before the next. The first visit cannot be skipped, while returning visitors can use SKIP to enter the Founder Hub immediately without a second loading screen.
- Founder room: the mission film appears before its mission-statement label, title and description.
- Founder Hub: five chapter choices render from structured data; Up/Down changes selection, Enter gives a development response, and Escape returns to the main menu.
- Founder Origin: the shared bedroom, original poem and first Greatness Tee render as three visual-only frames with no descriptive copy; Previous/Next stop at the ends, Left/Right moves between frames, and Escape returns to the Founder Hub.
- Founder viewport: the Hub and every Origin frame scale within desktop and 375 × 667 mobile viewports without scrolling.
- Founder Origin desktop: the media begins within the upper 30% of the viewport and receives more than half of the viewport height, avoiding an oversized empty band above it.
- Founder Origin desktop: frame number, title and date sit at the top right, horizontally balanced against RETURN TO MENU at the top left.
- Founder Journey: eight save-history entries render from structured data; Up/Down and Enter operate the selector, Left/Right moves between memories, Escape returns one level at a time, and the selector and memory views never scroll.
- Founder visual-entry rule: on desktop, counters and titles sit at the top right opposite RETURN TO MENU; on mobile, metadata remains stacked above the media.
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
