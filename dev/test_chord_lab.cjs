// Run the browser-independent chord tool specs without a backend or browser.
const {mkdtempSync, rmSync, writeFileSync} = require('node:fs')
const {tmpdir} = require('node:os')
const {join, resolve} = require('node:path')
const esbuild = require('esbuild')
const core = require('jasmine-core')
const root = resolve(__dirname, '..')
const outdir = mkdtempSync(join(tmpdir(), 'chord-lab-specs-'))
process.exitCode = 1
try {
  writeFileSync(join(outdir, 'test-session.mjs'), 'export function getSession() { return {} }')
  esbuild.buildSync({
    absWorkingDir: root,
    entryPoints: ['static/js/spec/ui_reuse_spec.jsx', 'static/js/spec/voicing_markup_spec.jsx', 'static/js/spec/chord_polish_spec.jsx', 'static/js/spec/tool_usability_spec.jsx', 'static/js/spec/guitar_scales_spec.js', 'static/js/spec/guitar_chords_spec.jsx', 'static/js/spec/chord_sheet_practice_spec.js', 'static/js/spec/chord_sheet_spec.js', 'static/js/spec/chord_lab_spec.js', 'static/js/spec/chord_midi_spec.js', 'static/js/spec/chord_reference_spec.js'],
    bundle: true, outdir, platform: 'node', format: 'cjs',
    nodePaths: [join(root, 'static/js')], loader: {'.css': 'empty'},
    alias: {'st/app': join(outdir, 'test-session.mjs')},
  })
  const jasmine = core.core(core)
  const env = jasmine.getEnv()
  Object.assign(global, core.interface(jasmine, env))
  env.addReporter({
    specDone(result) {
      console.log(`${result.status}: ${result.fullName}`)
      for (const failure of result.failedExpectations) console.error(failure.message)
    },
    jasmineDone(result) {
      rmSync(outdir, {recursive: true, force: true})
      process.exitCode = result.overallStatus === 'passed' ? 0 : 1
    },
  })
  require(join(outdir, 'ui_reuse_spec.js'))
  require(join(outdir, 'voicing_markup_spec.js'))
  require(join(outdir, 'chord_sheet_practice_spec.js'))
  require(join(outdir, 'chord_sheet_spec.js'))
  require(join(outdir, 'chord_lab_spec.js'))
  require(join(outdir, 'chord_midi_spec.js'))
  require(join(outdir, 'chord_reference_spec.js'))
  require(join(outdir, 'guitar_chords_spec.js'))
  require(join(outdir, 'guitar_scales_spec.js'))
  require(join(outdir, 'tool_usability_spec.js'))
  require(join(outdir, 'chord_polish_spec.js'))
  env.execute()
} catch (error) {
  rmSync(outdir, {recursive: true, force: true})
  throw error
}
