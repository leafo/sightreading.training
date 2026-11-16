# Beginner Play Along songs

- [ ] Open Play Along as a guest; confirm all four beginner songs appear above community songs.
- [ ] Open Twinkle Twinkle Little Star, Mary Had a Little Lamb, and Little Brown Jug; check the melody and simple chords.
- [ ] Open Canon in D; confirm the simplified excerpt is in D major with F-sharp and C-sharp.
- [ ] Play, pause, rewind, adjust BPM, and loop a short phrase.
- [ ] Confirm the Melody and Chords staves have descriptive names and the chord progression is listed above them.
- [ ] Open each beginner song directly by URL and navigate between songs.
- [ ] Check the same collection in the frontend-only preview without a database.
- [ ] Confirm existing community songs and the new-song editor still work.

Automated validation: `npm run build_assets`, `npm run test_beginner_songs`, targeted ESLint, and frontend esbuild compilation. Arrangement tests check measure totals, melody/chord alignment, triad durations, monophonic melody, and key signatures. Browser playback and hosted acceptance still require manual review.

The arrangements are new simplified settings of public-domain melodies. Canon is a short excerpt rather than the full composition. No database seeds or operations changes are needed.
