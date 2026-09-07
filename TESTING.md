# Release Test Checklist

Run `npm test` first. It validates every generated archive and exercises the critical journeys in desktop and mobile Chromium. GitHub repeats the same checks on every push and pull request.

## Desktop

- Background video autoplays permanently muted. On the first visit, BEGIN remains silent through the poem and final image; pressing ENTER starts the Muhammad Ali training ambience from a random point and fades it to a restrained 9% output. On later visits, CONTINUE primes that ambience silently behind the loading veil and fades it in with the menu. A Web Audio gain layer provides the same fade behaviour on mobile browsers that restrict direct media-element volume changes. SOUND OFF fades to mute while playback continues, SOUND ON fades the advancing playback back in, and ambience continues into rooms without an outline on its control.
- EXIT fades the ambience to silence before stopping it. Switching to another tab, window or mobile app fades it out before pausing at its current position; returning resumes from that position and fades back to the visitor's chosen SOUND ON/OFF state.
- Menu feedback uses a light selection tick for mouse hover, keyboard movement and touch selection; activation has a firmer confirmation tone, while locked rooms have a distinct blocked tone.
- On mobile, the first direct touch unlocks and warms the Web Audio path before delegated controls request their selection or confirmation feedback.
- The same sonic language applies to relevant controls throughout the opening ritual, Founder, Documentary, Field Notes, waitlist and external links without double-playing on the main menu.
- BEGIN/CONTINUE plays the standard selection sound on mouse hover or mobile touch and exactly one confirmation sound when pressed.
- The landing control reads BEGIN. It opens the loading veil, then the GREATNESS POEM; first-time visitors see the full unskippable ritual, returning visitors can skip directly to the menu, and FOUNDER now opens its room without replaying the poem.
- After the visitor completes the poem once, the landing control persists as CONTINUE on future visits to that device.
- After the first poem and Greatness Tee image-and-ENTER initiation, CONTINUE opens the menu directly. Pressing `THE FIRST PHYSICAL EXPRESSION` image in Origin starts the sole replay easter egg: the black ritual layer fades fully in before its text begins. On SKIP or completion, the text fades fully out before the black layer dissolves back to the same frame.
- Right-click does not open the browser context menu on desktop.
- Presented text cannot be selected; the email field remains editable.
- Waitlist placeholder moves on the landing page. JOIN WAITLIST opens the email capture inside the menu overlay; pressing outside the form or Escape restores the selector, feedback remains white, a successful or duplicate submission returns to the selector, and ambience continues without stopping or restarting.
- Menu opens, does not close from backdrop clicks, and all pointer states are intentional.
- Field Notes waits until the room opens, defaults to the newest year and switches cleanly through the top-right year selector; carousel arrows change only the current card.
- Field Notes custom year selector aligns with RETURN TO MENU at wide, intermediate and mobile widths; its closed and open backgrounds remain transparent, the selected year is purple and other years are grey.
- Every desktop room scrollbar shows a slim indicator with no visible track.
- UNCUT waits until the room opens, defaults to the newest year, and its top-right year selector replaces the archive with only that year's correctly numbered episodes.
- Leaving UNCUT by MENU or Escape stops playback.

## Keyboard

- Menu: Up/Down, Enter, Escape and Tab work; locked items stay grey.
- FOUNDER, DOCUMENTARY and FIELD NOTES build behind the LOADING veil; it stays visible for at least one second and fades only after the destination reports its first visible state ready. WAITLIST and EXIT remain immediate.
- The LOADING veil appears instantly when a destination is selected, preventing a one-frame glimpse of the landing page on mobile; only its exit fades.
- Opening ritual: the poem plays automatically after BEGIN; each paragraph types in isolation with a visible writing cursor, remains visible for its reading pause, and clears before the next. The first visit cannot be skipped, while returning visitors can use SKIP to enter the main menu immediately without a second loading screen.
- Founder room: the mission film appears before its mission-statement label, title and description.
- Founder Hub: five chapter choices render from structured data; Up/Down changes selection, Enter gives a development response, and Escape returns to the main menu.
- Founder navigation follows one-level-back hierarchy: the dominant top-left control reads RETURN TO MENU on the Hub, RETURN TO FOUNDER in a chapter selector or Origin, and RETURN TO JOURNEY inside a Journey memory. It never skips an intermediate level.
- Founder Origin and Journey viewers also provide a bottom-centre RETURN TO MENU shortcut for visitors who want to leave the Founder section immediately.
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
