# Chord UI follow-up task list

## UI text
- [x] Remove persistent browser-storage/account-sync messages from tool pages and options.
- [x] Piano Scales: remove the redundant scale/notes summary.
- [x] Guitar Scales: keep note/degree text without the scale name; remove tuning and explanatory fretboard text.

## Chord recognition and browsing
- [x] Recognize C7 x-3-2-3-1-x and review common jazz shell/extended voicings.
- [x] Permit omission of a natural fifth where the remaining jazz chord tones identify the chord; preserve altered fifths and other required tones.
- [x] Replace chord matches with tab buttons including the chord's note letters.
- [x] Make diagrams smaller and display all returned common/moveable/less-common and suggested voicings without foldouts.
- [x] Remove “Notes from the bass up:”.
- [x] Keep guitar diagrams out of piano mode.
- [x] Remove redundant chord/category/index captions from Reference diagrams.

## Shared chord diagrams
- [x] Add Notes, Fingers, Intervals, and Notes and intervals display modes to every diagram.
- [x] Add an upper-right Copy as menu with Block and Line actions.
- [x] Copy five-fret ASCII blocks and single-line tabs such as C = x-3-2-0-1-0.
- [x] Report copy success/failure with temporary dismissible feedback.

## Verification
- [x] Add targeted jazz omission, diagram label, ASCII export, and UI regression tests.
- [x] Run chord/scale tests, auth tests, builds, lint, and whitespace checks.
- [x] Record browser/clipboard visual acceptance separately from automated checks.

## Results

- 90 chord/scale/UI/export regression specs and 5 authentication transport tests passed.
- Frontend assets, app and browser-test bundles, focused ESLint, and whitespace checks passed.
- C7 `x-3-2-3-1-x` is recognized and offered as a common grip. Coverage includes transposed dominant/major/minor sevenths and ninth shells, with negative cases for required tones and altered fifths.
- Diagram controls support all four modes. All returned voicings are visible without category/suggestion foldouts; only the requested copy menu remains expandable.
- Clipboard success, denial, and retry were tested with a controlled clipboard implementation. Native browser clipboard permissions and visual/touch/keyboard acceptance remain pending because Chromium cannot launch in this environment.

## Manual acceptance still pending

- [ ] Check desktop/phone layouts, all diagram label modes, chord tabs, and options controls in a browser.
- [ ] Copy Block and Line in the actual preview and paste into a plain-text editor; test clipboard denial/retry.
- [ ] Check both themes, copy-menu placement, tab focus, and piano mode without guitar charts.
