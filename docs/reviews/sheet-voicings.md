# Chord Sheet voicing workspace

Chord Sheet can now keep several guitar shapes for a chord, use specific shapes in a passage, and exchange exact frets with Chord Reference and Chord Lab. Selections live in the source text, so existing draft recovery, songbook saving and backup formats retain them without a migration.

## Markup

```text
{voicing: C7:verse = x-3-2-3-1-x}
{voicing: C7:high = 8-10-8-9-8-8}

[C7:verse]Hello [F]world
[C7:high]Another line
[C7@x-3-2-3-1-x]An exact shape works without a definition
```

- Plain `[C7]` uses selected definitions, or an automatic diagram when none exist.
- `[C7:verse]` identifies a sheet-local named shape. The rendered chord carries its label.
- `[C7@x-3-2-3-1-x]` is a self-contained portable shape.
- Definitions use standard E A D G B E tuning, low string first. `x` mutes and `0` opens a string; frets 0–24 are accepted. Labels start with a letter and contain up to 24 letters, numbers, underscores or hyphens.
- Definitions are not rendered as lyrics. Their order controls the selected diagram order. Explicit shapes in lyrics are also included, without duplicate diagrams for identical shapes.
- Invalid shapes, undefined labels, malformed definitions and duplicate labels report errors. A named definition used by lyrics cannot be removed through the panel until those references are changed. Renaming updates its references.

## Review checklist

- [ ] In Create or Practice, open **Voicings**. Check multiple shapes; compare the resulting diagrams. Switch chord tabs and All/Open/Barre filters.
- [ ] Add a custom shape and label. Rename it, then reorder with the drag handle or up/down buttons. Verify diagram order.
- [ ] Place the cursor in lyrics; select shapes, then **Insert into lyrics**. Verify definitions added above the lyrics do not displace the insertion point.
- [ ] Try removing a referenced shape; verify the reference is protected and the error stays visible until corrected.
- [ ] Paste an exact shape from Chord Reference or Chord Lab using **Copy markup** (also in the diagram's Copy as menu).
- [ ] Use **Add to sheet**; review the shape, choose the current or another sheet, and add the variation. It should appear in the panel even before insertion into lyrics.
- [ ] Open a selected diagram in Lab, edit it, and return with **Add variation** or **Replace this voicing**. Replacement is offered for named sheet voicings. Review and accept the result in Chord Sheet.
- [ ] Change the destination sheet or its draft before accepting a replacement; verify replacement is rejected and Add variation remains available.
- [ ] Refresh the Lab after experimentation; verify the initial incoming frets are not reapplied. Return without changes and confirm draft recovery.
- [ ] Save and reopen a sheet; download/import its JSON songbook and text export; confirm exact shapes and names survive.
- [ ] Transpose a valid shape; confirm every sounding string moves by the same semitone count, including formerly open strings. Editing selections in a transposed view explicitly writes the sheet in the displayed key and resets the transpose offset.
- [ ] Transpose an open shape below fret zero or a high shape beyond fret 24; verify the error and blocked text export. Reset to Original key to edit/reselect.
- [ ] Check light/dark themes and a narrow phone viewport. The panel becomes a bottom sheet; Escape closes it, and mobile insertion closes it to reveal the editor.
- [ ] Print/Save PDF in Block, Line and Hidden modes. Verify the side panel, transfer review, copy menus and editing controls are excluded.

## Verification performed

- `npm run build_assets` completed.
- `npm run test_chord_lab`: 131 passing specs, including 22 new cases covering markup, errors, exact pitch transposition, aliases, deduplication, backup/draft recovery, insertion offsets, stale replacement protection, oversized sheets, transfer validation and high-fret Lab rendering.
- ESLint on changed JS/JSX and `git diff --check` passed.
- Supplemental jsdom interaction checks exercised actual React handlers for multiple selection, cursor insertion, referenced removal protection, alias renaming, ordering, panel closing, clipboard callback, initial Lab shape/URL consumption, draft recovery and reviewed Lab return. Clipboard used a test adapter, not the operating system clipboard.
- Frontend preview bundle compiled successfully.

## Remaining acceptance and limits

Live Chromium visual, responsive layout, drag gestures, real clipboard permission and PDF rendering have not been verified: this environment rejects Chromium's process-singleton socket at startup. The jsdom checks do not provide layout or browser acceptance. No hosted development or production deployment was performed.

This iteration targets standard-tuned guitar shapes. Inversion labels are ordinary user labels, not catalog indexes. ChordPro-style voicing directives are a Music Tools extension; other applications may not understand them. Returning a Lab shape under a different chord name adds a variation instead of rewriting the old chord's references. Songbook changes still require the existing Save action; automatic recovery protects the working draft separately.
