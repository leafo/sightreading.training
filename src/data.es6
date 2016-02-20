
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
      let notes = new MajorScale(this.state.keySignature.name())
        .getLooseRange(...staff.range);

      return new RandomNotes(notes);
    }
  },
  {
    name: "sweep",
    debug: true,
    create: function(staff) {
      let notes = new MajorScale(this.state.keySignature.name())
        .getLooseRange(...staff.range);

      return new SweepRangeNotes(notes);
    }
  },
  {
    name: "steps",
    create: function(staff) {
      let notes = new MajorScale(this.state.keySignature.name())
        .getLooseRange(...staff.range);
      return new MiniSteps(notes);
    }
  },
  {
    name: "dual",
    create: function(staff) {
      let notes = new MajorScale(this.state.keySignature.name())
        .getLooseRange(...staff.range);

      let mid = Math.floor(notes.length / 2);

      return new DualRandomNotes(notes.slice(0, mid), notes.slice(mid));

    }
  },
  {
    name: "triads",
    create: function(staff) {
      let notes = new MajorScale(this.state.keySignature.name())
        .getLooseRange(...staff.range);
      return new TriadNotes(notes);
    }
  }
]
