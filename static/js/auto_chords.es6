
import {Chord, parseNote, noteName, MIDDLE_C_PITCH} from "st/music"
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

  constructor(song) {
    this.song = song
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

    // just mutate the song for now
    for (let note of notesToAdd) {
      this.song.push(note)
    }
  }

  minPitchInRange(start, stop) {
    let notes = this.song.notesInRange(start, stop)

    let pitches = [
      MIDDLE_C_PITCH,
      ...notes.map(n => parseNote(n.note))
    ]

    return Math.min(...pitches)
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
    while (left + chunkSize <= stop) {
      fn(left, Math.min(stop, left + chunkSize), k)
      left += chunkSize
      k += 1
    }
  }
}

export class RootAutoChords extends AutoChords {
  notesForChord(root, shape, blockStart, blockStop) {
    let maxPitch = this.minPitchInRange(blockStart, blockStop)

    let out = []
    this.inDivisions(blockStart, blockStop, 2, (start, stop) => {
      out.push(
        new SongNote(this.rootBelow(root, maxPitch), start, stop - start)
      )
    })

    return out
  }
}

export class TriadAutoChords extends AutoChords {
  notesForChord(root, shape, blockStart, blockStop) {
    let notesToAdd = []

    let maxPitch = this.minPitchInRange(blockStart, blockStop)
    let chordRoot = this.rootBelow(root, maxPitch)

    return Chord.notes(chordRoot, shape).map((note) =>
      new SongNote(note, blockStart, blockStop - blockStart)
    )
  }
}

export class Root5AutoChords extends AutoChords {
  notesForChord(root, shape, blockStart, blockStop) {
    let maxPitch = this.minPitchInRange(blockStart, blockStop)
    let chordRoot = this.rootBelow(root, maxPitch)
    let chordNotes = Chord.notes(chordRoot, shape)

    let out = []
    this.inDivisions(blockStart, blockStop, 2, (start, stop, k) => {
      let d = (stop - start) / 2

      switch (k) {
        case 0:
          out.push(
            new SongNote(chordNotes[0], start, stop - start)
          )
          break
        case 1:
        case 2:
          out.push(
            new SongNote(chordNotes[2], start, stop - start)
          )
          break
      }
    })

    return out

  }
}

export class ArpAutoChords extends AutoChords {
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

    return out
  }
}


export class BossaNovaAutoChords extends AutoChords {
  notesForChord(root, shape, blockStart, blockStop) {
    let maxPitch = this.minPitchInRange(blockStart, blockStop)
    let chordRoot = this.rootBelow(root, maxPitch)
    let chordNotes = Chord.notes(chordRoot, shape)

    let out = []
    this.inDivisions(blockStart, blockStop, 3, (start, stop, k) => {
      let d = (stop - start) / 2

      switch (k) {
        case 0:
          out.push(
            new SongNote(chordNotes[0], start, d * 3 )
          )
          break
        case 1:
          out.push(
            new SongNote(chordNotes[0], start + d, d)
          )
          break
        case 2:
          out.push(
            new SongNote(chordNotes[2], start, d * 3 )
          )
          break
        case 3:
          out.push(
            new SongNote(chordNotes[2], start + d, d)
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

