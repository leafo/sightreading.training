
N.STAVES = [
  {
    name: "treble",
    range: ["A4", "C7"],
    render: function() {
      return <GStaff
        ref={(staff) => this.staff = staff}
        {...this.state} />;
    },
  },
  {
    name: "bass",
    range: ["C3", "E5"],
    render: function() {
      return <FStaff
        ref={(staff) => this.staff = staff}
        {...this.state} />;
    },
  },
  {
    name: "grand",
    range: ["C3", "C7"],
    render: function() {
      return <GrandStaff
        ref={(staff) => this.staff = staff}
        {...this.state} />;
    },
  }
]

N.GENERATORS = [
  {
    name: "random",
    inputs: [
      {
        name: "notes",
        type: "range",
        min: 1,
        max: 5,
      }
    ],
    create: function(staff, keySignature, options) {
      let notes = new MajorScale(keySignature)
        .getLooseRange(...staff.range)

      return new RandomNotes(notes, options)
    }
  },
  {
    name: "sweep",
    debug: true,
    create: function(staff, keySignature) {
      let notes = new MajorScale(keySignature)
        .getLooseRange(...staff.range);

      return new SweepRangeNotes(notes);
    }
  },
  {
    name: "steps",
    create: function(staff, keySignature) {
      let notes = new MajorScale(keySignature)
        .getLooseRange(...staff.range);
      return new MiniSteps(notes);
    }
  },
  {
    name: "triads",
    create: function(staff, keySignature) {
      let notes = new MajorScale(keySignature)
        .getLooseRange(...staff.range);
      return new TriadNotes(notes);
    }
  },
  {
    name: "sevens",
    create: function(staff, keySignature) {
      let notes = new MajorScale(keySignature)
        .getLooseRange(...staff.range);
      return new SevenOpenNotes(notes);
    }
  },
  {
    name: "progression",
    inputs: [
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
            name: "basic",
            value: [
              [1, "M7"],
              [4, "M7"],
              [5, "7"],
            ],
          },
          {
            name: "sub",
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
      let progressionName = options.progression || progressionInputs.values[0].name
      let progression = progressionInputs.values.find(v => v.name == progressionName)

      return new ProgressionGenerator(scale, staff.range, progression.value)
    }
  }

]
