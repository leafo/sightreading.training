# Play Along arrangements and transposition

## Arrangement review

The internal note convention is C5 = MIDI 60 (scientific middle C4). The previous presets used the scientific octave suffix as the internal suffix, putting both melody and accompaniment 12 semitones below the intended register. Corrected the preset source notes rather than changing global MIDI or notation semantics.

| Preset | Review and change |
| --- | --- |
| Twinkle Twinkle Little Star | Retained the recognizable 12-bar melody and simple harmony; melody now MIDI 60–69 with accompaniment below it. |
| Mary Had a Little Lamb | Retained the eight-bar melody and two-chord beginner arrangement; melody now MIDI 60–67. |
| Little Brown Jug | Retained the simplified verse/chorus and straight rhythm; melody now MIDI 60–72. |
| Canon in D | Expanded the former 17-bar whole/half-note excerpt into a 33-bar beginner piano arrangement: eight bars of original broken-chord introduction, descending theme, half-note development, quarter-note variation and final tonic. It remains explicitly labeled as a simplified excerpt, not the full original three-violin canon or a transcription of a commercial piano arrangement. |

Preset IDs and URLs stay unchanged. Canon's eight-chord progression continues under every section. All tracks end together and the final chord is D major.

## Transpose behavior

- Visible Play Along control: −24 through +24 semitones, in one-half-step increments; zero restores the original pitch. Works with presets, saved songs and edited LML.
- Uses the shared tool-preference storage with validation and error feedback. The setting carries across songs/visits.
- Each change reparses the original source, then shifts melody, explicit/generated accompaniment, autochord roots, notation key signature, chord labels, playback and note matching consistently. Source code in the editor stays at the original pitch/key.
- Preserves track/clef information and shared note identity between the tracks and timer/matching list. Uses flat spellings in flat keys.
- Pauses and silences old pitches before installing the new score. Preserves play position and loop boundaries; clears stale held/matched notes and pedal state.
- Keyboard range follows the score. Keyboard/transport shortcuts ignore dropdowns so arrow keys can select a transpose value.
- Rejects fractional/excessive offsets and notes outside MIDI 0–127 without replacing the current score. The pitch control remains reachable if a saved offset cannot be applied to a newly loaded song.

## Verification

- `npm run test_beginner_songs`: four arrangements pass melody pitch-range, bar duration, accompaniment alignment and key-signature checks, plus Canon's initial arpeggios/theme/final cadence.
- `npm run test_play_along`: nine checks covering all 49 offsets, unchanged timing/source, track identity/clefs, enharmonic key spelling, autochord accompaniment, validation/MIDI bounds, actual MIDI callback pitches, stale-note cleanup, loop/position preservation, repeated shifts/reset, incoming-note hit matching, preference restoration and recovery controls.
- Frontend JS/CSS bundles successfully without warnings; `git diff --check` passes.
- Live listening, external MIDI-device acceptance and browser visual checks remain open. No hosted deployment performed.

## Review checklist

- [ ] Listen to all four presets at zero transpose and verify melody/accompaniment balance and register.
- [ ] Play Canon from the start and through the theme/variation/cadence.
- [ ] Try −1, +1, −12, +12 and reset; compare key signature, displayed chords, sound and MIDI input matching.
- [ ] Change transpose during playback and with held keys/pedal; verify no stuck notes and preserved loop/position.
- [ ] Refresh or open another song; verify the stored offset and zero reset.
- [ ] Check desktop/mobile controls and keyboard navigation.
