# Adding a tool to Napland Music Tools

Use this playbook for a standalone instrument, practice aid, or exercise. The
Drum Machine at `/drum-machine` is a complete frontend-only example.

## 1. Define the tool's behavior

Describe the practice goal, primary interaction, controls, defaults, and empty
state. Decide what persists, where it is stored, and whether the tool needs MIDI,
audio, or a backend. Keep the first version focused and usable by a guest.

For the drum machine: edit a sixteenth-note grid in 4/4, 3/4, 5/4, or 6/8, loop
one or two bars, load presets, and save named patterns locally. It uses its own Web Audio output and
does not require the global MIDI output picker. Ten synthesized sets (Classic, Heavy Rock, Woodblocks, Jazz, 808, 909, Industrial,
Latin Percussion, Lo-fi, and Taiko/Cinematic) share the same track grid. Save the kit ID with
the pattern, default legacy saves to Classic, and keep kit changes independent
of the scheduler clock. Keyboard shortcuts must ignore editable and interactive
controls, modifiers, held-key repeats, and open dialogs; remove listeners on unmount.

Tempo counts quarter notes in the simple meters and dotted quarters in 6/8.
Swing delays offbeat eighths in every meter. The 6/8 bar displays six
numbered eighth-note beats, each with four subdivisions (24 cells, 32nd-note
resolution); its tempo still
counts two dotted quarters per bar. Grid grouping and tempo units are distinct. Legacy 12-cell 6/8 saves expand
by placing each old hit in every second cell, preserving bar positions. Changing meter preserves overlapping steps within each bar,
truncates removed beats, and adds silent steps for new beats. Saved patterns store
the signature; older patterns without one load as 4/4. Restart playback at the
first step after changing meter or bar count to discard already scheduled hits.

## 2. Separate the model, playback, and page

- Put pure data and validation in `static/js/st/<tool>.js`. Keep presets immutable
  by copying them before editing. Validate all persisted or imported data, with
  bounds on numbers, collection sizes, names, and array lengths.
- Put timers, audio nodes, and other resources in a separate module when needed.
  Schedule music with the Web Audio clock and a short lookahead rather than a
  React render timer. Clean up intervals, animation frames, nodes, and listeners
  on Stop and unmount. Handle blocked audio and cancellation during async startup.
- Add the React page in `static/js/st/components/pages/<tool>_page.jsx` and scoped
  styles in `<tool>_page.module.css`. Call `setTitle` when mounting. Use a class
  component when receiving the existing layout's page ref (see `pageProps()`).
- Use the site's shared colors and controls. Add visible keyboard focus, labels,
  toggle states, and accessible temporary status toasts. Make wide controls scroll within the page
  and verify the mobile layout.
- Use `components/toast.jsx` for routine status feedback such as saved/deleted
  confirmations. Toasts dismiss after five seconds and can be closed manually;
  repeat notifications reset the timer. Do not reserve page space for status
  messages. Keep actionable validation errors in the form/dialog until corrected.

Reference modules: `drum_patterns.js`, `drum_audio.js`, and
`components/pages/drum_machine_page.jsx` under `static/js/st/`.

## 3. Register the route and navigation

1. Import the page and add a route in `static/js/st/components/app.jsx`.
2. Add a link in `Header.getPageLinks()` in `components/header.jsx`; this feeds
   both desktop navigation and the mobile menu.
3. Check direct navigation, refresh, the active link, and leaving the page while
   it is running. The Lapis `/(*)` fallback already serves client routes, as does
   `dev/serve.mjs`; a standalone frontend route needs no new backend endpoint.

Do not change the root trainer's route or global MIDI behavior to add an unrelated
tool. Reuse the layout's MIDI props when the new tool actually needs MIDI.

## 4. Handle saved settings and backend dependencies

Use a versioned, tool-specific localStorage key for local data. Catch reads,
JSON parsing, validation, and writes: private browsing, corrupt data, and quota
limits must not stop the tool from working. Explain local-only storage in the UI;
never imply it syncs with accounts. Do not report a save as successful until the
write succeeds. Explain any overwrite behavior before the save action.

If account sync is required, implement an authenticated, CSRF-protected backend
endpoint and a migration, and document deployment requirements. Follow the trainer
preferences flow rather than silently mixing local data with account data. Such
features require backend validation and cannot be verified in a frontend preview.

## 5. Verify the implementation

From the repository root:

```bash
npm ci
npm run build_assets
# Replace these example paths with the files changed for your tool.
npx eslint static/js/st/drum_patterns.js static/js/st/drum_audio.js static/js/st/components/pages/drum_machine_page.jsx
npm run dev
```

`npm test` is currently a placeholder and is not a validation command. Add Jasmine
specs in `static/js/spec/` and import them from `static/js/specs.js`. Cover meaningful
behavior: preset independence, storage validation, timing invariants, and cleanup.
The full Tup build creates `/static/specs.html` and its browser Jasmine bundle.
Do not commit generated bundles, generated parser/assets, or `dev/out`.

Manually verify:

- Open the new route directly and through both navigation layouts.
- Exercise every primary control and preset, including changes during playback.
- Stop and restart; navigate away during playback and async startup.
- Save, reload, load, overwrite, and delete custom data; simulate storage failure.
- Use keyboard-only navigation and a narrow viewport. Ensure focus and active
  states remain visible, with no page-wide horizontal overflow.
- Test browser audio where applicable; a build passing does not prove sound quality.

For backend changes, also run the disposable Docker CI workflow documented in the
README. Never run `ci.sh` directly on the host.

## 6. Open the PR and provide a preview when requested

Use a feature branch and describe the user-visible behavior, local/account storage
scope, checks actually run, and known limitations. Include the route and screenshots
when helpful. Keep unrelated refactors out of the PR.

When asked for a deployed test version, use the existing Codespaces workflow in
`AGENTS.md` and the README. After pushing the branch, use
`bash dev/create_codespace.sh <branch>` only with an authorized personal GitHub CLI
login that has Codespaces access. Keep port 3000 private. Repository access alone
does not establish Codespaces permissions. The default preview runs the frontend
without the Lua/PostgreSQL backend.
