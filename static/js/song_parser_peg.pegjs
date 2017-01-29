start
  = white ? head:command rest:(white command) * white ? {
    return [head].concat(rest.map((m) => m[1]))
  }

command
  = note / rest / keySignature

keySignature
  = "ks" mod:$( "-"? [0-9]+) {
    return ["keySignature", +mod]
  }

note
  = name:[a-gA-G] octave:[0-9] timing:("." t:noteTiming { return t }) ? {
    let note = ["note", `${name}${octave}`.toUpperCase()]
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

white
  = [\t\r\n ]+

//** vim: et:ts=2:sw=2:sts=2
