
let {PropTypes: types} = React;

const DEFAULT_NOTE_WIDTH = 100;
const DEFAULT_SPEED = 400;

class Page extends React.Component {
  static STAVES = [
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
  ];

  static GENERATORS = [
    {
      name: "random",
      create: function(staff) {
        let notes = new MajorScale("C").getLooseRange(...staff.range);
        return new RandomNotes(notes);
      }
    },
    {
      name: "sweep",
      debug: true,
      create: function(staff) {
        let notes = new MajorScale("C").getLooseRange(...staff.range);
        return new SweepRangeNotes(notes);
      }
    },
    {
      name: "steps",
      create: function(staff) {
        let notes = new MajorScale("C").getLooseRange(...staff.range);
        return new MiniSteps(notes);
      }
    },
    {
      name: "dual",
      create: function(staff) {
        let notes = new MajorScale("C").getLooseRange(...staff.range);
        let mid = Math.floor(notes.length / 2);
        return new DualRandomNotes(notes.slice(0, mid), notes.slice(mid));

      }
    },
    {
      name: "triads",
      create: function(staff) {
        let notes = new MajorScale("C").getLooseRange(...staff.range);
        return new TriadNotes(notes);
      }
    }
  ]

  constructor(props) {
    super(props);

    this.state = {
      midi: null,
      noteShaking: false,
      heldNotes: {},
      touchedNotes: {},
      scrollSpeed: 100,

      noteWidth: DEFAULT_NOTE_WIDTH,
      statsLightboxOpen: false,
      introLightboxOpen: true,

      bufferSize: 10,
      keyboardOpen: true,
      setupOpen: false,
      currentStaff: Page.STAVES[0],
      currentGenerator: Page.GENERATORS[0],
      stats: new NoteStats(),
    };

    this.state.notes = this.newNoteList();

    if (navigator.requestMIDIAccess) {
      navigator.requestMIDIAccess().then((midi) => this.setState({midi: midi}));
    }
  }

  componentDidMount() {
    this.state.notes.fillBuffer(this.state.bufferSize);
    this.enterWaitMode();
  }

  componentDidUpdate(prevProps, prevState) {
    // transitioning to new staff or generator
    if (prevState.currentStaff != this.state.currentStaff ||
        prevState.currentGenerator != this.state.currentGenerator)
    {
      let notes = this.newNoteList();
      notes.fillBuffer(this.state.bufferSize);

      this.setState({
        notes: notes
      });
    }
  }

  newNoteList() {
    return new NoteList([], {
      generator: this.state.currentGenerator.create.call(this, this.state.currentStaff),
    });
  }

  midiInputs() {
    if (!this.state.midi) return;
    return [...this.state.midi.inputs.values()];
  }

  // called when held notes reaches 0
  checkForMiss() {
    N.event("sight_reading", "note", "miss");

    let missed = this.state.notes.currentColumn()
      .filter((n) => !this.state.heldNotes[n]);

    this.state.stats.missNotes(missed);

    this.setState({
      noteShaking: true,
      heldNotes: {},
      touchedNotes: {},
    });

    setTimeout(() => this.setState({noteShaking: false}), 500);
    return true;
  }

  // called on every noteOn
  checkForHit() {
    let touched = Object.keys(this.state.touchedNotes);
    if (this.state.notes.matchesHead(touched)) {
      N.event("sight_reading", "note", "hit");

      this.state.notes.shift();
      this.state.notes.pushRandom();
      this.state.stats.hitNotes(touched);

      this.setState({
        notes: this.state.notes,
        noteShaking: false,
        heldNotes: {},
        touchedNotes: {},
      });

      this.state.slider.add(this.state.noteWidth);

      return true;
    } else {
      return false;
    }
  }

  pickInput(idx) {
    let input = this.midiInputs()[idx]
    if (!input) { return; }
    console.log(`Binding to: ${input.name}`)
    input.onmidimessage = this.onMidiMessage.bind(this);
    this.setState({currentInput: input});
  }

  pressNote(note) {
    this.state.heldNotes[note] = true;
    this.state.touchedNotes[note] = true;

    if (!this.checkForHit()) {
      this.forceUpdate();
    }
  }

  releaseNote(note) {
    // note might no longer be considered held if we just moved to next note
    if (this.state.heldNotes[note]) {
      delete this.state.heldNotes[note];
      if (Object.keys(this.state.heldNotes).length == 0) {
        this.checkForMiss();
      }
    }
  }

  onMidiMessage(message) {
    let [raw, pitch, velocity] = message.data;

    let cmd = raw >> 4,
      channel = raw & 0xf,
      type = raw & 0xf0;

    let n = noteName(pitch)

    if (NOTE_EVENTS[type] == "noteOn") {
      if (velocity == 0) {
        this.releaseNote(n);
      } else {
        this.pressNote(n);
      }
    }

    if (NOTE_EVENTS[type] == "noteOff") {
      this.releaseNote(n);
    }
  }

