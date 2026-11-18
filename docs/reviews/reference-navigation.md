# Reference expansion and navigation review

## Scales

- [ ] Select Melodic minor (ascending / jazz) on guitar and piano; C shows C D Eb F G A B.
- [ ] Try all seven major modes and all seven modes each of melodic and harmonic minor.
- [ ] Try whole tone, both diminished patterns, chromatic, double harmonic, Hungarian minor, Neapolitan major/minor, Persian, enigmatic, Hirajoshi, In sen, Iwato, Egyptian pentatonic, and bebop major/dominant.
- [ ] Verify Lydian dominant labels its fourth #4 and Lydian augmented labels its fifth #5.
- [ ] Refresh and confirm the selected scale, root, instrument, and labels persist.

## Chords

- [ ] Select diminished seventh and half diminished seventh from Chord Reference.
- [ ] Search Cdim7, Cm7b5, C7b5, C7#5, C7b9, C7#9, C11, Cm11, Cmaj11, C13, Cm13, and Cmaj13.
- [ ] Review formulas, note spellings, and generated guitar diagrams, then open a diagram in Chord Lab.
- [ ] Compare the size slider on Chord Lab and Chord Reference: same 129px width, right aligned, label and percentage above the track and inside its edges.
- [ ] Resize diagrams and confirm size stays synchronized between pages.

## Sidebar

- [ ] Training: Staff, Ear, Flash Cards.
- [ ] Practice: Play Along, Drum Machine, Chord Sheet.
- [ ] Reference: Scales, Chord Lab, Chord Reference.
- [ ] On a short viewport, scroll only the tool list; account links and the bottom controls remain pinned.
- [ ] MIDI selection appears below the separator and above the theme control.
- [ ] Theme shows only the current icon; click to choose among three icons, select a mode, and confirm the picker closes and focus returns.
- [ ] Guide is a circled question mark at the bottom; logged-in Stats remains accessible there.
- [ ] Check narrow-screen hamburger, backdrop, Escape, and keyboard focus behavior.

## Automated verification

97 specs pass via `node dev/test_chord_lab.cjs`, including catalog coverage, octave closure, all-root extended-chord identification, guitar diagrams, and sidebar structure. Focused ESLint, frontend bundle, and `git diff --check` pass.

Browser visual verification remains open: local Chromium launch was blocked by the environment's socket restriction. No hosted deployment or backend account testing was performed.
