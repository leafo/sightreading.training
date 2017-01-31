start
  = commands

commands
  = white ? head:command rest:(white command) * white ? {
    return [head].concat(rest.map((m) => m[1]))
  }

command
  = note / rest / keySignature / halfTime / doubleTime / measure / block

keySignature
  = "ks" mod:$( "-"? [0-9]+) {
    return ["keySignature", +mod]
  }

note
  = name:[a-gA-G] accidental:[+-] ? octave:[0-9] timing:("." t:noteTiming { return t }) ? {
    if (accidental == "+") {
      accidental = "#"
    }
    if (accidental == "-") {
      accidental = "b"
    }
    let note = ["note", `${name.toUpperCase()}${accidental || ""}${octave}`]
    if (timing) { note.push(timing) }
    return note
  }

rest
  = [rR] timing:(noteTiming) ? {
    let rest = ["rest"]
    if (timing) { rest.push(timing) }
    return rest
  }

noteTiming
  = duration:$([0-9]+) start:( "." s:$([0-9]+) { return s } ) ?  {
    let timing = {}

    if (duration) {
      timing.duration = +duration
    }

    if (start) {
      timing.start = +start
    }

    return timing
  }

halfTime
  = "ht" { return ["halfTime"] }

doubleTime
  = "dt" { return ["doubleTime"] }

measure
  = "m" measure:$([0-9]+) {
    return ["measure", +measure]
  }

block
  = "{" commands:commands "}" {
    return ["block", commands]
  }

white
  = [\t\r\n ]+

//** vim: et:ts=2:sw=2:sts=2
