
import {
  Chord, parseNote, noteName, addInterval, MIDDLE_C_PITCH, OCTAVE_SIZE
} from "st/music"

import {SongNote} from "st/song_note_list"

export class AutoChords {
  static defaultChords(song) {
    return new BossaNovaAutoChords(song)
  }

  // attempt to parse chord from macro name
  static coerceChord(macro) {
    let m = macro.match(/([a-gA-G][#b]?)(.*)/)
    if (!m) { return }
    let [, root, shape] =  m

    root = root.substr(0,1).toUpperCase() + root.substr(1)

    if (shape == "") {
      shape = "M"
    }

    if (!Chord.SHAPES[shape]) {
      return
    }

    return [root, shape]
  }

  constructor(song, options={}) {
    this.song = song
    this.options = options
  }

  findChordBlocks() {
    let beatsPerMeasure = this.song.metadata.beatsPerMeasure

    if (!beatsPerMeasure) {
      throw "Missing beats per measure for autochords"
    }

    if (!this.song.autoChords) {
      throw "Song missing autochords"
    }

    let chords = [...this.song.autoChords]
    chords.reverse()
    let chordBlocks = []

    let chordsUntil = null

    for (let [position, chord] of chords) {
      let start = position
      let stop = (Math.floor((position / beatsPerMeasure)) + 1) * beatsPerMeasure

      if (chordsUntil) {
        stop = Math.min(stop, chordsUntil)
      }

      if (start >= stop) {
        console.warn("rejecting chord", chord, start, stop)
        continue
      }

      chordBlocks.push({
        start, stop, chord
      })
      chordsUntil = start
    }

    chordBlocks.reverse()
    return chordBlocks
  }

  addChords() {
    let blocks = this.findChordBlocks()
    let notesToAdd = [] // the final set of notes added

    for (let block of blocks) {
      let [root, shape] = block.chord

      let toAdd = this.notesForChord(root, shape, block.start, block.stop)

      if (toAdd) {
        notesToAdd.push(...toAdd)
      }
    }

    let trackId = this.song.findEmptyTrackIdx()

    // just mutate the song for now
    for (let note of notesToAdd) {
      this.song.pushWithTrack(note, trackId)
    }

    let track = this.song.getTrack(trackId)
    track.trackName = "Autochords"
  }

  minPitchInRange(start, stop) {
    let notes = this.song.notesInRange(start, stop)


    let pitches = [
      MIDDLE_C_PITCH + 5,
      ...notes.map(n => parseNote(n.note))
    ]

    let minPitch = Math.min(...pitches)

    if (this.options.chordMinSpacing) {
      minPitch -= this.options.chordMinSpacing
    }

    return minPitch
  }

  // find the closest root beneath the notes in range
  rootBelow(name, maxPitch) {
    let rootPitch = parseNote(name + "0")
    let chordRootPitch = Math.floor(((maxPitch - 1) - rootPitch) / 12) * 12 + rootPitch
    return noteName(chordRootPitch)
  }

  notesForChord(root, shape, blockStart, blockStop) {
    console.warn("Autochords doesn't generate any notes")
    return []
  }

  inDivisions(start, stop, count, fn) {
    let bpm = this.song.metadata.beatsPerMeasure

    let chunkSize = bpm / Math.pow(2, count - 1)
    let left = start

    let k = 0
    while (true) {
      let right = Math.min(stop, left + chunkSize)

      fn(left, right, k)
      left += chunkSize
      k += 1

      if (right >= stop) {
        break
      }
    }
  }
}

export class RootAutoChords extends AutoChords {
  static displayName = "Root"
  notesForChord(root, shape, blockStart, blockStop) {
    let maxPitch = this.minPitchInRange(blockStart, blockStop)

    let rate = this.options.rate || 1

    let out = []
    this.inDivisions(blockStart, blockStop, rate, (start, stop) => {
      out.push(
        new SongNote(this.rootBelow(root, maxPitch), start, stop - start)
      )
    })

    return out
  }
}

export class TriadAutoChords extends AutoChords {
  static displayName = "Triad"
  notesForChord(root, shape, blockStart, blockStop) {
    let notesToAdd = []

    let maxPitch = this.minPitchInRange(blockStart, blockStop)
    let chordRoot = this.rootBelow(root, maxPitch)

    let rate = this.options.rate || 1

    let out = []

    this.inDivisions(blockStart, blockStop, rate, (start, stop) => {
      Chord.notes(chordRoot, shape).map((note) =>
        out.push(new SongNote(note, start, stop - start))
      )
    })

    return out
  }
}

export class Root5AutoChords extends AutoChords {
  static displayName = "Root+5"
  notesForChord(root, shape, blockStart, blockStop) {
    let maxPitch = this.minPitchInRange(blockStart, blockStop)
    let chordRoot = this.rootBelow(root, maxPitch)
    let chordNotes = Chord.notes(chordRoot, shape)

    if (parseNote(chordNotes[2]) > maxPitch) {
      chordRoot = addInterval(chordRoot, -OCTAVE_SIZE)
      chordNotes = Chord.notes(chordRoot, shape)
    }

    let rate = this.options.rate || 1

    let bpm = this.song.metadata.beatsPerMeasure || 2

    let out = []
    this.inDivisions(blockStart, blockStop, 1 + rate, (start, stop, k) => {
      if (k % bpm == 0) {
        // root on beat
        out.push(
          new SongNote(chordNotes[0], start, stop - start)
        )
      } else {
        // 5 on everything else
        out.push(
          new SongNote(chordNotes[2], start, stop - start)
        )
      }
    })

    return out
  }
}

export class ArpAutoChords extends AutoChords {
  static displayName = "Arp"
  notesForChord(root, shape, blockStart, blockStop) {
    let maxPitch = this.minPitchInRange(blockStart, blockStop)
    let chordRoot = this.rootBelow(root, maxPitch)
    let chordNotes = Chord.notes(chordRoot, shape)

    let out = []
    this.inDivisions(blockStart, blockStop, 3, (start, stop, k) => {
      switch (k) {
        case 0:
          out.push(
            new SongNote(chordNotes[0], start, stop - start)
          )
          break
        case 1:
          out.push(
            new SongNote(chordNotes[1], start, stop - start)
          )
          break
        case 2:
          out.push(
            new SongNote(chordNotes[3] || chordNotes[2],
              start, stop - start)
          )
          break
        case 3:
          out.push(
            new SongNote(chordNotes[1], start, stop - start)
          )
          break
      }
    })

    for (let note of out) {
      while (parseNote(note.note) >= maxPitch) {
        // shift everything done by octave
        for (let note of out) {
          note.note = noteName(parseNote(note.note) - 12)
        }
      }
    }


    return out
  }
}


export class BossaNovaAutoChords extends AutoChords {
  static displayName = "Bossa Nova"
  notesForChord(root, shape, blockStart, blockStop) {
    let maxPitch = this.minPitchInRange(blockStart, blockStop)
    let chordRoot = this.rootBelow(root, maxPitch)
    let chordNotes = Chord.notes(chordRoot, shape)

    let out = []
    this.inDivisions(blockStart, blockStop, 3, (start, stop, k) => {
      let d = (stop - start) / 2

      let one = chordNotes[0]
      let two = chordNotes[2]

      if (parseNote(two) >= maxPitch) {
        one = noteName(parseNote(chordNotes[2]) - 12)
        two = chordNotes[0]
      }

      switch (k) {
        case 0:
          out.push(
            new SongNote(one, start, d * 3 )
          )
          break
        case 1:
          out.push(
            new SongNote(one, start + d, d)
          )
          break
        case 2:
          out.push(
            new SongNote(two, start, d * 3 )
          )
          break
        case 3:
          out.push(
            new SongNote(two, start + d, d)
          )
          break
      }
    })

    return out
  }
}


AutoChords.allGenerators = [
  RootAutoChords,
  TriadAutoChords,
  Root5AutoChords,
  ArpAutoChords,
  BossaNovaAutoChords,
]

