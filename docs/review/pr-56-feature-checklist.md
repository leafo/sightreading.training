# Dev 2026-11-13 Feature Checklist

Check a box only after manually verifying the behavior. All manual items below start unchecked. Record failures and screenshots in the PR.

## Review setup

- [ ] Open a preview built from this PR branch and confirm it includes the latest commit.
- [ ] Review at desktop width, 375px and 320px phone widths, and a short/landscape viewport.
- [ ] Repeat the main screens in Light, Dark, and System appearance modes.

The frontend-only Codespaces preview supports the sidebar and guest chord tools. Account login/logout and connected-account behavior need a backend-enabled environment. MIDI review requires a supported browser and connected device.

## Sidebar and top bar

- [ ] On a fresh page load, navigation appears as a left sidebar and starts open.
- [ ] The hamburger closes and reopens navigation; its accessible name and expanded state match what is visible.
- [ ] The old Explore tools button and “Your music workspace” heading are absent.
- [ ] The top bar contains the hamburger and branding, with no MIDI device control or theme picker.
- [ ] Every tool remains reachable in the grouped sidebar; the current route is highlighted.
- [ ] On desktop, the page makes room for the open sidebar and reclaims the space when it closes.
- [ ] On phones, the sidebar fits the viewport, scrolls to all links/settings, and overlays the page without horizontal page overflow.
- [ ] On phones, tapping the backdrop or choosing a navigation/account link closes the sidebar.
- [ ] Escape closes navigation and returns focus to the hamburger.
- [ ] On phones, Tab and Shift+Tab stay within the open navigation/header controls; after closing, page controls are reachable.
- [ ] Guest Log in/Register links and signed-in account/Log out controls work in the appropriate preview.
- [ ] MIDI device selection remains available inside the sidebar.

## Appearance controls

- [ ] Light, Dark, and System are visible inside the sidebar, and the selected choice is clear.
- [ ] Each choice changes the appearance and remains selected after reload.
- [ ] System follows the operating system appearance, including a change while the page is open.
- [ ] Links, active routes, buttons, diagram dots/numbers, and fretboard notes remain readable in both themes.

## Chord Reference — search and browsing

Page: `/chord-reference`

- [ ] Root buttons and the chord-type selector work together; try C major, A minor, and F♯ minor seventh.
- [ ] Free-text searches still support symbols, names, mood, and style: try `Cmaj7`, `F sharp minor 7`, and `C dreamy`.
- [ ] Example search buttons update the query and results.
- [ ] Empty and unmatched searches show useful guidance; match counts update correctly.
- [ ] Search controls and results are arranged beside each other on wide screens and stack cleanly on smaller screens.
- [ ] Broad searches can reveal additional results with Show more chords.
- [ ] Each result retains its chord name, notes, interval formula, and exploration descriptors.

## Chord diagrams

- [ ] Results display actual vertical chord diagrams, with low E at left and high e at right.
- [ ] C, G, and D major show familiar open shapes matching the supplied visual reference in structure.
- [ ] Open strings use ○, muted strings use ×, and suggested finger numbers appear inside the dots.
- [ ] F major or another moveable shape shows a clear barre and consistent repeated finger numbers.
- [ ] Higher-position shapes show their starting fret; all dots remain inside the displayed fret range.
- [ ] More voicings expands alternate diagrams without replacing or losing the current results.
- [ ] Diagram labels provide a readable string-by-string description for assistive technology.
- [ ] Suggested fingerings are physically comfortable to play; record any awkward shape for adjustment.
- [ ] If a chord has no available compact shape, the page explains that and retains the notes/formula.
- [ ] Diagrams remain legible on phones and in both light and dark themes.

Suggested finger numbers are guidance. The compact voicing collection does not cover every possible guitar fingering.

## Chord Lab — visual fretboard

Page: `/chord-lab`

- [ ] The horizontal fretboard shows six standard-tuned strings, high E at the top, and frets 1–12.
- [ ] Clicking/tapping a fret places one note on that string; choosing a different fret moves it.
- [ ] Selecting the same fret again mutes the string.
- [ ] Open-string controls toggle open/muted states and show the correct markers.
- [ ] Note names toggles unselected note labels; selected notes remain identifiable.
- [ ] Fret buttons work with keyboard Tab plus Enter/Space, with visible focus and selected-state announcements.
- [ ] The fretboard scrolls horizontally on phones while surrounding page controls remain usable.
- [ ] Enter frets by string expands the precise selectors, which stay synchronized with the visual fretboard.
- [ ] Example voicings and Clear update the fretboard, diagram, and chord matches together.
- [ ] Enter low-to-high `x,3,2,0,1,0`: the result identifies C and the diagram shows that shape.
- [ ] Enter `0,3,2,0,1,0`: the bass/inversion result identifies C/E.
- [ ] Fewer than three different notes and unmatched note sets show useful guidance.
- [ ] The diagram beside identification reflects the current guitar selection, including high-fret/wide-span input.

## Search-to-Lab handoff and existing instruments

- [ ] Explore on fretboard opens the displayed fingering in Chord Lab.
- [ ] Analyze voicing opens the specific alternate shape selected.
- [ ] Reloading a valid fingering URL restores that shape; malformed or out-of-range fret parameters are ignored safely.
- [ ] Switching Guitar → Piano → Guitar preserves the existing guitar and piano selections independently.
- [ ] Piano note selection and chord identification still work.
- [ ] With a connected device, MIDI input, sustain, reset, and device selection still work.
- [ ] Leaving Chord Lab and returning does not leave stale MIDI notes or duplicate input listeners.

## Layout and printing regressions

- [ ] Check Staff, Guide, Chord Sheet, and account pages with the sidebar both open and closed for clipping or obscured controls.
- [ ] Chord Sheet print preview contains the whole sheet without navigation or a reserved sidebar margin.

## Verification already performed

These are automated results, not evidence that the manual checks above passed:

- 67 chord, diagram, fretboard-input, and sidebar regression specs passed.
- 5 authentication transport tests passed.
- Frontend asset generation, the complete esbuild bundle, focused ESLint, and whitespace checks passed.
- Voicing tests verify exact pitch-class coverage, no extra tones, and root bass across chord qualities.

Visual/live-browser acceptance was not completed during implementation: local Chromium could not launch under the environment’s socket restriction, and the cloud browser could not reach the local preview.

## Review record

- Reviewer:
- Date / PR commit:
- Preview URL:
- Browser / device / viewport:
- Items blocked or not applicable:
- Issues found / screenshots:
