
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
    create: function(staff) {
      let notes = new MajorScale(this.state.keySignature)
        .getLooseRange(...staff.range);

      return new RandomNotes(notes);
    }
  },
  {
    name: "sweep",
    debug: true,
    create: function(staff) {
      let notes = new MajorScale(this.state.keySignature)
        .getLooseRange(...staff.range);

      return new SweepRangeNotes(notes);
    }
  },
  {
    name: "steps",
    create: function(staff) {
      let notes = new MajorScale(this.state.keySignature)
        .getLooseRange(...staff.range);
      return new MiniSteps(notes);
    }
  },
  {
    name: "dual",
    create: function(staff) {
      let notes = new MajorScale(this.state.keySignature)
        .getLooseRange(...staff.range);

      let mid = Math.floor(notes.length / 2);

      return new DualRandomNotes(notes.slice(0, mid), notes.slice(mid));

    }
  },
  {
    name: "triads",
    create: function(staff) {
      let notes = new MajorScale(this.state.keySignature)
        .getLooseRange(...staff.range);
      return new TriadNotes(notes);
    }
  },
  {
    name: "sevens",
    create: function(staff) {
      let notes = new MajorScale(this.state.keySignature)
        .getLooseRange(...staff.range);
      return new SevenOpenNotes(notes);
    }
  },
  {
    name: "progression",
    create: function(staff) {
      let scale = new MajorScale(this.state.keySignature)

      // iv7 – VII7 – IIImaj7 – VImaj7 – ii7(b5) – V7 – i
      // in minor degrees
      // TODO: make it work with minor progressions
      let progression = [
        [4, "m7"],
        [7, "7"],
        [3, "M7"],
        [6, "M7"],
        [2, "m7b5"],
        [5, "7"],
        [1, "m"],
      ]

      // major degrees
      progression = [
        [2, "m7"],
        [5, "7"],
        [1, "M7"],
        [4, "M7"],
        [7, "m7b5"],
        [3, "7"],
        [6, "m"],
      ]

      return new ProgressionGenerator(scale, staff.range, progression)
    }
  }

]
