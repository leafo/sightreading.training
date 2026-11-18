# Compact controls review

- [ ] Chord Sheet Maker: diagram actions use 28px icon buttons with 16px icons; choose voicings and open in Chord Lab have tooltips and accessible names.
- [ ] Create and Practice voicing toggles use icons and retain expanded state and focus restoration.
- [ ] Chord Lab actions in the voicing picker and selected shapes use the same icon.
- [ ] Buttons, dropdowns, tool tabs, settings controls and text fields use compact shared sizing (32px minimum height; 3px vertical padding by default).
- [ ] Review Chord Sheet Maker, Chord Reference, Chord Lab, Scales, Drum Machine and trainer in light/dark themes at desktop and mobile widths.
- [ ] Check keyboard focus, dropdown operation, voicing selection and exact-shape handoff/return.
- [ ] Printed sheets exclude diagram actions.

Validation: all 131 existing chord-tool regression specs passed; frontend esbuild bundle and CSS compiled successfully. Browser visual/interaction acceptance remains open: the local Chromium process cannot launch because socket creation is prohibited by this environment. No hosted deployment performed.
