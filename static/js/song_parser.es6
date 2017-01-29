
import peg from "st/song_parser_peg"

import {SongNoteList, SongNote} from "st/song_note_list"

// tokens are separated by whitepace
// a note is a5.1.2
//   - 5 is the octave
//   - 1 is the duration
//   - 2 is the start
//
//   duration and start are optional
//   duration defaults to 1 beat (or the current duration)
//   start defauls to current cusor position


export default class SongParser {
  static peg = peg

  static load(songText) {
    let parser = new SongParser
    let ast = parser.parse(songText)
    return parser.compile(ast)
  }

  // convert song text to ast
  parse(songText) {
    return peg.parse(songText)
  }

  // compile ast to song notes
  compile(ast) {
    let state = {
      position: 0,
      keySignature: 0,
      beatsPerNote: 1,
    }

    let song = new SongNoteList()

    for (let command of ast) {
      let t = command[0]
      switch (t) {
        case "note": {
          let [, noteName, noteTiming] = command
          let duration = state.beatsPerNote
          let start = null

          if (noteTiming) {
            if (noteTiming.duration) {
              duration = noteTiming.duration
            }

            start = noteTiming.start
          }

          if (!start) {
            start = state.position
            state.position += duration
          }

          song.push(new SongNote(noteName, start, duration))
          break
        }
        case "rest": {
          let [, restTiming] = command

          let duration = state.beatsPerNote

          if (restTiming) {
            if (restTiming.start) {
              break // do nothing
            }

            if (restTiming.duration) {
              duration = restTiming.duration
            }
          }

          state.position += duration
          break
        }
        case "keySignature": {
          state.keySignature = command[1]
          break
        }
      }

    }

    return song
  }
}
