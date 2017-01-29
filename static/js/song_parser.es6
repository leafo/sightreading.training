
import peg from "st/song_parser_peg"


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

  parse(songText) {
    console.log("parsing", songText)
    console.log(peg)
  }

  evaluate(ast) {
  }
}
