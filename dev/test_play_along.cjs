const assert = require('node:assert/strict')
const {mkdtempSync, rmSync, writeFileSync} = require('node:fs')
const {tmpdir} = require('node:os')
const {join, resolve} = require('node:path')
const esbuild = require('esbuild')
const out = mkdtempSync(join(tmpdir(), 'play-along-'))
let checks = 0
const check = (name, run) => { run(); checks++; console.log(`PASS: ${name}`) }
try {
  writeFileSync(join(out, 'session.js'), 'export function getSession() { return {} }')
  esbuild.buildSync({stdin: {contents: `export * from "st/play_along"; export {PlayAlongPage} from "st/components/pages/play_along_page"; export {default as SongParser} from "st/song_parser"; export {parseNote} from "st/music"; export {BEGINNER_SONGS} from "st/beginner_songs"`, resolveDir: resolve('.')}, bundle: true, platform: 'node', format: 'cjs', outfile: join(out, 'test.cjs'), nodePaths: [resolve('static/js')], loader: {'.css': 'empty'}, alias: {'st/app': join(out, 'session.js')}})
  global.window = {FormData: global.FormData, XMLHttpRequest: class {}, setTimeout: () => {}}
  global.localStorage = {getItem: () => null}
  const {transposeSong, playAlongState, displayedChords, PlayAlongPage, SongParser, parseNote, BEGINNER_SONGS} = require(join(out, 'test.cjs'))
  const original = SongParser.load(BEGINNER_SONGS[0].song)
  const values = song => Array.from(song, n => [parseNote(n.note), n.start, n.duration])
  const initial = values(original)
  check('all offsets shift every track by exact semitones without changing timing or source', () => {
    for (let shift = -24; shift <= 24; shift++) {
      const song = transposeSong(original, shift)
      assert.deepEqual(values(song), initial.map(([pitch, start, duration]) => [pitch + shift, start, duration]))
      for (const track of song.tracks) assert.ok(track.every(note => song.includes(note)))
      assert.equal(song.getStopInBeats(), original.getStopInBeats())
    }
    assert.deepEqual(values(original), initial)
  })
  check('flat keys, octave shifts, clefs, track names and chord labels stay consistent', () => {
    original.getTrack(0).trackName = 'Melody'
    const shifted = transposeSong(original, 1)
    assert.equal(shifted.metadata.keySignature, -5)
    assert.equal(shifted[0].note, 'Db5')
    assert.equal(shifted.getTrack(0).trackName, 'Melody')
    assert.deepEqual(shifted.getTrack(0).cleffs, original.getTrack(0).cleffs)
    assert.equal(transposeSong(original, 12).metadata.keySignature, 0)
    assert.deepEqual(displayedChords(['D','A','Bm','Fsm'], 1, -3), ['Eb','Bb','Cm','Gm'])
  })
  check('autochord roots and generated accompaniment transpose with the melody', () => {
    const source = SongParser.load('ks0 ts4/4 $C c5.4 $G g5.4')
    const shifted = transposeSong(source, -2)
    assert.deepEqual(shifted.autoChords, [[0, ['Bb','M']], [4, ['F','M']]])
    assert.deepEqual(values(shifted), values(source).map(([pitch, start, duration]) => [pitch-2,start,duration]))
  })
  check('fractional, excessive, corrupt and out-of-MIDI-range shifts are rejected', () => {
    for (const value of [NaN, 1.5, -25, 25, '2']) assert.throws(() => transposeSong(original, value))
    assert.throws(() => transposeSong(SongParser.load('c0'), -1), /MIDI range/)
    assert.throws(() => transposeSong(SongParser.load('b9'), 24), /MIDI range/)
    assert.deepEqual(playAlongState({transpose: 1.5}), {transpose: 0})
    assert.deepEqual(playAlongState({transpose: -12}), {transpose: -12})
  })
  const noteOff = [], noteOn = []
  const page = new PlayAlongPage({params: {preset_id: 'twinkle-twinkle'}, midiOutput: {getMetronome: () => null, noteOn: (...args) => noteOn.push(args), noteOff: (...args) => noteOff.push(args)}})
  page.setState = (update, done) => {Object.assign(page.state, typeof update === 'function' ? update(page.state) : update); done?.()}
  page.refs = {currentBeatField: {setState() {}}}
  page.loadSong()
  page.refreshSong()
  check('preset playback sends middle C to MIDI 60, not 48', () => {
    page.onNoteStart(page.state.song.getTrack(0)[0])
    assert.equal(noteOn.at(-1)[0], 60)
  })
  check('transpose stops old sounding notes, clears stale held hits and preserves position and loop', () => {
    const timer = page.state.songTimer, sounding = page.state.song.getTrack(0)[0]
    timer.playingNotes = [sounding]
    timer.running = true
    page.currentBeat = 12
    page.state.loopLeft = 8; page.state.loopRight = 24
    page.state.heldNotes = {C5: {songNote: sounding}}
    page.hitNotes.add(sounding)
    page.midiInput.heldNotes = {C5: {held: true}}
    page.changeTranspose('1')
    assert.equal(timer.running, false)
    assert.ok(noteOff.some(args => args[0] === 60))
    assert.equal(page.state.songTimer.running, false)
    assert.equal(page.state.songTimer.beat, 12)
    assert.equal(page.state.loopLeft, 8); assert.equal(page.state.loopRight, 24)
    assert.deepEqual(page.state.heldNotes, {}); assert.deepEqual(page.midiInput.heldNotes, {})
    assert.equal(page.hitNotes.size, 0)
    assert.equal(page.state.song[0].note, 'Db5')
    assert.equal(page.state.currentSongCode, BEGINNER_SONGS[0].song)
    assert.equal(page.state.sourceSong[0].note, 'C5')
  })
  check('repeated shifts rebuild from source, feed MIDI and note matching, then restore the original', () => {
    page.changeTranspose('2'); page.changeTranspose('-1')
    assert.equal(parseNote(page.state.song[0].note), 59)
    page.currentBeat = 0
    const matched = page.state.song.matchNoteFast('B4', 0, 24, 0)
    assert.equal(page.state.song[matched].note, 'B4')
    page.state.loopLeft = 0
    page.state.songTimer.setBpm(page.state.bpm)
    page.state.songTimer.running = true
    page.pressNote('B4')
    assert.equal(page.stats.hits, 1)
    page.releaseNote('B4')
    page.onNoteStart(page.state.song[0]); assert.equal(noteOn.at(-1)[0], 59)
    page.changeTranspose('0')
    assert.deepEqual(values(page.state.song), initial)
    const keyboard = page.renderKeyboard().props
    assert.ok(keyboard.lower <= Math.min(...page.state.song.map(n => parseNote(n.note))))
    assert.ok(keyboard.upper >= Math.max(...page.state.song.map(n => parseNote(n.note))))
  })
  check('failed transpose leaves the current offset and song intact', () => {
    const song = page.state.song
    page.changeTranspose('1.5')
    assert.equal(page.state.song, song)
    assert.equal(page.state.transpose, 0)
    assert.match(page.state.transposeError, /whole number/)
  })
  check('the saved shift is restored and a pitch-error state still exposes the reset control', () => {
    let saved
    global.localStorage = {getItem: () => saved || null, setItem: (key, value) => { saved = value }}
    const before = {...page.state}
    page.changeTranspose('12')
    page.componentDidUpdate(page.props, before)
    const next = new PlayAlongPage({params: {}})
    assert.equal(next.state.transpose, 12)
    next.setState = (update, done) => {Object.assign(next.state, typeof update === 'function' ? update(next.state) : update); done?.()}
    next.state.currentSongCode = 'c0'
    next.state.transpose = -24
    next.refreshSong()
    assert.match(next.state.songError, /MIDI range/)
    const nodes = node => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)]
    assert.ok(nodes(next.render()).some(node => node.type === 'select' && node.props.value === -24))
  })
  console.log(`${checks} Play Along checks passed`)
} finally { rmSync(out, {recursive: true, force: true}) }
