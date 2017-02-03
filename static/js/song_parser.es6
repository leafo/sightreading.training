
import peg from "st/song_parser_peg"
import {parseNote, noteName, KeySignature} from "st/music"

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
      startPosition: 0,
      position: 0,
      keySignature: 0,
      beatsPerNote: 1,
      beatsPerMeasure: 4,
      keySignature: new KeySignature(0),
    }

    let song = new SongNoteList()
    this.compileCommands(ast, state, song)

    song.metadata = {
      keySignature: state.keySignature.count,
    }

    return song
  }

  compileCommands(commands, state, song) {
    for (let command of commands) {
      let t = command[0]
      switch (t) {
        case "restoreStartPosition": {
          state.position = state.startPosition
          break
        }
        case "block": {
          let [, blockCommands] = command
          let blockState = {
            startPosition: state.position
          }

          Object.setPrototypeOf(blockState, state)
          this.compileCommands(blockCommands, blockState, song)

          state.position = blockState.position

          break
        }
        case "halfTime": {
          state.beatsPerNote *= 2
          break
        }
        case "doubleTime": {
          state.beatsPerNote *= 0.5
          break
        }
        case "measure": {
          let [, measure] = command
          state.position =  measure * state.beatsPerMeasure
          break
        }
        case "note": {
          let [, name, noteOpts] = command
          let duration = state.beatsPerNote
          let start = null

          let hasAccidental = false

          if (noteOpts) {
            if (noteOpts.duration) {
              duration *= noteOpts.duration
            }

            start = noteOpts.start


            if (noteOpts.sharp) {
              hasAccidental = true
              name = name.substr(0, 1) + "#" + name.substr(1)
            } else if (noteOpts.flat) {
              hasAccidental = true
              name = name.substr(0, 1) + "b" + name.substr(1)
            } else if (noteOpts.natural) {
              hasAccidental = true
            } 
          }

          if (!hasAccidental) {
            // apply default accidental
            name = state.keySignature.unconvertNote(name)
          }

          if (!start) {
            start = state.position
            state.position += duration
          }

          song.push(new SongNote(name, start, duration))
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
              duration *= restTiming.duration
            }
          }

          state.position += duration
          break
        }
        case "keySignature": {
          state.keySignature = new KeySignature(+command[1])
          break
        }
      }
    }

  }
}
