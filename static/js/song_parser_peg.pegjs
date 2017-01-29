start
  = white ? head:command rest:(white command) * white ? {
    return [head].concat(rest.map((m) => m[1]))
  }

command
  = note

note
  = name:[a-gA-G] octave:[0-9] timing:(noteTiming) ? {
    let note = ["note", `${name}${octave}`.toUpperCase()]
    if (timing) {
      note.push(timing)
    }

    return note
  }

noteTiming
  = "." duration:($ [0-9]+) start:( "." s:($ [0-9]+) { return s } ) ?  {
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
