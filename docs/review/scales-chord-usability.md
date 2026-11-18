# Scales and chord tools — review checklist

All manual items below remain pending. Use this PR branch in the preview.

## Scales

- [ ] Navigation and the page title say **Scales**; `/scales` opens directly and `/guitar-scales` redirects there.
- [ ] Guitar mode has a single horizontally scrollable fretboard from fret 0 through 12, styled like Chord Lab.
- [ ] Piano mode shows two octaves (C3 through C5) with every occurrence of a scale tone highlighted.
- [ ] Notes, Intervals, and Notes and intervals show the requested labels on both instruments.
- [ ] Roots are visually distinct; verify A minor pentatonic is A C D E G with intervals 1 ♭3 4 5 ♭7.
- [ ] Flat keys and black piano keys remain readable in light and dark themes.

## Chord Lab

- [ ] The upper-right gear opens a right-side options drawer; Close, Escape, and backdrop dismissal work and return focus.
- [ ] Instrument selection, Show all fretboard notes, and Chord notes / Chord degrees / Notes and degrees live in Options.
- [ ] Enter frets by string, Try an example, and the old Note names button are absent.
- [ ] The fretboard reset icon is at its upper right and clears guitar notes and identification.
- [ ] Clicking frets and open strings, piano keys, and MIDI input still identify chords.
- [ ] Degrees use the chord root even in inversions; for C/E the E is degree 3, and C9 includes degree 9.
- [ ] Unmatched input shows near-match suggestions with explicit notes to add/remove; suggestions do not silently replace the input.
- [ ] Exact matches can be selected individually and offer multiple diagrams; Use this voicing updates the guitar fretboard.
- [ ] Suggestions can expand their own voicings and apply a selected shape.
- [ ] MIDI disconnect/reset/navigation cleanup still works; switching instruments preserves separate guitar and piano selections.

## Chord Reference

- [ ] Root/type controls, free-text queries, examples, match counts, empty results, and Show more chords still work.
- [ ] Results offer common, moveable, and less-common groups with additional shapes expandable.
- [ ] Moveable shapes are shown explicitly and contain no open strings; verify C, F, Am, Cmaj7, and diminished/extended examples.
- [ ] Diagrams retain muted/open indicators, finger suggestions, barres, and starting frets.
- [ ] Explore on fretboard opens the exact chosen shape in Chord Lab.

## Returning to a tool

- [ ] Change Scales root/type/instrument/labels, leave, and return; repeat after reload.
- [ ] Change Lab frets/piano selections/instrument/note visibility/labels/selected match, leave, and return; repeat after reload.
- [ ] Change Reference query/root/type/result count, leave, and return; repeat after reload.
- [ ] A fingering URL from Reference overrides Lab's saved instrument/shape and opens Guitar mode.
- [ ] Live MIDI notes are never restored as held notes after reload.
- [ ] Denied/full/corrupt browser storage does not break the tools; failed writes show a temporary dismissible warning and retry on the next change.

State is local to this browser, without account or device sync. Options drawers and expanded diagram groups are temporary UI, not saved settings.

## Responsive and keyboard acceptance

- [ ] At desktop, 375px, and 320px widths, keyboard/fretboard scrolling stays within the instrument and the page has no horizontal overflow.
- [ ] Keyboard focus, pressed states, labels, root marks, and the right-side drawer are usable in both themes.
- [ ] Chord Sheet printing still omits navigation without reserving sidebar space.

Automated checks cover scale pitches/intervals, piano and fretboard markup, suggestions, moveable-shape retention across all supported roots/qualities, saved-state validation/recovery, and existing chord/MIDI regressions. Visual and live MIDI acceptance require the manual checks above.
