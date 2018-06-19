start
  = commands

commands
  = white ? head:command rest:(white command) * white ? {
    return [head].concat(rest.map((m) => m[1]))
  }

command
  = note / rest / keySignature / timeSignature / halfTime / doubleTime / tripleTime / measure / block / restoreStartPosition / setTrack / macro

keySignature
  = "ks" mod:$( "-"? [0-9]+) {
    return ["keySignature", +mod]
  }

timeSignature
  = "ts" upper:$[0-9]+ "/" lower:$[0-9]+ {
    return ["timeSignature", +upper, +lower]
  }

setTrack
  = "t" track:$[0-9]+ {
    return ["setTrack", +track]
  }

macro
  = "$" name:[a-zA-Z0-9_]+ {
    return ["macro", name.join("")]
  }

restoreStartPosition
  = "|" {
    return ["restoreStartPosition"]
  }

note
  = name:[a-gA-G] accidental:[+=-] ? octave:[0-9] timing:("." t:noteTiming { return t }) ? {
    let opts = {
      ...timing
    }

    if (accidental == "+") {
      opts.sharp = true
    } else if (accidental == "-") {
      opts.flat = true
    } else if (accidental == "=") {
      opts.natural = true
    }

    let note = ["note", `${name.toUpperCase()}${octave}`]
    if (timing || accidental) {
     note.push(opts) 
    }
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

tripleTime
  = "tt" { return ["tripleTime"] }

measure
  = "m" measure:$([0-9]+) {
    return ["measure", +measure]
  }

block
  = "{" commands:commands "}" {
    return ["block", commands]
  }

comment
  = "#" [^\n]+

white
  = [\t\r\n ]+ (comment white) ?

//** vim: et:ts=2:sw=2:sts=2
