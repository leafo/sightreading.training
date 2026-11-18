# Chord Sheet Maker workspace review

## Changes

The page title sits above one panel with Create, Practice, and Info tabs. Create contains the combined searchable Sheets picker (including protected starter songs), Date/A–Z sort, one Import button, one Export menu, save/delete icons, title, and source input. Practice contains the rendered sheet, transposition, diagram selection, and scrolling controls. Help lives in Info.

First visits open Whiskey in the Jar. Later visits restore the draft, selected sheet, tab, search/sort, diagram style, transposition, speed, and practice scroll position. Active scrolling does not resume automatically. Existing v1 drafts and songbooks remain compatible. Saving a starter creates a personal copy; deleting never modifies starter originals. Explicit starter URL parameters are consumed so refreshing does not erase subsequent edits.

## Automated verification

- `npm run test_chord_lab` — chord tools, imports/exports, search, draft recovery, starter-copy protection, blank drafts, tab changes, corrupt settings, and import errors.
- Targeted ESLint for the changed page and specs.
- Frontend esbuild compilation and `git diff --check`.

## Manual acceptance checklist

- [ ] First visit loads Whiskey; page title is above the panel.
- [ ] Create has no visible preview or instructional paragraphs.
- [ ] Sheets search finds both starters and personal sheets by title/lyrics; Date preserves stored order and A–Z sorts titles.
- [ ] Saving a starter creates a personal copy, which can be edited/deleted; starter originals remain protected.
- [ ] Edits, blank drafts, active tab, transpose, diagrams, search/sort, and scroll settings survive reload/navigation.
- [ ] Practice shows diagrams and chords above lyrics; scrolling pauses on tab changes, manual scrolling, and leaving the page.
- [ ] Import opens one modal for JSON songbooks and text/ChordPro; invalid files retain the modal and display an actionable error.
- [ ] Export offers JSON songbook, chord sheet text, and Print / Save PDF.
- [ ] Print from Create or Info prints only the rendered sheet, without editor controls; diagram choices are respected.
- [ ] Tabs work with arrows/Home/End; Sheets search works with keyboard; modal traps focus, Escape closes it, and focus returns to Import.
- [ ] Check narrow mobile, desktop, and dark theme layouts.

Browser automation was attempted but Chromium could not launch because this environment denies its socket operations. Visual layout, native modal focus, and printed pagination remain unverified here. No deployment or operations changes are included.

## Navigation and Staff follow-up

- Navigation width reduced from 260px to 12rem, with tool labels kept on one line.
- Staff workspace, keyboard, footer, and settings panel honor the same desktop navigation offset as other pages. Closing navigation releases the space; mobile retains the overlay behavior. Fullscreen clears the offset.
- Practice timer uses a stopwatch icon only, including while active; countdown is available in its tooltip, accessible label, and open panel.
- Keyboard visibility uses eye / slashed-eye icons only, with action tooltips and accessible labels. Icon hit areas are at least 44px.
- Automated component checks verify icon-only content and changing accessible labels.
- [ ] Visually verify open/closed navigation on Staff with keyboard/settings open, mobile navigation, and fullscreen.
- [ ] Confirm the narrower navigation fits tool labels at normal and enlarged text sizes.
- [ ] Verify timer and eye toggles show no visible text labels and remain keyboard accessible.