  render() {
    let setupToggleButton, statsLightbox, introLightbox;

    if (!this.state.setupOpen) {
      setupToggleButton = <button
        onClick={this.toggleSetup.bind(this)}
        className="setup_toggle">
        Settings
      </button>;
    }

    if (this.state.statsLightboxOpen) {
      statsLightbox = <StatsLightbox
        close={function() { this.setState({statsLightboxOpen: false}); }.bind(this)}
        stats={this.state.stats} />;
    }

    if (this.state.introLightboxOpen) {
      introLightbox = <IntroLightbox
        midi={this.state.midi}
        close={(opts) => {
          this.setState({introLightboxOpen: false})
          if (opts.input != null) {
            this.pickInput(this.input);
          }
        }} />;
    }

    return <div
      className={classNames("page_container", {
        keyboard_open: this.state.keyboardOpen,
        setup_open: this.state.setupOpen,
        scroll_mode: this.state.mode == "scroll",
        wait_mode: this.state.mode == "wait",
    })}>
      {this.renderWorkspace()}
      {this.renderKeyboard()}
      {this.renderSetup()}

      <a className="github_link" href="https://github.com/leafo/mursicjs">
        <img src="img/github-icon.svg" alt="GitHub Repository" />
      </a>

      {setupToggleButton}

      <button
        onClick={this.toggleKeyboard.bind(this)}
        className="keyboard_toggle">
        {this.state.keyboardOpen ? "Hide Keyboard" : "Show Keyboard"}
      </button>

      {statsLightbox}
      {introLightbox}
    </div>;
  }

  renderSetup() {
    if (!this.state.setupOpen) {
      return;
    }

    return <SettingsPanel
      close={this.toggleSetup.bind(this)}
      staves={Page.STAVES}
      generators={Page.GENERATORS}
      currentGenerator={this.state.currentGenerator}
      currentStaff={this.state.currentStaff}
      setGenerator={(g) => this.setState({currentGenerator: g})}
      setStaff={(g) => this.setState({currentStaff: g})}
    />
  }

  renderKeyboard() {
    if (!this.state.keyboardOpen) {
      return;
    }

    let [lower, upper] = this.state.currentStaff.range;

    return <Keyboard
      lower={lower}
      upper={upper}
      heldNotes={this.state.heldNotes}
      onKeyDown={this.pressNote.bind(this)}
      onKeyUp={this.releaseNote.bind(this)} />;
  }

  toggleMode() {
    if (this.state.mode == "wait") {
      this.enterScrollMode();
    } else {
      this.enterWaitMode();
    }
  }

  enterScrollMode() {
    let noteWidth = DEFAULT_NOTE_WIDTH * 2;

    if (this.state.slider) {
      this.state.slider.cancel();
    }

    this.setState({
      mode: "scroll",
      noteWidth: noteWidth,
      slider: new SlideToZero({
        speed: this.state.scrollSpeed,
        loopPhase: noteWidth,
        initialValue: noteWidth * 3,
        onUpdate: this.setOffset.bind(this),
        onLoop: function() {
          this.state.stats.missNotes(this.state.notes.currentColumn());
          this.state.notes.shift();
          this.state.notes.pushRandom();
          this.forceUpdate();
        }.bind(this)
      })
    });
  }

  enterWaitMode() {
    if (this.state.slider) {
      this.state.slider.cancel();
    }

    this.setState({
      mode: "wait",
      noteWidth: DEFAULT_NOTE_WIDTH,
      slider: new SlideToZero({
        speed: DEFAULT_SPEED,
        onUpdate: this.setOffset.bind(this)
      })
    })
  }

  setOffset(value) {
    if (!this.staff) { return; }
    this.staff.setOffset(value);
  }

  toggleSetup() {
    this.setState({
      setupOpen: !this.state.setupOpen
    });
    this.recalcFlex();
  }

  toggleKeyboard() {
    this.setState({keyboardOpen: !this.state.keyboardOpen});
    this.recalcFlex();
  }

  recalcFlex() {
    this.refs.workspace.style.height = "0px";
    this.refs.workspace.offsetHeight;
    this.refs.workspace.style.height = "auto";
  }

  renderWorkspace() {
    if (this.state.stats.streak) {
      var streak = <div className="stat_container">
        <div className="value">{this.state.stats.streak}</div>
        <div className="label">streak</div>
      </div>;
    }

    let header = <div className="header">
      <div className="stats" onClick={function() {
        this.setState({statsLightboxOpen: true});
      }.bind(this)}>
        {streak}
        <div className="stat_container">
          <div className="value">{this.state.stats.hits}</div>
          <div className="label">hits</div>
        </div>

        <div className="stat_container">
          <div className="value">{this.state.stats.misses}</div>
          <div className="label">misses</div>
        </div>
      </div>
      <h1>Sight reading trainer</h1>
    </div>;

    let debug = <div className="debug">
      <pre>
        held: {JSON.stringify(this.state.heldNotes)}
        {" "}
        pressed: {JSON.stringify(this.state.touchedNotes)}
      </pre>
    </div>;


    let modeToggle = <div className="tool">
      <span className="speed_picker">
        <span className="speed_value">{ this.state.scrollSpeed }</span>
        <input type="range"
          min="50"
          max="300"
          disabled={this.state.mode == "scroll"}
          value={this.state.scrollSpeed}
          onChange={(e) => this.setState({scrollSpeed: e.target.value})} />
      </span>

      <span className="label">Mode</span>
      <div
        onClick={this.toggleMode.bind(this)}
        className={classNames("toggle_switch", {
          first: this.state.mode == "wait",
          second: this.state.mode == "scroll",
        })}>
        <span className="toggle_option">Wait</span>
        <span className="toggle_option">Scroll</span>
      </div>
    </div>

    let staff = this.state.currentStaff && this.state.currentStaff.render.call(this);

    return <div ref="workspace" className="workspace">
      <div className="workspace_wrapper">
        {header}
        <div className="staff_wrapper">
          {staff}
        </div>
        <div className="toolbar">
          <div className="left_tools">
          </div>
          {modeToggle}
        </div>
      </div>
    </div>;
  }

}
