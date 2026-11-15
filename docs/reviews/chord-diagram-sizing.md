# Chord diagram UI review

- [ ] Copy control clears muted-string markers on both chord pages.
- [ ] Block copy has only the diagram, with labels at frets 3, 5, 7, 9 and 12.
- [ ] Line copy retains the chord name and compact frets.
- [ ] Diagram labels use font size 18; notes plus intervals have larger circles.
- [ ] Both size sliders default to 20% and share the same value.
- [ ] Guest size survives reload; account size survives another signed-in session.
- [ ] Failed account saves show a toast and retry after reconnect.
- [ ] Lab tuning and instructions share one line when space permits.
- [ ] Lab controls and fretboard have compact spacing.
- [ ] Fretboards number only 3, 5, 7, 9, 12, 15, 17, 19, 22 and 24 when present.

Validation: 93 chord-tool specs pass; frontend bundle builds. Browser rendering
could not be checked because Chromium cannot create its process singleton socket
in this environment. Live account/backend acceptance remains to be checked.
