const assert = require('node:assert/strict')
const {mkdtempSync, rmSync} = require('node:fs')
const {tmpdir} = require('node:os')
const {join, resolve} = require('node:path')
const esbuild = require('esbuild')
const out = mkdtempSync(join(tmpdir(), 'beginner-songs-'))
try {
  esbuild.buildSync({stdin: {contents: `export {BEGINNER_SONGS, getBeginnerSong} from "st/beginner_songs"; export {default as SongParser} from "st/song_parser"; export {parseNote} from "st/music"`, resolveDir: resolve('.')}, bundle: true, platform: 'node', format: 'cjs', outfile: join(out, 'songs.cjs'), nodePaths: [resolve('static/js')]})
  const {BEGINNER_SONGS, getBeginnerSong, SongParser, parseNote} = require(join(out, 'songs.cjs'))
  assert.equal(BEGINNER_SONGS.length, 4)
  assert.equal(new Set(BEGINNER_SONGS.map(s => s.id)).size, 4)
  assert.equal(getBeginnerSong('missing'), undefined)
  for (const preset of BEGINNER_SONGS) {
    const song = SongParser.load(preset.song)
    assert.equal(getBeginnerSong(preset.id), preset)
    assert.equal(song.getStopInBeats(), preset.chords.length * 4)
    assert.equal(song.tracks.length, 2)
    const [melody, chords] = song.tracks
    assert.equal(melody.getStopInBeats(), chords.getStopInBeats())
    assert.equal(chords.length, preset.chords.length * 3)
    for (let bar = 0; bar < preset.chords.length; bar++) {
      const notes = chords.filter(n => n.start === bar * 4)
      assert.equal(notes.length, 3)
      assert.ok(notes.every(n => n.duration === 4))
    }
    assert.ok(melody.every((n, i) => n.duration >= (preset.id === 'canon-in-d' ? 0.5 : 1) && (!i || n.start >= melody[i-1].start + melody[i-1].duration)))
    assert.equal(song.metadata.keySignature, preset.key === 'D' ? 2 : 0)
    if (preset.key === 'D') assert.ok(melody.some(n => n.note === 'F#5'))
    if (preset.id !== 'canon-in-d') assert.ok(melody.every(n => parseNote(n.note) >= 60 && parseNote(n.note) <= 72))
    assert.ok(chords.every(n => parseNote(n.note) >= 47 && parseNote(n.note) <= 59))
    if (preset.id === 'canon-in-d') {
      assert.equal(preset.chords.length, 33)
      assert.deepEqual(Array.from(melody.slice(0, 8), n => parseNote(n.note)), [62, 66, 69, 74, 69, 66, 62, 57])
      assert.ok(melody.filter(n => n.start < 32).every(n => n.duration === 0.5))
      assert.deepEqual(Array.from(melody.filter(n => n.start >= 32 && n.start < 64), n => parseNote(n.note)), [66, 64, 62, 61, 59, 57, 59, 61])
      assert.equal(melody.at(-1).note, 'D6')
    }
    console.log(`PASS: ${preset.title}: ${preset.chords.length} measures, melody and aligned triads`)
  }
} finally { rmSync(out, {recursive: true, force: true}) }
