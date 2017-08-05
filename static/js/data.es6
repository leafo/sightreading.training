
import {MajorScale, parseNote, noteName} from "st/music"

import {
  RandomNotes, SweepRangeNotes, MiniSteps, TriadNotes, SevenOpenNotes,
  ProgressionGenerator, PositionGenerator
} from "st/generators"

import {ChordGenerator, MultiKeyChordGenerator} from "st/chord_generators"
import {GStaff, FStaff, GrandStaff, ChordStaff} from "st/components/staves"

let smoothInput = {
  name: "smoothness",
  type: "range",
  default: 3,
  min: 0,
  max: 6,
}

let noteRangeInput = {
  name: "noteRange",
  type: "noteRange",
  label: "note range",
  // default: [0, 99], // default is set automatically
  min: 0,
  max: 100,
}

function staffRange(staff, noteRange) {
  if (noteRange) {
    return [
      noteName(Math.max(noteRange[0], parseNote(staff.range[0]))),
      noteName(Math.min(noteRange[1], parseNote(staff.range[1])))
    ]
  } else {
    return staff.range
  }
}

export const STAVES = [
  {
    mode: "notes",
    name: "treble",
    range: ["A4", "C7"],
    render: function(props=this.state) {
      return <GStaff
        ref={(staff) => this.staff = staff}
        {...props}
      />
    },
  },
  {
    mode: "notes",
    name: "bass",
    range: ["C3", "E5"],
    render: function(props=this.state) {
      return <FStaff
        ref={(staff) => this.staff = staff}
        {...props}
      />
    },
  },
  {
    mode: "notes",
    name: "grand",
    range: ["C3", "C7"],
    render: function(props=this.state) {
      return <GrandStaff
        ref={(staff) => this.staff = staff}
        {...props}
      />
    },
  },
  {
    mode: "chords",
    name: "chord",
    range: ["B7", "C8"],
    render: function(props) {
      return <ChordStaff 
        chords={this.state.notes}
        noteShaking={this.state.noteShaking}
        touchedNotes={this.state.touchedNotes}
        ref={(staff) => this.staff = staff}
        {...props}
      />
    }
  }
]

export const GENERATORS = [
  {
    name: "random",
    mode: "notes",
    inputs: [
      {
        name: "notes",
        type: "range",
        min: 1,
        max: 5,
      },
      {
        name: "hands",
        type: "range",
        default: 2,
        min: 1,
        max: 2,
      },
      smoothInput,
      noteRangeInput,
      {
        label: "chord based",
        name: "musical",
        type: "bool",
        hint: "Column fits random chord",
      }
    ],
    create: function(staff, keySignature, options) {
      let scale = keySignature.defaultScale()
      let notes = scale.getLooseRange(...staffRange(staff, options.noteRange))

      // send the scale
      if (options.musical) {
        options = {
          scale,
          ...options
        }
      }

      return new RandomNotes(notes, options)
    }
  },
  {
    name: "sweep",
    mode: "notes",
    debug: true,
    create: function(staff, keySignature) {
      let notes = new MajorScale(keySignature)
        .getLooseRange(...staff.range);

      return new SweepRangeNotes(notes);
    }
  },
  {
    name: "steps",
    mode: "notes",
    debug: true, // not needed anymore with smoothness
    create: function(staff, keySignature) {
      let notes = new MajorScale(keySignature)
        .getLooseRange(...staff.range);
      return new MiniSteps(notes);
    }
  },
  {
    name: "triads",
    mode: "notes",
    inputs: [
      smoothInput
    ],
    create: function(staff, keySignature, options) {
      let notes = new MajorScale(keySignature)
        .getLooseRange(...staff.range);
      return new TriadNotes(notes, options);
    }
  },
  {
    name: "sevens",
    mode: "notes",
    inputs: [
      smoothInput,
      noteRangeInput,
    ],
    create: function(staff, keySignature, options) {
      let scale = keySignature.defaultScale()
      let notes = scale.getLooseRange(...staffRange(staff, options.noteRange))

      return new SevenOpenNotes(notes, options);
    }
  },
  {
    name: "progression",
    mode: "notes",
    inputs: [
      smoothInput,
      {
        name: "progression",
        type: "select",
        values: [
          {
            name: "autumn leaves",
            // in major degrees
            value: [
              [2, "m7"],
              [5, "7"],
              [1, "M7"],
              [4, "M7"],
              [7, "m7b5"],
              [3, "7"],
              [6, "m"],
            ],

            // // iv7 – VII7 – IIImaj7 – VImaj7 – ii7(b5) – V7 – i
            // // in minor degrees
            // // TODO: make it work with minor progressions
            // let progression = [
            //   [4, "m7"],
            //   [7, "7"],
            //   [3, "M7"],
            //   [6, "M7"],
            //   [2, "m7b5"],
            //   [5, "7"],
            //   [1, "m"],
            // ]
          },

          {
            name: "50s",
            value: [
              [1, "M"],
              [6, "m"],
              [4, "M"],
              [5, "M"],
            ]
          },

          {
            name: "circle",
            value: [
              [6, "m"],
              [2, "m"],
              [5, "M"],
              [1, "M"],
            ]
          },

          {
            name: "basic substitution",
            value: [
              [1, "M7"],
              [2, "7"],
              [5, "7"],
            ],
          },
        ],
      }
    ],
    create: function(staff, keySignature, options) {
      let scale = new MajorScale(keySignature)
      let progressionInputs = this.inputs.find(i => i.name == "progression")
      let progression = progressionInputs.values.find(v => v.name == options.progression)
      return new ProgressionGenerator(scale, staff.range, progression.value, options)
    }
  },
  {
    name: "position",
    mode: "notes",
    inputs: [],
    create: function(staff, keySignature, options) {
      let notes = new MajorScale(keySignature)
        .getLooseRange(...staff.range);

      return new PositionGenerator(notes, options)
    }
  },
  {
    name: "random",
    mode: "chords",
    inputs: [
      {
        name: "scale",
        type: "select",
        values: [
          { name: "major" },
          { name: "minor" },
          // { name: "major blues"},
        ]
      },
      {
        name: "notes",
        type: "range",
        default: 3,
        min: 3,
        max: 4,
      },
      {
        name: "commonNotes",
        label: "common notes",
        type: "select",
        values: [
          {
            name: "any",
            value: -1
          },
          {
            name: "1",
            value: 1
          },
          {
            name: "2",
            value: 2
          }
        ]
      }
    ],
    create: function(staff, keySignature, options) {
      return new ChordGenerator(keySignature, options)
    }
  },
  {
    name: "multi-key",
    mode: "chords",
    inputs: [
      {
        name: "notes",
        type: "range",
        default: 3,
        min: 3,
        max: 4,
      },
      {
        name: "commonNotes",
        label: "common notes",
        type: "select",
        values: [
          {
            name: "any",
            value: -1
          },
          {
            name: "1",
            value: 1
          },
          {
            name: "2",
            value: 2
          }
        ]
      }
    ],
    create: function(staff, keySignature, options) {
      return new MultiKeyChordGenerator(keySignature, options)
    }
  }

]
