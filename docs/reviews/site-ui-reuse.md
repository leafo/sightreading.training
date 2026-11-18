# Site UI reuse sweep

## Implemented foundations

- Shared `ui.module.css` owns tool page layout, icon button geometry, tab layout and tab appearance. Tool pages retain only necessary width limits and content layouts.
- Global control, radius, padding and focus tokens apply across the site. Shared panel tokens replace repeated values in tool pages, song lists, ear training and options.
- `ActionIcon` owns common save, delete, add, playback, volume, copy and sheet glyphs. Guitar controls reuse the existing reset icon.
- `tab_navigation.js` owns Arrow Left/Right wraparound and Home/End behavior in Chord Lab, Chord Sheet Maker and the existing Tabs component (used by the song editor and statistics dialog).
- The shared Select component correctly distinguishes numeric zero, empty values and nonzero choices while accepting native select string values.
- `browser_download.js` owns object URL creation and delayed cleanup, including failed clicks, for text and songbook exports.
- Every chord diagram owns its icon toolbar, copy menu, separator, caption, sizing and accessible description. Diagram action callers pass their controls to that toolbar instead of rendering separate controls below the figure. Page-specific figure width overrides are removed. The global size preference determines width in every label mode and page.
- Exact-shape links still use existing validated voicing tokens and handoff functions. Copy markup stays available through the shared copy menu.
- Chord Matches has its heading above the section box, tabs anchored at the top left, and its primary/alternative diagrams inside the same section.

## Sweep coverage

| Area inspected | Shared behavior/styling or intentional specialization |
| --- | --- |
| Chord Reference, Chord Lab, Sheet Maker and voicing picker | Common diagrams, icon toolbar, labels, sizing, copy and transfer behavior |
| Scales | Common page/control/option styles; guitar and piano visuals remain shared with Lab |
| Drum Machine | Common layout, icons, icon sizing and panel tokens; sequencer step sizes and playhead states remain specific |
| Sight Reading, Play Along and virtual keyboard | Global controls and existing shared staff/keyboard/settings components; notation geometry and performance layout remain specific |
| Ear Training and Flash Cards | Global controls and panel tokens; compact flash-card answer controls; exercise timing and answer feedback remain specific |
| Song Library and Song Editor | Existing shared forms, dropdowns and tabs; shared tab keyboard behavior and panel tokens |
| Stats and statistics dialog | Existing summary/share helpers and Toast; shared tab styling/navigation in the dialog |
| Login, Register and Account | Existing TextInputRow/JsonForm, authentication transport, preference validation and global controls retained |
| MIDI monitor and device/instrument pickers | Existing shared MIDI components retained; common compact MIDI control padding; note visualization remains specific |
| Guides, Latency, Not Found | Existing page container and global controls retained; content-specific presentation retained |
| Header, navigation, theme, timer, options and dialogs | Existing shared components retained; icon sizing/focus/panel tokens reused where applicable; navigation and labeled theme touch targets retained |

Storage schemas, validators, authentication and domain-specific musical rules intentionally stay in their existing shared modules. Similar syntax alone is not sufficient reason to merge different data lifecycles.

## Validation

- 138 targeted chord, sheet, sizing, transfer and shared UI specs passed.
- Four beginner-song parser/alignment checks passed.
- Authentication transport tests passed.
- App and full browser-spec JS/CSS bundles compile without warnings.
- `git diff --check` passes.
- Local browser visual/interaction acceptance is still open: Chromium launch is blocked by this environment's socket restriction. The full browser-spec bundle was compiled, not executed in a browser. No hosted deployment performed.

## Visual acceptance checklist

- [ ] Compare diagrams across Reference, Lab, Sheet Create/Practice, incoming shapes and the voicing picker at the same size preference.
- [ ] Check fingers, notes, intervals and combined labels in light/dark themes and narrow/wide layouts.
- [ ] Confirm every chord action is inside the diagram width above its separator; open the copy menu at viewport edges.
- [ ] Check select/remove shape toggle, use voicing, copy formats, add-to-sheet and Lab return/replace workflows.
- [ ] Confirm Chord Matches label placement, top-left tabs and keyboard navigation.
- [ ] Review global controls, legacy tabs, flash-card answers, MIDI pickers, song editor, options and authentication forms.
- [ ] Check text/songbook exports and printable sheets (diagram toolbars hidden).
