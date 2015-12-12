
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
    }
  ]

  constructor(props) {
    super(props);

    this.state = {
      midi: null,
      hits: 0,
      misses: 0,
      noteShaking: false,
      heldNotes: {},
      touchedNotes: {},

      noteWidth: DEFAULT_NOTE_WIDTH,

      bufferSize: 10,
      keyboardOpen: true,
      setupOpen: false,
      currentStaff: Page.STAVES[0],
      currentGenerator: Page.GENERATORS[0],
      noteStats: {},
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

    let stats = this.state.noteStats;
    this.state.notes.currentColumn().map(function(note) {
      if (this.state.heldNotes[note]) {
        return;
      }

      note = normalizeNote(note);
      stats[note] = stats[note] || {}
      stats[note].misses = (stats[note].misses || 0) + 1;
    }.bind(this));

    this.setState({
      misses: this.state.misses + 1,
      streak: 0,
      noteShaking: true,
      heldNotes: {},
      touchedNotes: {},
      noteStats: stats,
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

      let stats = this.state.noteStats;
      touched.map(function(note) {
        note = normalizeNote(note);
        stats[note] = stats[note] || {}
        stats[note].hits = (stats[note].hits || 0) + 1;
      });

      this.setState({
        notes: this.state.notes,
        hits: this.state.hits + 1,
        streak: (this.state.hits || 0) + 1,
        noteShaking: false,
        heldNotes: {},
        touchedNotes: {},
        noteStats: stats,
      });

      this.state.slider.add(this.state.noteWidth);

      return true;
    } else {
      return false;
    }
  }

  pickInput(e) {
    e.preventDefault();
    let idx = this.refs.inputPicker.value;
    idx = parseInt(idx, 10);
    let input = this.midiInputs()[idx]

    if (!input) {
      return;
    }

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
      this.pressNote(n);
    }

    if (NOTE_EVENTS[type] == "noteOff") {
      this.releaseNote(n);
    }
  }

  render() {
    let setupToggleButton;
    if (!this.state.setupOpen) {
      setupToggleButton = <button
        onClick={this.toggleSetup.bind(this)}
        className="setup_toggle">
        Settings
      </button>;
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
    </div>;
  }

  renderSetup() {
    if (!this.state.setupOpen) {
      return;
    }

    let staves = Page.STAVES.map(function(staffConfig) {
      return <div
        key={staffConfig.name}
        onClick={function(e) {
          e.preventDefault();
          this.setState({ currentStaff: staffConfig });
        }.bind(this)}
        className={classNames("toggle_option", {
          active: this.state.currentStaff == staffConfig
        })}>
        {staffConfig.name}</div>;
    }.bind(this));

    
    let generators = Page.GENERATORS.map(function (generator) {
      if (generator.debug) {
        return null;
      }

      return <div
        key={generator.name}
        onClick={function(e) {
          e.preventDefault();
          this.setState({ currentGenerator: generator });
        }.bind(this)}
        className={classNames("toggle_option", {
          active: this.state.currentGenerator == generator
        })}>{generator.name}</div>;
    }.bind(this));

    return <div className="setup_panel">
      <div className="setup_header">
        <button
          onClick={this.toggleSetup.bind(this)}>
          Close</button>
        <h3>Settings</h3>
      </div>

      <div className="settings_group">
        <h4>Staff</h4>
        {staves}
      </div>

      <div className="settings_group">
        <h4>Generators</h4>
        {generators}
      </div>

    </div>;
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
        speed: 100,
        loopPhase: noteWidth,
        initialValue: noteWidth * 3,
        onUpdate: this.setOffset.bind(this),
        onLoop: function() {
          this.state.notes.shift();
          this.state.notes.pushRandom();
          this.setState({ // also updates notes
            misses: this.state.misses + 1,
            streak: 0,
          })
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
    if (this.state.midi) {
      window.current_midi = this.state.midi;

      var inputSelect = <div className="input_picker">
        <select
          ref="inputPicker">
          {
            this.midiInputs().map((input, i) =>
              <option value={i} key={i}>{input.name}</option>)
          }
        </select>
        {" "}
        <button onClick={this.pickInput.bind(this)}>Connect</button>
        {this.state.currentInput ? <strong> Connected</strong> : null}
      </div>
    }

    if (this.state.streak) {
      var streak = <div className="stat_container">
        <div className="value">{this.state.hits}</div>
        <div className="label">streak</div>
      </div>;
    }

    let header = <div className="header">
      <div className="stats">
        {streak}
        <div className="stat_container">
          <div className="value">{this.state.hits}</div>
          <div className="label">hits</div>
        </div>

        <div className="stat_container">
          <div className="value">{this.state.misses}</div>
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
            {inputSelect}
          </div>
          {modeToggle}
        </div>
        <pre>{JSON.stringify(this.state.noteStats)}</pre>
      </div>
    </div>;
  }

}
