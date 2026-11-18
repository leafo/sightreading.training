const assert = require('node:assert/strict')
const {mkdtempSync, rmSync} = require('node:fs')
const {tmpdir} = require('node:os')
const {join, resolve} = require('node:path')
const esbuild = require('esbuild')
const out = mkdtempSync(join(tmpdir(), 'beginner-songs-'))
try {
  esbuild.buildSync({stdin: {contents: `export {BEGINNER_SONGS, getBeginnerSong} from "st/beginner_songs"; export {default as SongParser} from "st/song_parser"`, resolveDir: resolve('.')}, bundle: true, platform: 'node', format: 'cjs', outfile: join(out, 'songs.cjs'), nodePaths: [resolve('static/js')]})
  const {BEGINNER_SONGS, getBeginnerSong, SongParser} = require(join(out, 'songs.cjs'))
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
    assert.ok(melody.every((n, i) => n.duration >= 1 && (!i || n.start >= melody[i-1].start + melody[i-1].duration)))
    assert.equal(song.metadata.keySignature, preset.key === 'D' ? 2 : 0)
    if (preset.key === 'D') assert.ok(melody.some(n => n.note === 'F#4'))
    console.log(`PASS: ${preset.title}: ${preset.chords.length} measures, melody and aligned triads`)
  }
} finally { rmSync(out, {recursive: true, force: true}) }
